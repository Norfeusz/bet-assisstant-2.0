# System Automatyzacji n8n - Dokumentacja Techniczna

**Data:** 19 lutego 2026  
**Wersja:** 1.0  
**Status:** Production Ready

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

### Diagram wysokopoziomowy

```
┌──────────────────────────────────────────────────────────┐
│                        n8n Server                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐         │
│  │  Workflow  │  │  Workflow  │  │  Workflow  │   ...   │
│  │   Daily    │  │  Update    │  │  Backup    │         │
│  │  Import    │  │  Results   │  │  Database  │         │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘         │
└────────┼───────────────┼───────────────┼─────────────────┘
         │               │               │
         │   HTTP POST   │               │
         │   +API Key    │               │
         ▼               ▼               ▼
┌──────────────────────────────────────────────────────────┐
│              Bet Assistant Backend Server                 │
│                    (localhost:3000)                       │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │        Middleware: webhookAuth                     │  │
│  │        - Sprawdza x-n8n-api-key                   │  │
│  │        - Porównuje z N8N_WEBHOOK_KEY z .env       │  │
│  └────────────┬───────────────────────────────────────┘  │
│               ▼                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │          Route: /api/webhooks/n8n/*                │  │
│  │                                                    │  │
│  │  - import-matches    (POST)                       │  │
│  │  - update-results    (POST)                       │  │
│  │  - backup-database   (POST)                       │  │
│  │  - health            (GET)                        │  │
│  │  - status            (GET)                        │  │
│  └────────────┬───────────────────────────────────────┘  │
│               ▼                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │         Services Layer                             │  │
│  │                                                    │  │
│  │  - DataImporter                                   │  │
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
       ┌─────────────────┐
       │   PostgreSQL    │
       │    Database     │
       └─────────────────┘
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
import express from 'express'
import { PrismaClient } from '@prisma/client'
import { DataImporter } from '../src/services/data-importer.js'
import { ApiFootballClient } from '../src/services/api-football-client.js'
import { LeagueSelector } from '../src/services/league-selector.js'

const router = express.Router()
const prisma = new PrismaClient()

// Middleware autoryzacji (WSZYSTKIE endpointy)
const webhookAuth = (req, res, next) => {
  const apiKey = req.headers['x-n8n-api-key'] || 
                 req.headers['authorization']?.replace('Bearer ', '')
  const validKey = process.env.N8N_WEBHOOK_KEY
  
  if (!validKey) {
    return res.status(500).json({ error: 'Webhook not configured' })
  }
  
  if (!apiKey || apiKey !== validKey) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  next()
}

router.use(webhookAuth)

// ... endpoints
```

**Endpointy:**
1. `POST /webhooks/n8n/import-matches` - Import nowych meczów
2. `POST /webhooks/n8n/update-results` - Aktualizacja wyników
3. `POST /webhooks/n8n/backup-database` - Backup bazy
4. `GET /webhooks/n8n/health` - Health check
5. `GET /webhooks/n8n/status` - Status systemu

### 2. Import Service

**Wykorzystane klasy:**

```typescript
// Inicjalizacja (w każdym endpoint)
const apiClient = new ApiFootballClient(process.env.API_FOOTBALL_KEY!)
const leagueSelector = new LeagueSelector(apiClient)
const importer = new DataImporter(apiClient, leagueSelector)

// Użycie
await importer.importDateRange(startDate, endDate, false, false)
// lub
await importer.updateResults(startDate, endDate, false)

// Statystyki
const progress = importer.getProgress()
const rateLimitInfo = importer.getRateLimitInfo()
```

**Różnice vs Background Worker:**

| Aspekt | n8n Webhook | Background Worker |
|--------|-------------|-------------------|
| Trigger | HTTP request z n8n | Polling bazy (pendingPOLjobs) |
| Kolejka | Brak - bezpośrednie wykonanie | Tak - import_jobs table |
| Resume | Nie | Tak (progress tracking) |
| Rate limit | n8n queue mode | Worker retry logic |
| Stan | Stateless | Stateful (job record) |
| Szybkość | Szybsze (no queue overhead) | Wolniejsze (queue + DB) |

### 3. Backup Service

**Klasa:** `DatabaseBackup` (`server/scripts/backup-database.ts`)

```typescript
const backup = new DatabaseBackup()
await backup.createBackup({ 
  pushToGit: false,      // n8n zarządza Git
  skipIfNoChanges: true 
})
```

**Mechanizm:**
1. Używa `pg_dump` do eksportu bazy
2. Tworzy max 10 backupów (nadpisuje najstarszy)
3. Zapisuje w `backups/database-backup-{1-10}.sql`
4. Opcjonalnie commituje do Git (ale w n8n wyłączone)

### 4. Monitoring

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

### Codzienny import (szczegółowy flow)

```
1. n8n: Cron trigger (10:00)
   │
2. n8n: Set node - prepare params
   │  daysAhead: 1  (następny dzień)
   │  apiKey: from env
   │
3. n8n: HTTP Request → POST /api/webhooks/n8n/import-matches
   │  Headers: x-n8n-api-key: <key>
   │  Body: { daysAhead: 1 }
   │
4. Backend: webhookAuth middleware
   │  ✓ Sprawdza klucz
   │
5. Backend: /import-matches handler
   │
   ├─ Oblicza daty: today → today+1
   │
   ├─ Pobiera ligi (z data/leagues.json lub konkretne IDs)
   │
   ├─ Inicjalizuje DataImporter
   │
   ├─ await importer.importDateRange(startDate, endDate)
   │  │
   │  ├─ Dla każdej ligi:
   │  │  ├─ Pobiera mecze z API Football
   │  │  ├─ Zapisuje do bazy (matches table)
   │  │  └─ Aktualizuje progress
   │  │
   │  └─ Śledzi rate limit
   │
   ├─ Zbiera statystyki:
   │  - imported, failed, skipped
   │  - rate limit info
   │  - duration
   │
   └─ Zwraca JSON response
      │
6. n8n: Otrzymuje response
   │
7. n8n: IF node - sprawdza success
   │
   ├─ TRUE → Slack/Email powiadomienie (opcjonalne)
   │
   └─ FALSE → Slack/Email alert o błędzie
```

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
const apiKey = req.headers['x-n8n-api-key'] || 
               req.headers['authorization']?.replace('Bearer ', '')
const validKey = process.env.N8N_WEBHOOK_KEY

if (!apiKey || apiKey !== validKey) {
  return res.status(401).json({ error: 'Unauthorized' })
}
```

### 2. Rate Limiting

**Podejście:** n8n queue mode (wbudowane)

**Konfiguracja w n8n:**
```yaml
# n8n settings
N8N_CONCURRENCY_PRODUCTION_LIMIT: 1  # Max 1 workflow jednocześnie
N8N_EXECUTIONS_PROCESS: main          # Nie spawn new process
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

**Optymalne wartości (FREE API plan: 100 req/day):**
- Max 10 lig jednocześnie
- Zakres dat: max 7 dni
- Aktualizacje: co 4h (nie co 1h)
- daysBack: 1-2 (nie więcej)

**PREMIUM plan (7500 req/day):**
- Wszystkie ligi enabled (~50)
- Zakres dat: 7-14 dni
- Aktualizacje: co 2h
- daysBack: 2-3

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
      - N8N_PAYLOAD_SIZE_MAX=128  # MB
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

### Development

```bash
# Backend
cd server
npm run dev

# n8n
docker run -p 5678:5678 -v n8n_data:/home/node/.n8n n8nio/n8n

# Lub npm
npm install -g n8n
n8n start
```

### Production

**1. Backend (Railway/Heroku/VPS):**
```bash
# .env production
N8N_WEBHOOK_KEY=<strong-key-here>
DATABASE_URL=<production-db-url>
API_FOOTBALL_KEY=<your-key>
```

**2. n8n (Docker Compose):**
```yaml
version: '3.8'

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
DATABASE_URL=<production>
API_FOOTBALL_KEY=<your-key>
```

n8n (UI Settings):
```
BET_ASSISTANT_API_URL=https://bet-assistant-api.com
BET_ASSISTANT_WEBHOOK_KEY=<same-as-backend>
NOTIFICATION_EMAIL=alerts@yourcompany.com
```

---

## 📝 Changelog systemu

### v1.0 (19 lutego 2026)
- ✅ Inicjalna implementacja n8n webhooks
- ✅ 4 workflows: import, update, backup, monitoring
- ✅ Pełna autoryzacja API key
- ✅ Health checks i alerty
- ✅ Dokumentacja kompletna

### Planned (v1.1)
- ⏳ Rate limiting middleware (Redis)
- ⏳ Webhook retry mechanism
- ⏳ Advanced metrics (Prometheus/Grafana)
- ⏳ Multi-region support

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

**2. Test importu (dry run):**
```bash
curl -X POST \
  -H "x-n8n-api-key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"leagueIds": [39], "daysAhead": 1}' \
  http://localhost:3000/api/webhooks/n8n/import-matches
```

**3. Test n8n workflow:**
- W n8n UI: Workflow → Execute Workflow
- Sprawdź execution logs
- Verify response w każdym node

### Unit tests (TODO)

```typescript
// tests/webhooks.test.ts
import request from 'supertest'
import app from '../server/league-config-server'

describe('n8n Webhooks', () => {
  it('should reject unauthorized requests', async () => {
    const res = await request(app)
      .get('/api/webhooks/n8n/health')
    expect(res.status).toBe(401)
  })
  
  it('should accept valid API key', async () => {
    const res = await request(app)
      .get('/api/webhooks/n8n/health')
      .set('x-n8n-api-key', process.env.N8N_WEBHOOK_KEY)
    expect(res.status).toBe(200)
  })
})
```

---

## 📚 Referencje

**Pliki kluczowe:**
- `server/routes/n8n-webhooks.ts` - Wszystkie endpointy
- `server/league-config-server.ts` - Główny serwer (import routera)
- `.env` - Konfiguracja (N8N_WEBHOOK_KEY)
- `n8n-workflows/*.json` - Przykładowe workflows
- `n8n-workflows/README.md` - Instrukcja użytkownika

**Zależności:**
- `server/src/services/data-importer.ts` - Import logic
- `server/src/services/api-football-client.ts` - API Football
- `server/scripts/backup-database.ts` - Backup logic

**Dokumentacja zewnętrzna:**
- [n8n Docs](https://docs.n8n.io/)
- [API Football](https://www.api-football.com/)
- [Express.js](https://expressjs.com/)
- [Prisma ORM](https://www.prisma.io/)

---

**Koniec dokumentacji technicznej**
