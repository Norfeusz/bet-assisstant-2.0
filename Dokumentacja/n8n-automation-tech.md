# System Automatyzacji n8n - Dokumentacja Techniczna

**Data:** 24 lutego 2026  
**Wersja:** 2.0  
**Status:** Production Ready (Render Deployment)

---

## 📋 Spis treści

1. [Architektura systemu](#architektura-systemu)
2. [Komponenty](#komponenty)
3. [Flow danych](#flow-danych)
4. [Implementacja endpoints](#implementacja-endpoints)
5. [Bezpieczeństwo](#bezpieczeństwo)
6. [Wydajność i optymalizacja](#wydajność-i-optymalizacja)
7. [Deployment](#deployment)

---

## 🏗️ Architektura systemu

### Diagram wysokopoziomowy (Render Deployment)

```
┌──────────────────────────────────────────────────────────┐
│              n8n Server (localhost:5678)                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐         │
│  │  Workflow  │  │  Workflow  │  │  Workflow  │   ...   │
│  │   Daily    │  │  Update    │  │  Backup    │         │
│  │  Import    │  │  Results   │  │  Database  │         │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘         │
└────────┼───────────────┼───────────────┼─────────────────┘
         │               │               │
         │   HTTPS POST  │               │
         │   +API Key    │               │
         ▼               ▼               ▼
┌──────────────────────────────────────────────────────────┐
│     Render Web Service (bet-assistant-backend)            │
│           https://bet-assistant-backend.onrender.com      │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │              PM2 Process Manager                   │  │
│  │                                                    │  │
│  │  ┌──────────────────┐    ┌───────────────────┐   │  │
│  │  │ backend-server   │    │ background-worker │   │  │
│  │  │   (port 3000)    │    │  (polling loop)   │   │  │
│  │  └────────┬─────────┘    └─────────┬─────────┘   │  │
│  └───────────┼───────────────────────┼──────────────┘  │
│              │                       │                   │
│              │                       │ 5 min polling     │
│              ▼                       ▼                   │
│  ┌────────────────────────────────────────────────────┐  │
│  │        Middleware: webhookAuth                     │  │
│  │        - Sprawdza x-n8n-api-key                   │  │
│  │        - Porównuje z N8N_WEBHOOK_KEY z .env       │  │
│  └────────────┬───────────────────────────────────────┘  │
│               ▼                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │     Route: /api/webhooks/n8n/import-matches       │  │
│  │     (async mode - tworzy job w bazie)             │  │
│  └────────────┬───────────────────────────────────────┘  │
│               │                                           │
│               ▼                                           │
│         Creates Job Record ────┐                         │
│                                │                          │
│                                ▼                          │
│         ┌──────────────────────────────────────────────┐ │
│         │         import_jobs Table                    │ │
│         │  - id, status, leagues, date_from/to        │ │
│         │  - progress, imported_matches               │ │
│         │  - rate_limit_reset_at                      │ │
│         └──────────────┬───────────────────────────────┘ │
│                        │                                  │
│                        │ Worker polls (every 5 min)       │
│                        │                                  │
│                        ▼                                  │
│         ┌──────────────────────────────────────────────┐ │
│         │   Background Worker Processing               │ │
│         │   - Finds jobs (priority: rate_limited > new)│ │
│         │   - Single job at a time (lock)             │ │
│         │   - Auto-retry after 15 min on rate limit   │ │
│         │   - Auto-resume after completion            │ │
│         └──────────────┬───────────────────────────────┘ │
│                        │                                  │
│                        ▼                                  │
│  ┌────────────────────────────────────────────────────┐  │
│  │         Services Layer                             │  │
│  │  - DataImporter (with autoRetry support)          │  │
│  │  - ApiFootballClient                              │  │
│  │  - LeagueSelector                                 │  │
│  │  - DatabaseBackup                                 │  │
│  └────────────┬───────────────────────────────────────┘  │
│               ▼                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │         Prisma ORM                                 │  │
│  └────────────┬───────────────────────────────────────┘  │
└───────────────┼──────────────────────────────────────────┘
                ▼
       ┌─────────────────────────────────────┐
       │   Render PostgreSQL (Frankfurt)     │
       │   dpg-d6bplrp5pdvs73eeol5g          │
       │   - SSL required                    │
       │   - 1 GB free tier                  │
       └─────────────────────────────────────┘
```

### Przepływ autoryzacji

```
n8n Request
    │
    ├─ Header: x-n8n-api-key: <key>
    │
    ▼
webhookAuth Middleware
    │
    ├─ Pobiera klucz z req.headers['x-n8n-api-key']
    ├─ Pobiera oczekiwany klucz z process.env.N8N_WEBHOOK_KEY
    │
    ├─ Porównuje
    │
    ├─ ✅ Pasuje → next()
    │
    └─ ❌ Nie pasuje → 401 Unauthorized
```

---

## 🔧 Komponenty

### 1. Webhook Router (`server/routes/n8n-webhooks.ts`)

**Odpowiedzialność:** Obsługa wszystkich webhooków z n8n

**Struktura:**

```typescript
import express from "express";
import { PrismaClient } from "@prisma/client";
import { DataImporter } from "../src/services/data-importer.js";
import { ApiFootballClient } from "../src/services/api-football-client.js";
import { LeagueSelector } from "../src/services/league-selector.js";

const router = express.Router();
const prisma = new PrismaClient();

// Middleware autoryzacji (WSZYSTKIE endpointy)
const webhookAuth = (req, res, next) => {
  const apiKey =
    req.headers["x-n8n-api-key"] ||
    req.headers["authorization"]?.replace("Bearer ", "");
  const validKey = process.env.N8N_WEBHOOK_KEY;

  if (!validKey) {
    return res.status(500).json({ error: "Webhook not configured" });
  }

  if (!apiKey || apiKey !== validKey) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
};

router.use(webhookAuth);

// ... endpoints
```

**Endpointy:**

1. `POST /webhooks/n8n/import-matches` - Import nowych meczów (async job creation)
2. `POST /webhooks/n8n/update-results` - Aktualizacja wyników
3. `POST /webhooks/n8n/backup-database` - Backup bazy
4. `GET /webhooks/n8n/health` - Health check
5. `GET /webhooks/n8n/status` - Status systemu (statystyki)
6. `GET /webhooks/n8n/import-jobs/status` - Status pending jobs (dla manual wake)

### 2. Import Service

**Wykorzystane klasy:**

```typescript
// Inicjalizacja (w każdym endpoint)
const apiClient = new ApiFootballClient(process.env.API_FOOTBALL_KEY!);
const leagueSelector = new LeagueSelector(apiClient);
const importer = new DataImporter(apiClient, leagueSelector);

// Użycie
await importer.importDateRange(startDate, endDate, false, false);
// lub
await importer.updateResults(startDate, endDate, false);

// Statystyki
const progress = importer.getProgress();
const rateLimitInfo = importer.getRateLimitInfo();
```

**Różnice: Async vs Synchronous Mode:**

| Aspekt               | Async Mode (default)         | Synchronous Mode (async=false) |
| -------------------- | ---------------------------- | ------------------------------ |
| Webhook response     | Natychmiastowa (job created) | Po zakończeniu importu         |
| Timeout              | ~1s (tylko zapis do DB)      | 5-10 min (pełny import)        |
| Worker               | Background worker procesuje  | Webhook procesuje bezpośrednio |
| Kolejka              | Tak - import_jobs table      | Nie - direct execution         |
| Resume po rate limit | Tak - auto retry po 15 min   | Nie - kończy z błędem          |
| Status tracking      | `/api/import-jobs/{jobId}`   | W response webhookaola         |
| n8n timeout risk     | Brak (szybka odpowiedź)      | Wysokie (długi import)         |
| Zalecenie            | **PRODUKCJA**                | Tylko testy/debug              |

**UWAGA:** W produkcji **zawsze używaj async=true** (domyślnie). Synchroniczny mode nie radzi sobie z rate limitami i może przekroczyć timeout n8n (180s).

### 3. Background Import Worker

**Klasa:** `BackgroundImportWorker` (`server/background-import-worker.ts`)

**Architektura:**

- Uruchamia się jako osobny proces (via PM2)
- Polling bazy co 5 minut
- Procesuje jedno zadanie naraz (lock mechanism)
- Auto-resume po zakończeniu (setImmediate)
- Prioritet: rate_limited jobs > new jobs

**Kod inicjalizacji:**

```typescript
// Startup
const worker = new BackgroundImportWorker();
worker.start();

// Polling loop
setInterval(
  () => {
    worker.checkAndProcessJobs();
  },
  5 * 60 * 1000,
); // Co 5 minut
```

**Logika selekcji zadań (SQL):**

```sql
-- Priority 1: Rate limited jobs ready to resume
SELECT * FROM import_jobs
WHERE status = 'rate_limited'
  AND rate_limit_reset_at < NOW()
ORDER BY created_at ASC
LIMIT 1

-- Priority 2: New jobs in queue
SELECT * FROM import_jobs
WHERE status IN ('in_queue', 'pending')
ORDER BY created_at ASC
LIMIT 1
```

**Single Job Lock:**

```typescript
private processingJobId: number | null = null

async checkAndProcessJobs() {
  if (this.processingJobId) {
    console.log('Already processing job, skipping...')
    return  // Jeden job na raz
  }

  const job = await this.findJobToProcess()
  if (!job) return

  this.processingJobId = job.id
  try {
    await this.processJob(job)
  } finally {
    this.processingJobId = null
    // Natychmiastowa kontrola następnego zadania
    setImmediate(() => this.checkAndProcessJobs())
  }
}
```

**Rate Limit Handling:**

```typescript
// Gdy DataImporter zwróci rate limit:
await prisma.import_jobs.update({
  where: { id: job.id },
  data: {
    status: "rate_limited",
    rate_limit_reset_at: new Date(Date.now() + 15 * 60 * 1000),
  },
});

// Worker automatycznie znajdzie job po 15 minutach
// i wznowi od miejsca przerwania
```

**PM2 Configuration:**

```javascript
// ecosystem.config.cjs
{
  name: 'background-worker',
  script: 'npx',
  args: 'tsx server/background-import-worker.ts',
  instances: 1,
  autorestart: true,
  max_restarts: 10,
  min_uptime: '10s',
  restart_delay: 5000
}
```

**Monitoring:**

```bash
# Na Render - zobacz logi workera
pm2 logs background-worker

# Lokalnie
npm run worker
```

### 4. Backup Service

**Klasa:** `DatabaseBackup` (`server/scripts/backup-database.ts`)

```typescript
const backup = new DatabaseBackup();
await backup.createBackup({
  pushToGit: false, // n8n zarządza Git
  skipIfNoChanges: true,
});
```

**Mechanizm:**

1. Używa `pg_dump` do eksportu bazy
2. Tworzy max 10 backupów (nadpisuje najstarszy)
3. Zapisuje w `backups/database-backup-{1-10}.sql`
4. Opcjonalnie commituje do Git (ale w n8n wyłączone)

### 5. Monitoring

**Health Check endpoint:**

```typescript
GET /api/webhooks/n8n/health

// Sprawdza:
- Połączenie z bazą (prisma.$queryRaw)
- Obecność API_FOOTBALL_KEY

// Odpowiedź:
{
  "success": true,
  "status": "healthy",
  "checks": {
    "database": "ok",
    "apiFootballKey": "configured"
  }
}
```

**Status endpoint:**

```typescript
GET /api/webhooks/n8n/status

// Pobiera:
- Liczba meczów w bazie
- Liczba enabled lig
- Ostatnie 5 importów z 24h

// Odpowiedź:
{
  "stats": {
    "totalMatches": 5284,
    "enabledLeagues": 45,
    "recentImports": [...]
  }
}
```

---

## 📊 Flow danych

### Codzienny import z async job queue (Production Flow)

```
1. n8n: Schedule Trigger (cron: 0 4 * * *)
   │  Timezone: America/New_York
   │  = 10:00 czasu polskiego (Europe/Warsaw)
   │
2. n8n: HTTP Request → POST /api/webhooks/n8n/import-matches
   │  URL: https://bet-assistant-backend.onrender.com/api/webhooks/n8n/import-matches
   │  Headers: x-n8n-api-key: <key>
   │  Body: { daysAhead: 1, async: true }
   │  Timeout: 180000ms (3 min - dla cold start Render)
   │  Retry: 2 × 30s delay
   │
3. Render: Cold start (jeśli spał >15 min)
   │  Backend budzi się: ~20-40 sekund
   │
4. Backend: webhookAuth middleware
   │  ✓ Sprawdza x-n8n-api-key
   │
5. Backend: /import-matches handler (ASYNC MODE)
   │
   ├─ Oblicza daty: today → today+1
   │
   ├─ Pobiera ligi (wszystkie enabled z leagues.json)
   │
   ├─ Tworzy rekord w import_jobs:
   │  {
   │    leagues: [39, 140, 78, ...],  // 159 lig
   │    date_from: new Date("2026-02-25"),
   │    date_to: new Date("2026-02-25"),
   │    job_type: 'new_matches',
   │    status: 'in_queue',
   │    total_matches: 0,
   │    imported_matches: 0,
   │    created_at: NOW()
   │  }
   │
   └─ Zwraca NATYCHMIAST (< 1 sekunda):
      {
        success: true,
        async: true,
        jobId: 345,
        message: "Import job created successfully...",
        checkStatusUrl: "/api/import-jobs/345"
      }
      │
6. n8n: Otrzymuje response (jobId: 345)
   │  Workflow zakończony sukcesem
   │
7. Background Worker: Polling loop (co 5 min)
   │
   ├─ SQL: SELECT * FROM import_jobs
   │       WHERE status = 'in_queue'
   │       ORDER BY created_at ASC LIMIT 1
   │
   ├─ Znaleziono: Job #345
   │
   ├─ Lock: processingJobId = 345
   │
   ├─ UPDATE import_jobs SET status='running', started_at=NOW()
   │
   ├─ Inicjalizuje DataImporter
   │
   ├─ await importer.importDateRange(startDate, endDate, true, true)
   │  │  autoRetry = true, saveProgress = true
   │  │
   │  ├─ Dla każdej ligi:
   │  │  ├─ Pobiera mecze z API Football
   │  │  ├─ Zapisuje do matches table
   │  │  ├─ UPDATE import_jobs SET imported_matches++
   │  │  └─ Sprawdza rate limit
   │  │
   │  ├─ Rate limit hit (300/300 requests):
   │  │  ├─ UPDATE import_jobs SET
   │  │  │    status='rate_limited',
   │  │  │    rate_limit_reset_at=NOW() + 15 min
   │  │  └─ RETURN (kończy processing)
   │  │
   │  └─ Worker unlock: processingJobId = null
   │
8. Worker: Czeka 15 minut (polling loop continue)
   │
9. Worker: Po 15 minutach (rate_limit_reset_at < NOW())
   │
   ├─ SQL: SELECT * FROM import_jobs
   │       WHERE status='rate_limited'
   │         AND rate_limit_reset_at < NOW()
   │       ORDER BY created_at ASC LIMIT 1
   │
   ├─ Znaleziono: Job #345 (ready to resume)
   │
   ├─ Lock: processingJobId = 345
   │
   ├─ UPDATE import_jobs SET status='running'
   │
   ├─ DataImporter wznawia od miejsca przerwania
   │  (progress tracking w import_jobs.progress)
   │
   ├─ Dokończenie pozostałych lig
   │
   ├─ UPDATE import_jobs SET
   │      status='completed',
   │      completed_at=NOW()
   │
   └─ setImmediate(() => checkAndProcessJobs())
      Natychmiast sprawdza następne zadanie
```

**Kluczowe różnice vs stary flow:**

- ✅ Webhook zwraca natychmiast (brak timeoutów)
- ✅ Auto-retry na rate limit (15 min wait)
- ✅ Progress tracking w bazie
- ✅ Worker niezależny od n8n
- ✅ Kolejka FIFO (wiele importów możliwych)

### Update results flow

```
1. n8n: Cron trigger (codziennie 0:01)
   │
2. n8n: Oblicza zakres: yesterday → yesterday
   │
3. n8n: POST /api/webhooks/n8n/update-results
   │  Body: { daysBack: 1 }
   │
4. Backend: Auto-detect lig z meczami w zakresie
   │  SELECT DISTINCT leagues WHERE matches.date IN range
   │
5. Backend: await importer.updateResults(startDate, endDate)
   │  - Pobiera aktualne wyniki z API Football
   │  - Aktualizuje is_finished, score, etc.
   │
6. Backend: Zwraca stats
   │
7. n8n: IF - czy dużo aktualizacji? (>= 10)
   │  TRUE → Wyślijpowiadomienie
   │  FALSE → Cicho (log only)
```

---

## 🔒 Bezpieczeństwo

### 1. Autoryzacja API Key

**Generowanie:**

```powershell
# Windows PowerShell
$bytes = New-Object byte[] 32
[Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

**Przechowywanie:**

- Backend: `.env` (N8N_WEBHOOK_KEY)
- n8n: Environment Variables
- **NIGDY** w Git (`.env` w .gitignore)

**Walidacja:**

```typescript
const apiKey =
  req.headers["x-n8n-api-key"] ||
  req.headers["authorization"]?.replace("Bearer ", "");
const validKey = process.env.N8N_WEBHOOK_KEY;

if (!apiKey || apiKey !== validKey) {
  return res.status(401).json({ error: "Unauthorized" });
}
```

### 2. Rate Limiting

**Podejście:** n8n queue mode (wbudowane)

**Konfiguracja w n8n:**

```yaml
# n8n settings
N8N_CONCURRENCY_PRODUCTION_LIMIT: 1 # Max 1 workflow jednocześnie
N8N_EXECUTIONS_PROCESS: main # Nie spawn new process
```

**Monitorowanie:**

- Każdy endpoint zwraca `rateLimit` w response
- Monitoring workflow sprawdza co 15 min

### 3. HTTPS w produkcji

**Wymagania:**

- n8n za reverse proxy (nginx/Caddy)
- SSL certificate (Let's Encrypt)
- Backend również za SSL

**Nginx example:**

```nginx
server {
  listen 443 ssl;
  server_name n8n.yourdomain.com;

  ssl_certificate /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;

  location / {
    proxy_pass http://localhost:5678;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

---

## ⚡ Wydajność i optymalizacja

### 1. Timeout configuration

**Zalecane timeouty:**

- Import matches: 300s (5 min)
- Update results: 180s (3 min)
- Backup database: 120s (2 min)
- Health/status: 10s

**W n8n:**

```
HTTP Request node → Options → Timeout (ms)
```

### 2. Limit meczów/lig

**Optymalne wartości (FREE API plan: 300 req/day):**

- Wszystkie ligi enabled (159 lig w produkcji)
- Zakres dat: 1 dzień (daysAhead: 1)
- Worker auto-retry po rate limit (15 min wait)
- Import dzieli się na chunki po 300 requests

**PREMIUM plan (7500 req/day):**

- Wszystkie ligi bez limitów
- Zakres dat: 7-14 dni
- Aktualizacje: co 2h
- daysBack: 2-3
- Brak czekania na rate limit

### 3. Pamięć i resources

**Backend:**

```json
// package.json
"scripts": {
  "start": "node --max-old-space-size=2048 league-config-server.ts"
}
```

**n8n (Docker):**

```yaml
services:
  n8n:
    image: n8nio/n8n
    environment:
      - N8N_PAYLOAD_SIZE_MAX=128 # MB
    deploy:
      resources:
        limits:
          memory: 1G
```

### 4. Database indexy

**Sprawdź indeksy:**

```sql
-- Jeśli wolne queries
CREATE INDEX idx_matches_date ON matches(match_date);
CREATE INDEX idx_matches_league ON matches(league, country);
CREATE INDEX idx_matches_finished ON matches(is_finished);
```

---

## 🚀 Deployment

### Development (Lokalnie)

```bash
# Backend
cd server
npm run dev

# Background Worker (osobny terminal)
npm run worker

# n8n
docker run -p 5678:5678 -v n8n_data:/home/node/.n8n n8nio/n8n

# Lub npm
npm install -g n8n
n8n start
```

### Production - Render (Current Setup)

**Architektura:**

- **Web Service:** Backend + Worker w jednym (PM2)
- **PostgreSQL:** Zewnętrzna baza (Render PostgreSQL)
- **Free Tier:** $0/month (500h/month uptime)

**1. Render Web Service Configuration:**

```yaml
# Render Dashboard Settings
Name: bet-assistant-backend
Environment: Node
Region: Frankfurt (EU Central)
Branch: main
Build Command: npm install
Start Command: npm run start:all   # PM2 multi-process

# Environment Variables
DATABASE_URL=postgresql://betassistant:***@dpg-***.frankfurt-postgres.render.com/betassistant
N8N_WEBHOOK_KEY=<strong-key>
API_FOOTBALL_KEY=<your-key>
NODE_ENV=production
PORT=3000
```

**2. PM2 Multi-Process Setup:**

```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "backend-server",
      script: "npx",
      args: "tsx server/league-config-server.ts",
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || 3000,
      },
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
    },
    {
      name: "background-worker",
      script: "npx",
      args: "tsx server/background-import-worker.ts",
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};
```

```json
// package.json
{
  "scripts": {
    "start:all": "pm2-runtime start ecosystem.config.cjs",
    "worker": "tsx server/background-import-worker.ts"
  },
  "dependencies": {
    "pm2": "^5.4.3"
  }
}
```

**3. Render PostgreSQL Configuration:**

```yaml
Name: betassistant
Plan: Free (1 GB storage, 97h/month active)
Region: Frankfurt
Version: PostgreSQL 16

# Connection String (internal)
postgresql://betassistant:***@dpg-***.frankfurt-postgres.render.com/betassistant

# SSL Required: Yes
ssl: { rejectUnauthorized: false }
```

**4. Git Deployment:**

```bash
# Commit changes
git add .
git commit -m "Update backend configuration"

# Push to main (auto-deploy on Render)
git push origin main

# Render auto-deploys w ~2-3 minuty
# Zobacz logi: https://dashboard.render.com
```

**5. Render Free Tier - Cold Start:**

⚠️ **UWAGA:** Free tier usypia po 15 minutach braku aktywności

**Cold Start Behavior:**

- Pierwsze żądanie: 20-40 sekund (backend budzi się)
- Kolejne żądania: < 200ms (normalnie)

**Rozwiązanie - Keep-Alive Workflow:**

```
n8n Schedule Trigger: */10 * * * * (co 10 min)
HTTP Request: GET /api/webhooks/n8n/health
→ Backend nigdy nie śpi
```

**6. Monitoring Logs:**

```bash
# Na Render Dashboard → Logs tab
# Lub przez CLI:
curl https://bet-assistant-backend.onrender.com/api/webhooks/n8n/status \
  -H "x-n8n-api-key: <key>"

# PM2 logs (widoczne w Render Logs):
[backend-server] Server started on port 3000
[background-worker] Background Import Worker started
[background-worker] Checking for jobs every 5 minutes...
```

### Production - Docker (Alternative)

**1. n8n (Docker Compose):**

```yaml
version: "3.8"

services:
  n8n:
    image: n8nio/n8n:latest
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
      - N8N_HOST=${N8N_HOST}
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=https://${N8N_HOST}/
      - GENERIC_TIMEZONE=Europe/Warsaw
      - BET_ASSISTANT_API_URL=${BACKEND_URL}
      - BET_ASSISTANT_WEBHOOK_KEY=${WEBHOOK_KEY}
    volumes:
      - n8n_data:/home/node/.n8n

volumes:
  n8n_data:
```

**3. Environment Variables:**

Backend (`.env`):

```env
N8N_WEBHOOK_KEY=<same-as-n8n>
DATABASE_URL=postgresql://betassistant:***@dpg-***.frankfurt-postgres.render.com/betassistant
API_FOOTBALL_KEY=<your-key>
NODE_ENV=production
```

n8n (UI Settings):

```
BET_ASSISTANT_API_URL=https://bet-assistant-backend.onrender.com
BET_ASSISTANT_WEBHOOK_KEY=<same-as-backend>
NOTIFICATION_EMAIL=alerts@yourcompany.com
```

**4. Timezone Configuration (KRYTYCZNE!):**

⚠️ **PROBLEM:** n8n Schedule Trigger domyślnie używa timezone serwera (często America/New_York)

**Przykład:**

```
Cron: 0 4 * * *  (04:00)
Timezone n8n: America/New_York
= 10:00 czasu polskiego (Europe/Warsaw) ✅
```

**Kalkulacja:**

- America/New_York to UTC-5 (zima) lub UTC-4 (lato)
- Europe/Warsaw to UTC+1 (zima) lub UTC+2 (lato)
- Różnica: 6 godzin (zima) lub 5-6 godzin (lato)

**Rozwiązanie 1 - Offset w cron:**

```
Cel: Daily import o 10:00 polskiego czasu
Timezone n8n: America/New_York

Zima: 10:00 Warsaw = 04:00 New York → Cron: 0 4 * * *
Lato: 10:00 Warsaw = 04:00 New York → Cron: 0 4 * * * (to samo!)
```

**Rozwiązanie 2 - Zmiana timezone n8n (Docker):**

```yaml
# docker-compose.yml
services:
  n8n:
    environment:
      - GENERIC_TIMEZONE=Europe/Warsaw

# Wtedy cron 0 10 * * * = 10:00 polskiego czasu
```

**Testowanie:**

```
# Test schedule (13:15 polskiego)
Timezone: America/New_York
Cron: 15 7 * * *  (07:15 NY = 13:15 Warsaw)

# Produkcja (10:00 polskiego)
Cron: 0 4 * * *  (04:00 NY = 10:00 Warsaw)
```

---

## 📝 Changelog systemu

### v2.0 (24 lutego 2026) - PRODUCTION DEPLOYMENT

- ✅ **Async Job Queue Implementation**
  - Webhook tworzy job w bazie (natychmiastowa odpowiedź)
  - Background worker procesuje kolejkę co 5 min
  - Auto-retry po rate limit (15 min wait)
  - Progress tracking w import_jobs table
- ✅ **Render Deployment (Free Tier)**
  - PM2 multi-process: backend + worker w jednym serwisie
  - PostgreSQL na Render (Frankfurt, SSL required)
  - Migracja wszystkich tabel (28,270 matches)
  - Cold start handling (180s timeout + retry)
- ✅ **Rate Limit Auto-Resume**
  - Worker automatycznie wznawia po 15 minutach
  - Priority queue: rate_limited > in_queue
  - Single job concurrency (lock mechanism)
  - FIFO ordering within priority
- ✅ **Timezone Configuration**
  - Dokumentacja offset America/New_York → Europe/Warsaw
  - Schedule trigger: `0 4 * * *` = 10:00 polskiego
  - Test trigger: `15 7 * * *` = 13:15 polskiego
- ⚠️ **Breaking Changes**
  - Domyślnie `async=true` (async job queue)
  - Synchronous mode tylko dla testów (`async=false`)
  - Webhook nie czeka na zakończenie importu

### v1.0 (19 lutego 2026)

- ✅ Inicjalna implementacja n8n webhooks
- ✅ 4 workflows: import, update, backup, monitoring
- ✅ Pełna autoryzacja API key
- ✅ Health checks i alerty
- ✅ Dokumentacja kompletna

### Planned (v2.1)

- ⏳ Keep-Alive workflow (prevent Render sleep)
- ⏳ Job status monitoring endpoint
- ⏳ Email notifications on job completion
- ⏳ Advanced metrics (Prometheus/Grafana)

---

## 🧪 Testing

### Testowanie lokalnie

**1. Test autoryzacji:**

```bash
# Bez klucza - powinna być 401
curl http://localhost:3000/api/webhooks/n8n/health

# Z kluczem - powinna być 200
curl -H "x-n8n-api-key: your-key" \
     http://localhost:3000/api/webhooks/n8n/health
```

**2. Test async import (PRODUKCJA):**

```bash
# Tworzy job w bazie, zwraca natychmiast
curl -X POST \
  -H "x-n8n-api-key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"leagueIds": [39], "daysAhead": 1, "async": true}' \
  http://localhost:3000/api/webhooks/n8n/import-matches

# Response:
# {
#   "success": true,
#   "async": true,
#   "jobId": 346,
#   "message": "Import job created successfully...",
#   "checkStatusUrl": "/api/import-jobs/346"
# }
```

**3. Test synchronous import (DEBUG ONLY):**

```bash
# UWAGA: Czeka na zakończenie, może timeout!
curl -X POST \
  -H "x-n8n-api-key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"leagueIds": [39], "daysAhead": 1, "async": false}' \
  http://localhost:3000/api/webhooks/n8n/import-matches

# Response (po 5-10 min):
# {
#   "success": true,
#   "async": false,
#   "stats": { imported: 150, failed: 0, ... },
#   "rateLimit": { remaining: 250, total: 300 }
# }
```

**4. Sprawdzenie statusu job:**

```bash
# Po otrzymaniu jobId z async import
curl -H "x-n8n-api-key: your-key" \
     http://localhost:3000/api/import-jobs/346

# Response:
# {
#   "id": 346,
#   "status": "running",  # in_queue | running | completed | rate_limited | failed
#   "imported_matches": 85,
#   "total_matches": 150,
#   "progress": {...},
#   "rate_limit_reset_at": null
# }
```

**5. Test na Render (Production):**

```bash
# UWAGA: Pierwsze żądanie może trwać 20-40s (cold start)
curl -X POST \
  -H "x-n8n-api-key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"daysAhead": 1}' \
  https://bet-assistant-backend.onrender.com/api/webhooks/n8n/import-matches

# Sprawdź logi workera na Render Dashboard
```

**6. Test n8n workflow:**

- W n8n UI: Workflow → Execute Workflow
- Sprawdź execution logs
- Verify response w każdym node
- Sprawdź jobId w reponse JSON

### Unit tests (TODO)

```typescript
// tests/webhooks.test.ts
import request from "supertest";
import app from "../server/league-config-server";

describe("n8n Webhooks", () => {
  it("should reject unauthorized requests", async () => {
    const res = await request(app).get("/api/webhooks/n8n/health");
    expect(res.status).toBe(401);
  });

  it("should accept valid API key", async () => {
    const res = await request(app)
      .get("/api/webhooks/n8n/health")
      .set("x-n8n-api-key", process.env.N8N_WEBHOOK_KEY);
    expect(res.status).toBe(200);
  });
});
```

---

## � Troubleshooting

### 1. "The connection was aborted" - Render Cold Start

**Problem:**

```
n8n error: The connection was aborted, perhaps the server is offline
```

**Przyczyna:** Render Free Tier usypia po 15 minutach braku aktywności. Pierwsze żądanie budzi serwis (20-40s).

**Rozwiązanie:**

```yaml
# n8n HTTP Request node
Timeout: 180000 (3 minuty)
Retry On Fail: Yes
Max Retry: 2
Wait Between Retries: 30000 (30s)
```

**Opcjonalnie - Keep-Alive Workflow:**

```
Schedule: */10 * * * * (co 10 minut)
HTTP Request: GET /api/webhooks/n8n/health
→ Backend nigdy nie śpi (zawsze < 200ms response)
```

### 2. "Unauthorized" - API Key Issue

**Problem:**

```json
{ "error": "Unauthorized" }
```

**Diagnoza:**

```bash
# Sprawdź czy klucz jest ustawiony na backendzie
echo $N8N_WEBHOOK_KEY  # Lokalnie (PowerShell)
# Na Render: Environment Variables tab

# Sprawdź header w n8n
{{ $json.headers['x-n8n-api-key'] }}
```

**Rozwiązanie:**

- Backend `.env`: `N8N_WEBHOOK_KEY=abc123`
- n8n workflow: Header `x-n8n-api-key: abc123`
- Upewnij się, że klucze są identyczne!

### 3. Job Queue - Worker nie procesuje zadań

**Problem:**
Worker polling loop działa, ale nie znajduje zadań:

```
[background-worker] No jobs to process
```

**Diagnoza:**

```sql
-- Sprawdź status zadań w bazie
SELECT id, status, created_at, rate_limit_reset_at
FROM import_jobs
WHERE status IN ('in_queue', 'rate_limited')
ORDER BY created_at DESC;

-- Jeśli status='rate_limited' i reset_at w przyszłości:
-- Worker czeka na upływ czasu (normalnie)

-- Jeśli status='in_queue' ale worker nie widzi:
-- Sprawdź DATABASE_URL workera (czy wskazuje na Render?)
```

**Rozwiązanie:**

```bash
# Local worker
# Upewnij się że .env ma DATABASE_URL do Render:
DATABASE_URL=postgresql://betassistant:***@dpg-***.frankfurt-postgres.render.com/betassistant

# Render worker
# Sprawdź Environment Variables na Render Dashboard
```

### 4. Rate Limit - "Too many requests"

**Problem:**

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "rateLimit": { "remaining": 0, "total": 300 }
}
```

**Wyjaśnienie:**

- API Football Free: 300 requests/day
- Worker automatycznie czeka 15 min i wznawia

**Weryfikacja:**

```sql
SELECT id, status, imported_matches, total_matches,
       rate_limit_reset_at
FROM import_jobs
WHERE id = 345;

-- status='rate_limited' → Worker wznowi po upłynięciu rate_limit_reset_at
```

**Rozwiązanie:**

- ✅ **Async mode:** Worker automatycznie wznowi (ZALECANE)
- ❌ **Sync mode:** Zwróci błąd do n8n (NIE UŻYWAĆ w produkcji)

### 5. Timezone - Workflow uruchamia się o złej godzinie

**Problem:**
Cron `0 10 * * *` uruchamia się o 16:00 zamiast 10:00 polskiego czasu.

**Diagnoza:**

```bash
# Sprawdź timezone n8n
# W Docker: GENERIC_TIMEZONE env variable
# W n8n UI: Workflow → Cron → Timezone (widoczne w execution logs)
```

**Rozwiązanie 1 - Offset:**

```
Cel: 10:00 Europe/Warsaw
n8n timezone: America/New_York (UTC-5)
Różnica: +6 godzin

10:00 Warsaw - 6h = 04:00 New York
Cron: 0 4 * * *
```

**Rozwiązanie 2 - Docker env:**

```yaml
services:
  n8n:
    environment:
      - GENERIC_TIMEZONE=Europe/Warsaw
# Wtedy cron 0 10 * * * = 10:00 Warsaw
```

### 6. Prisma "Invalid DateTime" Error

**Problem:**

```
Invalid value for argument date_from: premature end of input
```

**Przyczyna:** Prisma DateTime columns wymagają Date object, nie string

**Rozwiązanie:**

```typescript
// ❌ ZŁE
prisma.import_jobs.create({
  data: {
    date_from: "2026-02-25", // String!
    date_to: "2026-02-25",
  },
});

// ✅ DOBRE
prisma.import_jobs.create({
  data: {
    date_from: new Date("2026-02-25"), // Date object
    date_to: new Date("2026-02-25"),
  },
});
```

### 7. Render PostgreSQL - SSL Connection Error

**Problem:**

```
Error: self signed certificate
```

**Rozwiązanie:**

```typescript
// server/src/services/database-browser.ts (lub inne Pool)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Render wymaga SSL
  },
});
```

---

## �📚 Referencje

**Pliki kluczowe:**

- `server/routes/n8n-webhooks.ts` - Wszystkie endpointy webhooków (async job creation)
- `server/background-import-worker.ts` - Worker procesujący kolejkę zadań
- `server/league-config-server.ts` - Główny serwer Express (import routera)
- `ecosystem.config.cjs` - PM2 configuration (backend + worker)
- `package.json` - Dependencies (PM2, tsx, Prisma)
- `.env` - Konfiguracja (N8N_WEBHOOK_KEY, DATABASE_URL)
- `n8n-workflows/*.json` - 6 workflows (daily import, update results, backup, monitoring, **keep-alive**, manual-wake)
- `n8n-workflows/README.md` - Instrukcja użytkownika (konfiguracja wszystkich workflows)

**Zależności:**

- `server/src/services/data-importer.ts` - Import logic (with autoRetry)
- `server/src/services/api-football-client.ts` - API Football integration
- `server/src/services/database-browser.ts` - PostgreSQL browser (SSL support)
- `server/scripts/backup-database.ts` - Backup logic
- `prisma/schema.prisma` - Database schema (import_jobs table)

**Deployment:**

- Render Web Service - `https://bet-assistant-backend.onrender.com`
- Render PostgreSQL - Frankfurt region, SSL required
- PM2 Logs - Visible in Render Dashboard → Logs tab

**Dokumentacja zewnętrzna:**

- [n8n Docs](https://docs.n8n.io/)
- [API Football](https://www.api-football.com/)
- [Express.js](https://expressjs.com/)
- [Prisma ORM](https://www.prisma.io/)
- [PM2 Process Manager](https://pm2.keymetrics.io/)
- [Render Docs](https://render.com/docs)

---

**Koniec dokumentacji technicznej v2.0**
