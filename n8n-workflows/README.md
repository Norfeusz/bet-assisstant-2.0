# Bet Assistant 2.0 - n8n Workflows

Automatyzacja systemu importu meczów i zarządzania bazą danych za pomocą n8n.

## 📋 Spis Treści

1. [Przegląd systemu](#przegląd-systemu)
2. [Wymagania](#wymagania)
3. [Instalacja i konfiguracja](#instalacja-i-konfiguracja)
4. [Workflows](#workflows)
5. [API Endpoints](#api-endpoints)
6. [Konfiguracja zmiennych środowiskowych](#konfiguracja-zmiennych-środowiskowych)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Przegląd systemu

### Architektura

```
┌─────────────┐         ┌──────────────┐         ┌───────────────┐
│   n8n       │────────▶│  Webhooks    │────────▶│  Bet Assistant│
│  Workflows  │  HTTP   │  /api/webhooks│         │   Backend     │
│  (Cron)     │         │              │         │               │
└─────────────┘         └──────────────┘         └───────────────┘
      │                        │                         │
      │                        │                         │
      ▼                        ▼                         ▼
┌─────────────┐         ┌──────────────┐         ┌───────────────┐
│ Slack/Email │         │ Autoryzacja  │         │  PostgreSQL   │
│ Powiadomienia│        │  API Key     │         │   Database    │
└─────────────┘         └──────────────┘         └───────────────┘
```

### Główne funkcje

✅ **Automatyczny import** - codziennie o 10:00 pobiera mecze na następny dzień  
🔄 **Aktualizacja wyników** - codziennie o 0:01 aktualizuje wyniki z dnia poprzedniego  
💾 **Backup bazy** - codzienny backup o północy (0:00) + push do Git  
📊 **Monitoring** - co 15 min sprawdza stan systemu + alerty

---

## 📦 Wymagania

### n8n

- **Wersja**: 1.0+
- **Instalacja**: Self-hosted lub cloud (n8n.cloud)
- **Dokumentacja**: https://docs.n8n.io/

### Bet Assistant Backend

- Node.js 18+
- PostgreSQL
- API Football klucz
- Port 3000 (domyślnie)

### Opcjonalne integracje

- Slack (powiadomienia)
- Gmail/SMTP (email alerts)
- Google Drive (backup w chmurze)

---

## 🚀 Instalacja i konfiguracja

### Krok 1: Instalacja n8n

#### Opcja A: Docker (zalecane)

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=your-password \
  -v n8n_data:/home/node/.n8n \
  n8nio/n8n
```

#### Opcja B: npm

```bash
npm install -g n8n
n8n start
```

#### Opcja C: n8n.cloud

https://n8n.cloud - hosted solution, łatwa konfiguracja

### Krok 2: Konfiguracja Bet Assistant Backend

#### 1. Wygeneruj API key dla n8n

```powershell
# Windows PowerShell
$apiKey = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
Write-Host "N8N_WEBHOOK_KEY=$apiKey"
```

Lub użyj: https://www.random.org/strings/

#### 2. Dodaj do `.env`:

```env
# n8n Webhook Configuration
N8N_WEBHOOK_KEY=your-generated-api-key-32-chars

# Email Notifications (opcjonalne)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
```

**UWAGA:** Dla Gmail użyj App Password, nie zwykłego hasła!
https://support.google.com/accounts/answer/185833

#### 3. Restart serwera

```bash
cd server
npm run dev
# lub
node league-config-server.ts
```

### Krok 3: Import workflows do n8n

1. Otwórz n8n UI (domyślnie: http://localhost:5678)
2. Kliknij **Workflows** → **Import from File**
3. Importuj pliki z folderu `n8n-workflows/`:
   - `1-daily-import-matches.json`
   - `2-update-results-2h.json`
   - `3-daily-database-backup.json`
   - `4-monitoring-alerts.json`

### Krok 4: Konfiguracja zmiennych środowiskowych w n8n

W n8n Settings → Environment Variables dodaj:

| Zmienna                         | Wartość                 | Opis                            |
| ------------------------------- | ----------------------- | ------------------------------- |
| `BET_ASSISTANT_API_URL`         | `http://localhost:3000` | URL do API (zmień jeśli deploy) |
| `BET_ASSISTANT_WEBHOOK_KEY`     | `<twój klucz>`          | Ten sam co w .env               |
| `NOTIFICATION_EMAIL`            | `your@email.com`        | Email do powiadomień            |
| `BET_ASSISTANT_PROJECT_PATH`    | `/path/to/project`      | Ścieżka do projektu (dla Git)   |
| `GOOGLE_DRIVE_BACKUP_FOLDER_ID` | `folder-id`             | Opcjonalne (Google Drive)       |

### Krok 5: Konfiguracja credentials w n8n

Jeśli używasz powiadomień/integracji:

#### Slack (opcjonalnie)

1. Settings → Credentials → Add Credential
2. Wybierz **Slack API**
3. Stwórz Slack App: https://api.slack.com/apps
4. Dodaj OAuth scope: `chat:write`
5. Zainstal app do workspace
6. Skopiuj **Bot User OAuth Token**

#### Gmail/SMTP (opcjonalnie)

1. Settings → Credentials → Add Credential
2. Wybierz **SMTP**
3. Uzupełnij:
   - Host: `smtp.gmail.com`
   - Port: `587`
   - User: `your-email@gmail.com`
   - Password: App Password (nie zwykłe hasło!)

#### Google Drive (opcjonalnie)

1. Settings → Credentials → Add Credential
2. Wybierz **Google Drive OAuth2**
3. Połącz konto Google

---

## � Szczegółowa konfiguracja workflows (krok po kroku)

### Workflow 1: Daily Import Matches (automatyczny)

**Cel:** Codzienny import meczów na następny dzień o 10:00

#### Krok 1: Import do n8n

```
1. n8n UI → Workflows (menu lewe)
2. Kliknij "Add workflow" → "Import from File"
3. Wybierz plik: n8n-workflows/1-daily-import-matches.json
4. Kliknij "Import"
5. Workflow otworzy się automatycznie
```

#### Krok 2: Sprawdź Schedule Trigger

```
1. Kliknij node "Schedule Trigger" (pierwszy node)
2. Sprawdź Cron Expression: 0 10 * * * (10:00 każdego dnia)
3. Sprawdź Timezone (domyślnie: system timezone lub America/New_York)
```

**💡 Zmiana godziny importu:**

```
0 6 * * *   → 06:00
0 10 * * *  → 10:00 (domyślnie)
0 14 * * *  → 14:00
```

#### Krok 3: Sprawdź HTTP Request node

```
1. Kliknij node "HTTP Request - Import Matches"
2. Sprawdź URL: https://bet-assistant-backend.onrender.com/api/webhooks/n8n/import-matches
   (lub http://localhost:3000 jeśli lokalnie)
3. Sprawdź Headers → x-n8n-api-key: {{ $env.BET_ASSISTANT_WEBHOOK_KEY }}
4. Sprawdź Body → JSON:
   {
     "daysAhead": 1,
     "async": true
   }
```

#### Krok 4: Aktywuj workflow

```
1. Kliknij przełącznik "Inactive" → "Active" (góra ekranu)
2. Powinieneś zobaczyć zielony status "Active"
3. Workflow będzie się wykonywał automatycznie o 10:00
```

#### Krok 5: Test (opcjonalnie)

```
1. Kliknij "Test workflow" (zamiast czekać do 10:00)
2. Workflow wykona się natychmiast
3. Sprawdź output w każdym node (kliknij na node)
4. Oczekiwany wynik w "HTTP Request":
   {
     "success": true,
     "async": true,
     "jobId": 347,
     "message": "Import job created successfully..."
   }
```

---

### Workflow 2: Keep-Alive Render Worker ⭐ (KRYTYCZNY)

**Cel:** Podtrzymać backend aktywnym aby worker procesował rate limited jobs

**⚠️ WAŻNE:** Bez tego workflow worker zaśnie podczas 15-min rate limit wait!

#### Krok 1: Import do n8n

```
1. n8n UI → Workflows
2. "Add workflow" → "Import from File"
3. Wybierz: n8n-workflows/keep-alive-render.json
4. Kliknij "Import"
```

#### Krok 2: Sprawdź Schedule Trigger

```
1. Kliknij node "Schedule Trigger"
2. Sprawdź Cron Expression: */10 10-16,20-23,0-3 * * *
3. Co to znaczy:
   - */10 = co 10 minut
   - 10-16,20-23,0-3 = w godzinach: 10:00-16:59, 20:00-23:59, 00:00-03:59
   - Timezone: America/New_York (domyślnie)
```

**Konwersja na czas polski (jeśli n8n timezone = America/New_York):**

```
10:00-16:59 NY = 16:00-22:59 PL (7 godzin)
20:00-03:59 NY = 02:00-09:59 PL (8 godzin)
```

**💡 Koszt (Render Free Tier):**

```
13h/dzień × 30 dni = 390h/miesiąc
Limit Free Tier: 750h/miesiąc
Wykorzystanie: 52% (margines: 48%)
```

#### Krok 3: Sprawdź HTTP Request node

```
1. Kliknij node "Health Check"
2. URL: https://bet-assistant-backend.onrender.com/api/webhooks/n8n/health
3. Headers → x-n8n-api-key: {{ $env.BET_ASSISTANT_WEBHOOK_KEY }}
4. Timeout: 30000ms (30 sekund - dla cold start)
```

#### Krok 4: Aktywuj workflow

```
1. Kliknij "Inactive" → "Active"
2. Workflow zacznie działać automatycznie co 10 minut
3. Za 10 minut sprawdź Executions → powinneś zobaczyć pierwsze wykonanie
```

#### Krok 5: Weryfikacja (za 15 minut)

```bash
# Sprawdź czy backend przestał spać:
curl -H "x-n8n-api-key: TWOJ_KEY" \
  https://bet-assistant-backend.onrender.com/api/webhooks/n8n/health

# Jeśli response < 1 sekunda → OK, backend nie śpi ✅
# Jeśli response 20-40s → backend zasnął, Keep-Alive nie działa ❌

# Sprawdź Executions w n8n:
# n8n UI → Executions → filtruj "Keep-Alive"
# Powinny być wykonania co 10 minut (tylko w godzinach 10-16, 20-03)
```

**Harmonogram wykonań (przykład dla timezone America/New_York):**

```
10:00 NY → Wykonanie ✅
10:10 NY → Wykonanie ✅
10:20 NY → Wykonanie ✅
...
16:50 NY → Wykonanie ✅
17:00 NY → NIE wykonuje (poza harmonogramem)
17:10 NY → NIE wykonuje
...
19:50 NY → NIE wykonuje
20:00 NY → Wykonanie ✅ (nowy blok)
20:10 NY → Wykonanie ✅
```

---

### Workflow 3: Manual Wake Worker (ręczny trigger)

**Cel:** Ręczne obudzenie Render + sprawdzenie pending jobs

**Kiedy używać:**

- Dodałeś job ręcznie przez UI poza godzinami Keep-Alive
- Testujesz system
- Render zasnął i potrzebujesz go natychmiast obudzić

#### Krok 1: Import do n8n

```
1. n8n UI → Workflows
2. "Add workflow" → "Import from File"
3. Wybierz: n8n-workflows/manual-wake-worker.json
4. Kliknij "Import"
```

#### Krok 2: Sprawdź nodes (nie trzeba konfigurować)

```
1. "When clicking 'Test workflow'" → Manual Trigger (automatyczny)
2. "Wake Backend" → GET /health (timeout 60s)
3. "Check Pending Jobs" → GET /import-jobs/status
4. "Final Summary" → JavaScript code (zwraca podsumowanie)
```

#### Krok 3: NIE aktywuj

```
⚠️ To workflow z Manual Trigger - nie aktywuj go!
Uruchamia się tylko gdy klikniesz "Test workflow"
```

#### Krok 4: Użycie

```
1. Otwórz workflow "Manual Wake Worker"
2. Kliknij "Test workflow" (góra ekranu)
3. Czekaj 20-60 sekund (Render cold start jeśli serwis spał)
4. Sprawdź wyniki:
   - Kliknij node "Final Summary"
   - Zobacz Output
```

**Przykładowy output:**

```json
{
  "backend": {
    "success": true,
    "message": "✅ Backend is awake and healthy!",
    "database": "ok",
    "apiKey": "configured"
  },
  "jobs": {
    "pending": [
      {
        "id": 346,
        "type": "new_matches",
        "leagues": 159,
        "date_range": "2026-02-25 → 2026-02-25",
        "created": "2026-02-24T14:25:00.000Z"
      }
    ],
    "rate_limited": [
      {
        "id": 345,
        "type": "new_matches",
        "reset_at": "2026-02-24T14:35:00.000Z",
        "progress": "85/150",
        "waiting_minutes": 5
      }
    ],
    "running": [],
    "total": 2
  },
  "message": "Worker is awake! Found 2 jobs waiting.",
  "nextAction": "Worker will process jobs in next polling cycle (max 5 minutes)"
}
```

#### Krok 5: Interpretacja wyników

```
jobs.pending > 0:
  → Worker znajdzie job w ciągu 5 minut i zacznie procesować

jobs.rate_limited > 0:
  → Job czeka na rate limit reset
  → Sprawdź "waiting_minutes" - ile jeszcze czekać
  → Worker wznowi automatycznie po upłynięciu czasu

jobs.running > 0:
  → Job jest obecnie procesowany
  → Sprawdź progress w Database Browser

jobs.total = 0:
  → Brak jobów do przetworzenia
  → Worker idle (czeka na nowe zadania)
```

---

## 🧪 Testowanie konfiguracji

### Test 1: Backend Health (podstawowy)

```
1. Otwórz workflow "Manual Wake Worker"
2. Kliknij "Test workflow"
3. Oczekiwany wynik w node "Wake Backend":
   {
     "success": true,
     "status": "healthy",
     "checks": {
       "database": "ok",
       "apiFootballKey": "configured"
     }
   }
```

**Błędy i rozwiązania:**

```
❌ 401 Unauthorized:
   → Zły API key
   → Sprawdź BET_ASSISTANT_WEBHOOK_KEY w n8n Variables
   → Musi pasować do N8N_WEBHOOK_KEY w Render Environment

❌ Timeout (po 60s):
   → Render cold start trwa zbyt długo
   → Poczekaj 2 minuty i spróbuj ponownie
   → Jeśli nadal timeout → sprawdź Render logs (czy backend działa)

❌ Connection refused:
   → Backend nie działa lub zły URL
   → Sprawdź BET_ASSISTANT_API_URL w n8n Variables
   → Dla Render: https://bet-assistant-backend.onrender.com
   → Dla local: http://localhost:3000
```

### Test 2: Daily Import (dry run)

```
1. Otwórz workflow "Daily Import Matches"
2. Kliknij "Test workflow"
3. Oczekiwany wynik w "HTTP Request":
   {
     "success": true,
     "async": true,
     "jobId": 348,
     "message": "Import job created successfully...",
     "checkStatusUrl": "/api/import-jobs/348"
   }
```

**Co sprawdzić po teście:**

```bash
# Sprawdź czy job został utworzony w bazie:
SELECT id, status, job_type, leagues, date_from, date_to, created_at
FROM import_jobs
WHERE id = 348;

# Oczekiwany status: 'in_queue' lub 'pending'
# Worker znajdzie job w ciągu 5 minut i zacznie procesować
```

### Test 3: Keep-Alive (po aktywacji, czekaj 15 min)

```
1. Aktywuj workflow "Keep-Alive - Render Worker"
2. Poczekaj 10-15 minut
3. n8n UI → Executions
4. Filtruj: "Keep-Alive" lub zobacz najnowsze
5. Powinieneś zobaczyć wykonania co 10 minut
6. Kliknij na wykonanie → sprawdź czy Success ✅
7. Jeśli Error ❌ → kliknij na node z błędem, zobacz error message
```

---

## 🔧 Troubleshooting konfiguracji

### Problem: Workflow nie wykonuje się automatycznie

**Diagnoza:**

```
1. Sprawdź czy workflow jest Active (zielony status u góry)
2. Kliknij Schedule Trigger node → sprawdź Cron Expression
3. n8n → Executions → filtruj nazwę workflow
4. Jeśli brak executions → workflow nie active lub zły cron
```

**Rozwiązanie:**

```
1. Upewnij się że przełącznik Active jest włączony (zielony)
2. Sprawdź n8n logs (jeśli self-hosted):
   docker logs n8n
3. Sprawdź timezone:
   - W Schedule Trigger node sprawdź "Timezone"
   - Upewnij się że cron expression pasuje do twojej strefy czasowej
```

### Problem: "Variable not found: BET_ASSISTANT_WEBHOOK_KEY"

**Przyczyna:** Nie dodano Environment Variable w n8n

**Rozwiązanie:**

```
1. n8n → Settings → Variables
2. Add Variable:
   Name: BET_ASSISTANT_WEBHOOK_KEY
   Value: <skopiuj z Render Environment lub .env>
3. Save
4. Uruchom workflow ponownie
```

### Problem: Keep-Alive wykonuje się 24/7 zamiast tylko w godzinach pracy

**Przyczyna:** Zły cron expression

**Rozwiązanie:**

```
1. Otwórz workflow "Keep-Alive"
2. Kliknij Schedule Trigger
3. Sprawdź Cron Expression: */10 10-16,20-23,0-3 * * *
4. Jeśli jest */10 * * * * → zmień na */10 10-16,20-23,0-3 * * *
5. Save workflow
```

### Problem: Manual Wake Worker timeout po 60s

**Przyczyna:** Render cold start lub backend nie działa

**Rozwiązanie:**

```
1. Sprawdź Render Dashboard → bet-assistant-backend → Logs
2. Czy widzisz: "Server started on port 3000"?
3. Jeśli NIE → backend nie działa, sprawdź deployment errors
4. Jeśli TAK ale timeout → zwiększ timeout:
   - Kliknij node "Wake Backend"
   - Options → Timeout: 90000 (90 sekund)
```

---

## �🔄 Workflows

### 1. Codzienny Import Meczów (`1-daily-import-matches.json`)

**Trigger:** Cron - codziennie o 10:00  
**Funkcja:** Importuje mecze na następny dzień

**Endpoint:** `POST /api/webhooks/n8n/import-matches`

**Parametry:**

```json
{
  "daysAhead": 1,
  "notifyEmail": "optional@email.com"
}
```

**Modyfikacja harmonogramu:**

- W node "Cron: Codziennie o 10:00"
- Zmień `cronExpression`: `0 10 * * *`
- Przykłady:
  - `0 6 * * *` - o 6:00
  - `0 12 * * *` - o 12:00

**Wyłączenie powiadomień:**

- Dezaktywuj node "Slack - Sukces" i "Email - Sukces"

---

### 2. Aktualizacja Wyników (`2-update-results-2h.json`)

**Trigger:** Cron - codziennie o 0:01  
**Funkcja:** Aktualizuje wyniki meczów z dnia poprzedniego

**Endpoint:** `POST /api/webhooks/n8n/update-results`

**Parametry:**

```json
{
  "daysBack": 1
}
```

**Modyfikacja częstotliwości:**

- W node "Cron: Codziennie o 0:01"
- Zmień `cronExpression`: `1 0 * * *`
- Przykłady:
  - `0 */2 * * *` - co 2h
  - `0 */4 * * *` - co 4h
  - `1 0 * * *` - codziennie 0:01

**Modyfikacja zakresu dni:**

- W node "Ustaw parametry aktualizacji"
- Zmień `daysBack` na inną wartość:
  - `1` - tylko wczoraj
  - `2` - ostatnie 2 dni
  - `7` - ostatni tydzień

**Warunkowe powiadomienia:**

- Node "Czy dużo aktualizacji?" wysyła alert tylko gdy >= 10 meczów
- Zmień wartość `10` na inny próg

---

### 3. Codzienny Backup Bazy (`3-daily-database-backup.json`)

**Trigger:** Cron - codziennie o 0:00 (północ)  
**Funkcja:** Backup bazy PostgreSQL + push do Git

**Endpoint:** `POST /api/webhooks/n8n/backup-database`

**Parametry:**

```json
{
  "pushToGit": false,
  "skipIfNoChanges": true
}
```

**⚠️ WAŻNE:**

- Node "Execute Command - Git Push" wymaga skonfigurowanego Git w projekcie
- Upewnij się że folder `backups/` jest w repozytorium
- Zmień `BET_ASSISTANT_PROJECT_PATH` na właściwą ścieżkę

**Opcjonalne: Google Drive backup**

- Aktywuj node "Google Drive - Upload Backup"
- Skonfiguruj credentials Google Drive
- Ustaw `GOOGLE_DRIVE_BACKUP_FOLDER_ID`

---

### 4. Monitoring i Alerty (`4-monitoring-alerts.json`)

**Trigger:** Cron - co 15 minut  
**Funkcja:** Health check + alerty o problemach

**Endpoints:**

- `GET /api/webhooks/n8n/health` - sprawdza czy API działa
- `GET /api/webhooks/n8n/status` - statystyki systemu

**Alerty:**

1. **System Down** - API nie odpowiada (Slack + Email)
2. **Niska liczba meczów** - < 100 meczów w bazie (Slack)

**Modyfikacja progów:**

- W node "Czy niska liczba meczów?"
- Zmień `100` na inną wartość

**Wyłączenie alertów:**

- Dezaktywuj niepotrzebne node (Slack/Email)

---

### 5. Keep-Alive - Render Worker (`keep-alive-render.json`)

**Trigger:** Cron - co 10 minut (tylko w godzinach pracy)  
**Funkcja:** Podtrzymuje Render backend aktywnym, aby worker mógł procesować zadania

**⚠️ KRYTYCZNE dla Render Free Tier:**

- Worker polling loop nie generuje HTTP traffic
- Render usypia po 15 min bez HTTP
- Worker nie budzi się samodzielnie
- Jobs czekają w kolejce ale nie są procesowane

**Harmonogram:**

```
Cron: */10 10-16,20-23,0-3 * * *
Aktywny:
  - 10:00-16:59 NY (16:00-22:59 PL) - 7h - daily import + rate limit recovery
  - 20:00-03:59 NY (02:00-09:59 PL) - 8h - update results + nocne zadania
Śpi:
  - 04:00-09:59 NY (10:00-15:59 PL) - 6h
  - 17:00-19:59 NY (23:00-01:59 PL) - 3h
Razem: 13h/dzień
```

**Koszt:**

- 13h/dzień × 30 dni = **390 godzin/miesiąc**
- Render Free Tier limit: 750h/miesiąc
- **Wykorzystanie: 52%** (margines 48%)

**Konfiguracja:**

1. Import `keep-alive-render.json`
2. Ustaw Environment Variable: `BET_ASSISTANT_WEBHOOK_KEY`
3. Aktywuj workflow (przełącznik Active)

**Endpoint:** `GET /api/webhooks/n8n/health`

**Bez tego workflow:**

- Worker zaśnie podczas 15-min rate limit wait
- Jobs mogą pozostać w statusie 'rate_limited' do następnego dnia
- Ręczne importy poza harmonogramem nie będą procesowane

---

### 6. Manual Wake Worker (`manual-wake-worker.json`)

**Trigger:** Manual (kliknięcie użytkownika)  
**Funkcja:** Ręczne obudzenie Render backend + sprawdzenie pending jobs

**Kiedy używać:**
✅ Dodałeś ręcznie job przez UI/API poza godzinami Keep-Alive  
✅ Testujesz import bez czekania na scheduled trigger  
✅ Development/Debug - sprawdzenie czy backend działa  
✅ Render zasnął i potrzebujesz natychmiastowo wykonać zadanie

**Co robi:**

1. Budzi backend (GET /health) - timeout 60s dla cold start
2. Sprawdza health status (database, API key)
3. Pobiera listę pending jobs (GET /import-jobs/status)
4. Zwraca podsumowanie: ile jobs czeka, ile rate_limited, ile running

**Przykładowa odpowiedź:**

```json
{
  "backend": {
    "success": true,
    "message": "✅ Backend is awake and healthy!",
    "database": "ok",
    "apiKey": "configured"
  },
  "jobs": {
    "pending": [{ "id": 346, "type": "new_matches", "leagues": 159 }],
    "rate_limited": [{ "id": 345, "reset_at": "...", "waiting_minutes": 5 }],
    "running": [],
    "total": 2
  },
  "message": "Worker is awake! Found 2 jobs waiting.",
  "nextAction": "Worker will process jobs in next polling cycle (max 5 minutes)"
}
```

**Konfiguracja:**

1. Import `manual-wake-worker.json`
2. Ustaw Environment Variable: `BET_ASSISTANT_WEBHOOK_KEY`
3. Kliknij "Test workflow" gdy potrzebujesz

**Endpoints:**

- `GET /api/webhooks/n8n/health` - health check
- `GET /api/webhooks/n8n/import-jobs/status` - lista pending jobs

**Różnica vs Keep-Alive:**

- Manual Wake: Na żądanie, pokazuje status jobs, cost ~0h
- Keep-Alive: Automatyczny, produkcja, cost 390h/miesiąc

---

## 🔌 API Endpoints

### Autoryzacja

Wszystkie endpointy wymagają nagłówka:

```
x-n8n-api-key: <twój-wygenerowany-klucz>
```

lub:

```
Authorization: Bearer <twój-wygenerowany-klucz>
```

### Import nowych meczów

```http
POST /api/webhooks/n8n/import-matches
Content-Type: application/json
x-n8n-api-key: <key>

{
  "leagueIds": [39, 140, 78],  // Opcjonalne - konkretne ligi
  "dateFrom": "2026-02-20",     // Opcjonalne - domyślnie: dziś
  "dateTo": "2026-02-27",       // Opcjonalne - domyślnie: +7 dni
  "daysAhead": 7,               // Alternatywa: ile dni do przodu
  "notifyEmail": "email@test.com" // Opcjonalne
}
```

**Odpowiedź sukces:**

```json
{
  "success": true,
  "stats": {
    "totalMatches": 350,
    "imported": 320,
    "failed": 5,
    "skipped": 25,
    "leagues": 12,
    "leagueDetails": { ... }
  },
  "rateLimit": {
    "remaining": 7200,
    "limit": 7500,
    "resetAt": "2026-02-20T00:00:00Z"
  },
  "timing": {
    "durationSeconds": 45.32,
    "dateRange": {
      "from": "2026-02-20",
      "to": "2026-02-27"
    }
  }
}
```

### Aktualizacja wyników

```http
POST /api/webhooks/n8n/update-results
Content-Type: application/json
x-n8n-api-key: <key>

{
  "dateFrom": "2026-02-18",     // Opcjonalne
  "dateTo": "2026-02-20",       // Opcjonalne - domyślnie: dziś
  "daysBack": 2,                // Alternatywa: ile dni wstecz
  "leagueIds": [39, 140]        // Opcjonalne - auto-detect z meczów
}
```

**Odpowiedź sukces:**

```json
{
  "success": true,
  "stats": {
    "totalMatches": 85,
    "updated": 82,
    "failed": 3,
    "leagues": 8,
    "leagueDetails": { ... }
  },
  "rateLimit": { ... },
  "timing": { ... }
}
```

### Backup bazy danych

```http
POST /api/webhooks/n8n/backup-database
Content-Type: application/json
x-n8n-api-key: <key>

{
  "pushToGit": false,           // n8n zarządza Git
  "skipIfNoChanges": true,      // Pomiń jeśli brak zmian
  "notifyEmail": "email@test.com"
}
```

**Odpowiedź sukces:**

```json
{
  "success": true,
  "backup": {
    "file": "database-backup-3.sql",
    "sizeMB": 15.48,
    "timestamp": "2026-02-20T03:00:15Z",
    "path": "/path/to/backups/database-backup-3.sql"
  },
  "timing": {
    "durationSeconds": 3.21
  },
  "totalBackups": 7
}
```

### Health Check

```http
GET /api/webhooks/n8n/health
x-n8n-api-key: <key>
```

**Odpowiedź:**

```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-02-20T10:15:00Z",
  "checks": {
    "database": "ok",
    "apiFootballKey": "configured"
  }
}
```

### Status systemu

```http
GET /api/webhooks/n8n/status
x-n8n-api-key: <key>
```

**Odpowiedź:**

```json
{
  "success": true,
  "stats": {
    "totalMatches": 5284,
    "enabledLeagues": 45,
    "recentImports": [
      {
        "id": 123,
        "status": "completed",
        "createdAt": "2026-02-20T06:00:00Z",
        "completedAt": "2026-02-20T06:02:15Z",
        "duration": "135.00s"
      }
    ]
  },
  "timestamp": "2026-02-20T10:15:00Z"
}
```

---

## 🔐 Bezpieczeństwo

### Generowanie bezpiecznego API key

```powershell
# PowerShell (Windows)
$bytes = New-Object byte[] 32
[Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
$apiKey = [Convert]::ToBase64String($bytes)
Write-Host "N8N_WEBHOOK_KEY=$apiKey"
```

```bash
# Linux/Mac
openssl rand -hex 32
```

### Best practices

✅ **DO:**

- Użyj różnych kluczy dla dev/prod
- Trzymaj klucz w zmiennych środowiskowych (nie w kodzie!)
- Rotuj klucz co 3-6 miesięcy
- Używaj HTTPS w produkcji

❌ **DON'T:**

- Nie commituj `.env` do Git
- Nie udostępniaj klucza publicznie
- Nie używaj prostych/krótkich kluczy

---

## 🐛 Troubleshooting

### Problem: "Unauthorized - Invalid API key"

**Rozwiązanie:**

1. Sprawdź czy `N8N_WEBHOOK_KEY` jest identyczny w:
   - `.env` (backend)
   - n8n Environment Variables
2. Restart serwera backend po zmianie `.env`
3. Sprawdź czy nagłówek w n8n: `x-n8n-api-key` (bez literówek!)

### Problem: "Webhook not configured on server"

**Rozwiązanie:**

1. Sprawdź czy `N8N_WEBHOOK_KEY` istnieje w `.env`
2. Restart serwera backend
3. Sprawdź logi: `console.error('❌ N8N_WEBHOOK_KEY not configured')`

### Problem: Workflow timeout

**Rozwiązanie:**

1. Zwiększ timeout w node HTTP Request:
   - Options → Timeout → `300000` (5 minut)
2. Dla dużych importów rozważ:
   - Mniejszy zakres dat
   - Mniej lig jednocześnie
3. Sprawdź rate limit API Football

### Problem: Git push nie działa w backupie

**Rozwiązanie:**

1. Sprawdź `BET_ASSISTANT_PROJECT_PATH` w n8n
2. Upewnij się że Git skonfigurowany w projekcie:
   ```bash
   git config user.name "n8n-backup"
   git config user.email "backup@betassistant.com"
   ```
3. Folder `backups/` musi być w repo (nie w .gitignore)
4. Testuj komendę manualnie:
   ```bash
   cd /path/to/project/backups
   git add .
   git commit -m "test"
   git push
   ```

### Problem: Email notifications nie działają

**Rozwiązanie:**

1. Gmail: użyj App Password, nie zwykłego hasła
   - https://myaccount.google.com/apppasswords
2. Sprawdź credentials w n8n (SMTP)
3. Testuj SMTP connection w n8n

### Problem: Duże zużycie API Football

**Rozwiązanie:**

1. Zmniejsz częstotliwość aktualizacji wyników:
   - Co 4h zamiast co 2h: `0 */4 * * *`
2. Zmniejsz `daysBack` w aktualizacjach:
   - 1 dzień zamiast 2
3. Importuj tylko wybrane ligi:
   - Podaj `leagueIds` w body request

---

## 📊 Monitoring zużycia API

Sprawdź zużycie w endpoint `/api/webhooks/n8n/status`:

```json
{
  "rateLimit": {
    "remaining": 7200,
    "limit": 7500,
    "resetAt": "2026-02-21T00:00:00Z"
  }
}
```

**Szacowane zużycie (dzienny plan):**

- Import codzienny (7 dni, 45 lig): ~450 req
- Aktualizacja co 2h (12x dziennie, ~3 ligi): ~360 req
- **Total**: ~810 req/dzień

**Plan FREE (100 req/dzień):**

- Zmień harmonogramy na rzadsze
- Ogranicz liczbę lig
- Rozważ plan PREMIUM

---

## 🎓 Dodatkowe zasoby

- [n8n Documentation](https://docs.n8n.io/)
- [API Football Docs](https://www.api-football.com/documentation-v3)
- [Cron Expression Generator](https://crontab.guru/)
- [Bet Assistant Backend API](../Dokumentacja/dokumentacja%20techniczna)

---

## 📞 Wsparcie

Jeśli masz problemy:

1. Sprawdź logi serwera backend
2. Sprawdź execution logs w n8n (dla każdego workflow)
3. Sprawdź dokumentację techniczną projektu

---

**Wersja:** 1.0  
**Data:** 19 lutego 2026  
**Autor:** Bet Assistant Team
