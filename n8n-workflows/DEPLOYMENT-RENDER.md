# 🌐 Render.com Deployment - Krok Po Kroku

**Cel:** Wdrożenie Bet Assistant 2.0 backendu w chmurze Render.com (NAPRAWDĘ DARMOWE!)

**Czas:** ~20-30 minut  
**Koszt:** $0/miesiąc (free tier - BEZ KARTY KREDYTOWEJ!)  
**Efekt:** Backend + PostgreSQL działają 24/7, nawet gdy Twój komputer jest wyłączony

---

## 📚 Spis treści

1. [Czym jest Render?](#czym-jest-render)
2. [Przygotowanie projektu](#przygotowanie)
3. [Push do GitHub](#github)
4. [Utworzenie konta Render](#konto-render)
5. [Deploy PostgreSQL](#deploy-postgres)
6. [Deploy backendu](#deploy-backend)
7. [Konfiguracja zmiennych środowiskowych](#env-variables)
8. [Uruchomienie migracji](#migracje)
9. [Konfiguracja n8n](#konfiguracja-n8n)
10. [Testowanie](#testowanie)
11. [Monitoring i logi](#monitoring)
12. [Troubleshooting](#troubleshooting)

---

## Czym jest Render? {#czym-jest-render}

**Render.com** to nowoczesna platforma cloud dla aplikacji webowych (alternatywa dla Heroku).

### Dlaczego Render?

✅ **750 godzin darmowo** miesięcznie (~25h/dzień - WYSTARCZY!)  
✅ **BEZ KARTY KREDYTOWEJ** - prawdziwie darmowy tier  
✅ **Managed PostgreSQL** z automatycznymi backupami (90 dni)  
✅ **Automatyczne SSL** (HTTPS z Let's Encrypt)  
✅ **Deploy z GitHub** - push = automatyczny redeploy  
✅ **Zero konfiguracji** - wykrywa Node.js automatycznie  
✅ **Darmowe buildy** i deploymenty  

### Limity Free Tier:

⚠️ **Sleep po inaktywności:**
- Backend "zasypia" po **15 minutach** bez requestów
- **Cold start:** ~30-60 sekund po obudzeniu
- **Rozwiązanie:** n8n workflow "ping" co 10 min (utrzyma aktywność)

📊 **Zasoby:**
- **512 MB RAM** (wystarczy dla Express + Prisma)
- **CPU:** Shared (wystarczy dla API)
- **Storage:** SSL persistent disk included

### Co będziemy hostować?

```
┌─────────────────────────────────────┐
│         RENDER.COM (Cloud)          │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  PostgreSQL Database         │  │ ← Twoja baza danych
│  │  (Free tier, 90 dni backupy) │  │
│  └──────────────────────────────┘  │
│              ▲                      │
│              │                      │
│  ┌───────────┴──────────────────┐  │
│  │  Bet Assistant Backend       │  │ ← Twój serwer Express
│  │  (Node.js + Express)         │  │
│  │  Publiczny URL:              │  │
│  │  https://bet-assistant.      │  │
│  │  onrender.com                │  │
│  └──────────────────────────────┘  │
│              ▲                      │
└──────────────┼──────────────────────┘
               │ HTTP Webhooks
               │
    ┌──────────┴──────────┐
    │   n8n (lokalnie     │ ← Twoje workflows
    │   lub w chmurze)    │
    └─────────────────────┘
```

---

## Przygotowanie projektu {#przygotowanie}

### Krok 1: Sprawdź czy backend działa lokalnie

```powershell
cd "d:\narzędzia\Bet Assistant 2.0"
npm run server
```

Otwórz: http://localhost:3000/api/webhooks/n8n/health

Jeśli widzisz odpowiedź (nawet 401) - OK! ✅

### Krok 2: Dodaj production script (już masz!)

Sprawdź w `package.json` czy jest:

```json
"scripts": {
  "start": "npx tsx server/league-config-server.ts"
}
```

✅ Jeśli TAK - super, masz już!  
❌ Jeśli NIE - dodaj tę linię ręcznie lub powiedz mi, dodam.

### Krok 3: Utwórz plik `render.yaml` (opcjonalnie)

To pozwoli Render automatycznie wykryć konfigurację:

```powershell
cd "d:\narzędzia\Bet Assistant 2.0"
```

Stwórz plik `render.yaml` z zawartością:

```yaml
services:
  - type: web
    name: bet-assistant-backend
    env: node
    buildCommand: npm install && npx prisma generate
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: bet-assistant-db
          property: connectionString

databases:
  - name: bet-assistant-db
    databaseName: betassistant
    plan: free
```

**To jest opcjonalne** - możesz również skonfigurować wszystko przez UI (pokażę obie metody).

### Krok 4: Commit wszystkiego do Git

```powershell
cd "d:\narzędzia\Bet Assistant 2.0"

# Sprawdź czy masz zmiany
git status

# Jeśli są zmiany, commituj:
git add .
git commit -m "Prepare for Render deployment"
```

**✅ CHECKPOINT:** Projekt gotowy do deploy

---

## Push do GitHub {#github}

Render wymaga kodu na GitHub (lub GitLab). Jeśli już masz - pomiń ten krok!

### Krok 1: Utwórz repo na GitHub

1. Przejdź na: https://github.com/new
2. **Repository name:** `bet-assistant-2.0`
3. **Visibility:** Private (zalecane) lub Public
4. **NIE** zaznaczaj "Initialize with README"
5. Kliknij **"Create repository"**

### Krok 2: Push lokalnego kodu do GitHub

GitHub pokaże Ci instrukcje. W PowerShell:

```powershell
cd "d:\narzędzia\Bet Assistant 2.0"

# Dodaj remote (zmień YOUR-USERNAME na swoją nazwę użytkownika GitHub)
git remote add origin https://github.com/YOUR-USERNAME/bet-assistant-2.0.git

# Push
git branch -M main
git push -u origin main
```

Jeśli poprosi o login - użyj **Personal Access Token** zamiast hasła:
1. GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token → `repo` permissions
3. Skopiuj token i użyj jako hasła

**✅ CHECKPOINT:** Kod na GitHub, repo widoczne pod `https://github.com/YOUR-USERNAME/bet-assistant-2.0`

---

## Utworzenie konta Render {#konto-render}

### Krok 1: Zarejestruj się

1. Przejdź na: https://render.com/
2. Kliknij **"Get Started"** lub **"Sign Up"**
3. Zarejestruj się przez:
   - **GitHub** (ZALECANE - automatyczny dostęp do repo!)
   - **GitLab**
   - **Email**

**WAŻNE:** Wybierz GitHub aby Render miał dostęp do Twoich repozytoriów!

### Krok 2: Autoryzuj GitHub (jeśli wybrałeś GitHub)

1. Render poprosi o dostęp do GitHub
2. Wybierz:
   - **All repositories** (najłatwiejsze)
   - LUB **Only select repositories** → wybierz `bet-assistant-2.0`
3. Kliknij **"Authorize Render"**

### Krok 3: Dashboard Render

Po zalogowaniu zobaczysz:

```
┌──────────────────────────────────────────────┐
│  Render Dashboard                       👤   │
├──────────────────────────────────────────────┤
│                                               │
│  [+ New]  ← Tutaj dodamy services            │
│    ↓                                          │
│    • Web Service                              │
│    • PostgreSQL                               │
│    • Redis                                    │
│    • Cron Job                                 │
│                                               │
│  Your Services:                               │
│  (pusty jeśli nowe konto)                    │
│                                               │
└──────────────────────────────────────────────┘
```

**✅ CHECKPOINT:** Konto Render utworzone, GitHub połączony

---

## Deploy PostgreSQL {#deploy-postgres}

### Krok 1: Utwórz bazę danych

1. Dashboard Render → Kliknij **"+ New"**
2. Wybierz **"PostgreSQL"**
3. Konfiguracja:
   - **Name:** `bet-assistant-db`
   - **Database:** `betassistant` (nazwa bazy)
   - **User:** `betassistant` (lub zostaw domyślne)
   - **Region:** Frankfurt (EU) - najbliżej Polski 🇵🇱
   - **Plan:** **Free** ✅

4. Kliknij **"Create Database"**

**Poczekaj ~60 sekund** - Render tworzy bazę...

### Krok 2: Zobacz connection string

Po utworzeniu bazy:

1. Kliknij na `bet-assistant-db` (w liście services)
2. Zakładka **"Info"**
3. Znajdź **"Internal Database URL"** i **"External Database URL"**

**Internal URL** (użyj tego!):
```
postgresql://betassistant:HASLO@dpg-xyz-a.frankfurt-postgres.render.com/betassistant
```

**NIE KOPIUJ JESZCZE** - za chwilę to automatycznie podłączymy!

### Krok 3: Sprawdź status

Status powinien być **"Available"** (zielony).

**✅ CHECKPOINT:** PostgreSQL działa na Render!

---

## Deploy Backendu {#deploy-backend}

### Krok 1: Utwórz Web Service

1. Dashboard → **"+ New"** → **"Web Service"**
2. **Connect a repository:**
   - Wybierz **"bet-assistant-2.0"** z listy GitHub repo
   - Jeśli nie widzisz - kliknij "Configure account" i daj dostęp

3. Kliknij **"Connect"**

### Krok 2: Konfiguracja Web Service

Render wykryje Node.js automatycznie! Sprawdź/ustaw:

#### **Basic:**
- **Name:** `bet-assistant-backend`
- **Region:** Frankfurt (EU) - tak samo jak baza!
- **Branch:** `main` (lub `master`)
- **Root Directory:** (zostaw puste - deploy z głównego katalogu)

#### **Build & Deploy:**
- **Runtime:** Node ✅ (auto-detected)
- **Build Command:** 
  ```
  npm install && npx prisma generate
  ```
- **Start Command:** 
  ```
  npm start
  ```

#### **Plan:**
- Wybierz **"Free"** ✅

### Krok 3: Kliknij "Create Web Service"

Render zacznie build! Zobaczysz logi w czasie rzeczywistym:

```
==> Cloning from https://github.com/YOUR-USERNAME/bet-assistant-2.0...
==> Running 'npm install'
==> Running 'npx prisma generate'
==> Starting 'npm start'
==> Your service is live! 🎉
```

**To może zająć 2-5 minut** przy pierwszym deploy.

### Krok 4: Sprawdź publiczny URL

Po zakończeniu deploy:

1. Na górze strony zobaczysz URL:
   ```
   https://bet-assistant-backend.onrender.com
   ```

2. **SKOPIUJ TEN URL** - będzie potrzebny dla n8n!

**⚠️ UWAGA:** Teraz backend się crashuje - bo brak zmiennych środowiskowych! To normalne, zaraz naprawimy.

**✅ CHECKPOINT:** Backend jest deployed (nawet jeśli crashuje - to OK!)

---

## Konfiguracja zmiennych środowiskowych {#env-variables}

### Krok 1: Przejdź do Environment Variables

1. Twój backend service (`bet-assistant-backend`)
2. Zakładka **"Environment"** (lewe menu)
3. Sekcja **"Environment Variables"**

### Krok 2: Połącz bazę danych

Kliknij **"+ Add Environment Variable"**:

**Option 1: Automatyczne połączenie (ŁATWIEJSZE):**

1. Zamiast ręcznie dodawać - kliknij **"Add from Database"**
2. Wybierz `bet-assistant-db`
3. Wybierz property: **"Internal Database URL"**
4. Name: `DATABASE_URL`
5. Kliknij **"Add"**

**Option 2: Manualne (jeśli Option 1 nie działa):**

```
Key: DATABASE_URL
Value: <skopiuj Internal Database URL z zakładki Info bazy>
```

### Krok 3: Dodaj pozostałe zmienne

Dodaj każdą zmienną klikając **"+ Add Environment Variable"**:

#### **Wymagane:**

```env
# Node Environment
NODE_ENV=production

# API Football
API_FOOTBALL_KEY=twoj-klucz-api-football

# n8n Webhook Security - WYGENERUJ NOWY!
N8N_WEBHOOK_KEY=<wygeneruj-ponizej>

# Port (Render ustawia automatycznie, ale dodaj fallback)
PORT=3000
```

#### **Opcjonalne (Email notifications):**

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=twoj-email@gmail.com
SMTP_PASS=haslo-aplikacji-gmail
EMAIL_FROM=twoj-email@gmail.com
EMAIL_TO=twoj-email@gmail.com
```

### Krok 4: Wygeneruj bezpieczny N8N_WEBHOOK_KEY

**WAŻNE:** Użyj NOWEGO klucza dla produkcji!

Lokalnie w PowerShell:
```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
$apiKey = [Convert]::ToBase64String($bytes)
Write-Host "Production N8N_WEBHOOK_KEY:"
Write-Host $apiKey
```

Skopiuj output i wklej jako wartość `N8N_WEBHOOK_KEY` w Render.

### Krok 5: Zapisz i redeploy

Po dodaniu wszystkich zmiennych:

1. Nie musisz klikać save - zmienne są auto-saved
2. Render **automatycznie zrestartuje** backend
3. Poczekaj ~1-2 minuty na redeploy

**✅ CHECKPOINT:** Wszystkie zmienne skonfigurowane

---

## Uruchomienie migracji {#migracje}

Backend potrzebuje tabel w PostgreSQL. Mamy 3 opcje:

### **Opcja A: Przez Render Shell (NAJŁATWIEJSZA)**

1. Backend service → zakładka **"Shell"** (lewe menu)
2. Kliknij **"Launch Shell"**
3. W terminalu wpisz:
   ```bash
   npx prisma migrate deploy
   ```
4. Poczekaj ~10-20 sekund
5. Powinieneś zobaczyć: `✓ Applied migration`

### **Opcja B: Lokalnie z Render DATABASE_URL**

```powershell
cd "d:\narzędzia\Bet Assistant 2.0"

# Skopiuj DATABASE_URL z Render (External URL!)
$env:DATABASE_URL="postgresql://betassistant:HASLO@dpg-xyz.frankfurt-postgres.render.com/betassistant"

# Uruchom migracje
npx prisma migrate deploy
```

### **Opcja C: Dodaj do Build Command**

Zmień Build Command w Render:

```bash
npm install && npx prisma generate && npx prisma migrate deploy
```

Render uruchomi migracje przy każdym deploy!

### Sprawdź czy działa

Po migracji, backend powinien mieć status **"Live"** (zielony)!

Otwórz w przeglądarce:
```
https://bet-assistant-backend.onrender.com
```

Jeśli widzisz **cokolwiek** (nawet błąd 404 "Cannot GET /") - działa! ✅

**✅ CHECKPOINT:** Backend live, baza z tabelami

---

## Konfiguracja n8n {#konfiguracja-n8n}

Teraz połączymy n8n z Twoim Render backend!

### Krok 1: Zainstaluj n8n (jeśli jeszcze nie masz)

Wybierz jedną opcję:

#### **Docker:**
```powershell
docker run -it --rm `
  --name n8n `
  -p 5678:5678 `
  -v n8n_data:/home/node/.n8n `
  n8nio/n8n
```

#### **npm:**
```powershell
npm install -g n8n
n8n start
```

Przejdź do: http://localhost:5678

### Krok 2: Dodaj zmienne środowiskowe w n8n

W n8n → **Settings** (⚙️) → **Environment Variables**:

1. **Kliknij "+ Add Variable"**
   - **Name:** `BET_ASSISTANT_API_URL`
   - **Value:** `https://bet-assistant-backend.onrender.com` (TWÓJ URL!)
   - Save

2. **Kliknij "+ Add Variable"**
   - **Name:** `BET_ASSISTANT_WEBHOOK_KEY`
   - **Value:** `<ten-sam-klucz-co-N8N_WEBHOOK_KEY-w-Render>`
   - Save

### Krok 3: Test połączenia

1. W n8n utwórz nowy workflow: `Test Render Connection`
2. Dodaj **Manual Trigger**
3. Dodaj **HTTP Request** node:
   - Method: GET
   - URL: `{{ $env.BET_ASSISTANT_API_URL }}/api/webhooks/n8n/health`
   - Headers:
     - Name: `x-n8n-api-key`
     - Value: `{{ $env.BET_ASSISTANT_WEBHOOK_KEY }}`

4. **Execute Workflow**

**Oczekiwany rezultat:**

```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-02-19T...",
  "checks": {
    "database": "ok",
    "apiFootballKey": "configured"
  }
}
```

**⚠️ Jeśli timeout lub błąd:**
- Backend może być "uśpiony" (cold start)
- Poczekaj 30-60 sekund i spróbuj ponownie
- Cold start występuje tylko po 15 min bezczynności

**✅ SUKCES!** n8n działa z Render! 🎉

---

## Testowanie {#testowanie}

### Test 1: Health check przez przeglądarkę

Otwórz:
```
https://bet-assistant-backend.onrender.com/api/webhooks/n8n/health
```

**Oczekiwane:** Błąd 401 (brak API key) - to OK!

### Test 2: Import przez n8n workflow

Zbuduj prosty workflow (według [TUTORIAL-KROK-PO-KROKU.md](TUTORIAL-KROK-PO-KROKU.md)):

1. Manual Trigger
2. Set node:
   - apiKey: `{{ $env.BET_ASSISTANT_WEBHOOK_KEY }}`
   - daysAhead: `1`
3. HTTP Request POST:
   - URL: `{{ $env.BET_ASSISTANT_API_URL }}/api/webhooks/n8n/import-matches`
   - Header: `x-n8n-api-key` = `{{ $json.apiKey }}`
   - Body: `{ "daysAhead": {{ $json.daysAhead }} }`

4. Execute!

Sprawdź logi w Render (zobacz poniżej).

### Test 3: Sprawdź bazę danych

#### Przez Render Shell:

1. Database service → **Shell**
2. Wpisz:
   ```sql
   \c betassistant
   SELECT COUNT(*) FROM matches;
   ```

Jeśli widzisz liczbę > 0 - mecze są zaimportowane! ✅

**✅ CHECKPOINT:** Wszystko działa w produkcji!

---

## Monitoring i logi {#monitoring}

### Zobacz logi w czasie rzeczywistym

1. Backend service → zakładka **"Logs"**
2. Zobaczysz output z `console.log()`:

```
2026-02-19 10:00:01 Starting match import...
2026-02-19 10:00:05 Imported 150 matches
2026-02-19 10:00:05 Import completed!
```

### Metryki

Render pokazuje:
- **Deployment Status** (Live/Building/Failed)
- **Last Deploy** (czas ostatniego deploy)
- **Response Time** (średni czas odpowiedzi)

Free tier **NIE MA** zaawansowanych metryk (CPU/RAM) - tylko płatne plany.

### Events

Zakładka **"Events"** pokazuje:
- Deploymenty
- Restarty
- Crashes
- Config changes

---

## Troubleshooting {#troubleshooting}

### Problem 1: "Service Unavailable" lub bardzo długi czas odpowiedzi

**Przyczyna:** Backend "uśpiony" (free tier sleep after 15 min inactivity)

**Rozwiązanie permanentne - Ping Workflow:**

Stwórz workflow w n8n:

1. **Schedule Trigger:** `*/10 * * * *` (co 10 minut)
2. **HTTP Request GET:** 
   - URL: `{{ $env.BET_ASSISTANT_API_URL }}/api/webhooks/n8n/health`
   - Header: `x-n8n-api-key`
3. **Active:** ON

To utrzyma backend "ciepły" 24/7! ✅

**Rozwiązanie tymczasowe:**
- Zwiększ timeout w n8n HTTP nodes: 60000 (60s)
- Pierwszy request po sleep trwa 30-60s (cold start)

---

### Problem 2: Build failed

**Sprawdź Logs** → Build Logs

**Typowe przyczyny:**
- Brakujące dependencies: `npm install` failed
- TypeScript errors
- Prisma generate failed

**Rozwiązanie:**

1. Napraw lokalnie:
   ```powershell
   npm install
   npm run lint
   npx prisma generate
   ```

2. Commit i push:
   ```powershell
   git add .
   git commit -m "Fix build"
   git push
   ```

3. Render automatycznie zredeploy!

---

### Problem 3: Application crashed / Exit code 1

**Sprawdź Logs** - szukaj błędów:

```
Error: Cannot find module '@prisma/client'
Error: DATABASE_URL is not set
Error: connect ECONNREFUSED
```

**Rozwiązania:**

**Brak Prisma Client:**
```bash
# Build Command powinien mieć:
npm install && npx prisma generate
```

**Brak DATABASE_URL:**
- Environment → sprawdź czy DATABASE_URL jest ustawione
- Manual restart: Service → "Manual Deploy" → "Clear build cache & deploy"

**Problem z połączeniem do bazy:**
- Sprawdź czy PostgreSQL service jest "Available"
- Użyj **Internal Database URL** (nie External!)

---

### Problem 4: Migrations failed

**Error:** `Migration engine error: Table already exists`

**Rozwiązanie:**

Render Shell:
```bash
# Reset migrations (OSTROŻNIE - usunie dane!)
npx prisma migrate reset --force

# LUB deploy od nowa:
npx prisma migrate deploy
```

---

### Problem 5: 401 Unauthorized mimo prawidłowego klucza

**Sprawdź:**

1. Czy `N8N_WEBHOOK_KEY` w Render = `BET_ASSISTANT_WEBHOOK_KEY` w n8n?
2. Czy n8n używa `{{ $env.BET_ASSISTANT_WEBHOOK_KEY }}`?
3. Restart backend: Service → "Manual Deploy" → "Deploy latest commit"

---

### Problem 6: Environment Variables nie działają

**Symptom:** Backend czyta stare wartości zmiennych

**Rozwiązanie:**

1. Render nie zawsze auto-restartuje po zmianie ENV
2. Ręczny restart:
   - Service → **"Manual Deploy"**
   - **"Deploy latest commit"**

---

### Problem 7: Free tier hours exceeded

**Render pokazuje:** "Service suspended - Free tier limit reached"

**Free tier:** 750h/miesiąc = ~25h/dzień

**To powinno wystarczyć!** Jeśli przekraczasz:

1. Sprawdź czy nie masz innych services na Render
2. Rozważ upgrade do Starter ($7/mies) - unlimited hours
3. LUB użyj innego providera jako backup

---

### Problem 8: Cold start za długi (>60s)

**Render free tier:** cold start może trwać 30-60s

**Opcje:**

1. **Ping workflow** (już opisany wyżej) - NAJLEPSZE
2. Upgrade do płatnego planu (brak sleep)
3. Zwiększ timeout w n8n: 90000 (90s)

---

### Problem 9: Database connection pool exhausted

**Error:** `Error: Too many connections`

**Przyczyna:** Prisma domyślnie otwiera wiele połączeń

**Rozwiązanie:**

Dodaj do `schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Render free tier limit
  relationMode = "prisma"
}

generator client {
  provider = "prisma-client-js"
  previewFeatures = ["relationJoins"]
  binaryTargets = ["native"]
}
```

Albo ograncz connection pool w kodzie:

```typescript
// server/config/prisma.config.ts
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?connection_limit=5'
    }
  }
});
```

Commit i push!

---

## 🎉 GRATULACJE!

### Co osiągnąłeś:

✅ **Backend działa 24/7 w chmurze** (Render.com)  
✅ **PostgreSQL managed database** z 90-dniowymi backupami  
✅ **Publiczny HTTPS endpoint** dla n8n  
✅ **Zero kosztów** - prawdziwie darmowy tier (BEZ KARTY!)  
✅ **Automatyczne deploymenty** z GitHub  
✅ **Monitoring i logi** w dashboard  

### Teraz możesz:

🤖 **Wyłączyć komputer** - automatyzacja działa!  
🌍 **Dostęp z dowolnego miejsca** przez HTTPS  
📊 **Monitorować** logi w czasie rzeczywistym  
🔄 **Auto-deploy** - push do Git = automatyczny redeploy  

---

## 📚 Dalsze kroki

### 1. Zbuduj workflows w n8n

Przejdź do: [TUTORIAL-KROK-PO-KROKU.md](TUTORIAL-KROK-PO-KROKU.md)

Zbuduj:
- ⏰ Codzienny import meczów (10:00)
- 🔄 Aktualizacja wyników (00:01)
- 💾 Backup bazy (00:00)
- 📊 Monitoring (co 15 min)
- ❤️ Keep-alive ping (co 10 min) - **WAŻNE dla free tier!**

### 2. Optymalizacje

**Custom Domain (opcjonalnie):**
1. Render → Service → Settings → Custom Domain
2. Dodaj swoją domenę (np. `api.betassistant.pl`)
3. Zaktualizuj DNS (Render poda instrukcje)

**Auto-deploy:**
- Już działa! Push do `main` branch = auto redeploy ✅

**Healthcheck endpoint:**
Render używa `/` do healthchecks. Możesz zmienić:
- Service → Settings → Health Check Path → `/api/webhooks/n8n/health`

### 3. Monitoring zaawansowany

**Uptime Robot (darmowe, sprawdza czy działa):**
1. https://uptimerobot.com
2. Dodaj monitor: `https://bet-assistant-backend.onrender.com/api/webhooks/n8n/health`
3. Interval: 5 minut
4. Dostaniesz email jeśli backend padnie

**BetterStack / Logtail (opcjonalnie):**
- Długoterminowe log retention
- Render trzyma logi tylko 7 dni (free tier)

---

## 💰 Koszty i limity

### Free Tier - na zawsze darmowy:

✅ **750 godzin/miesiąc** (~25h/dzień)  
✅ **512 MB RAM** per service  
✅ **PostgreSQL z backupami** (90 dni retention)  
✅ **Automatic SSL**  
✅ **100 GB bandwidth** (egress)  
✅ **Shared CPU**  

⚠️ **Ograniczenia:**
- Sleep po 15 min inactivity (cold start ~30s)
- 7 dni log retention
- Shared resources (może być wolniejsze)

### Jeśli potrzebujesz więcej:

**Starter: $7/miesiąc:**
- ✅ **No sleep** - zawsze aktywny!
- ✅ Więcej RAM/CPU
- ✅ 30-day log retention
- ✅ Faster builds

**Dla Bet Assistant free tier WYSTARCZY** z ping workflow!

---

## ❓ FAQ

**Q: Czy muszę mieć komputer włączony?**  
**A:** NIE! Render działa w chmurze 24/7.

**Q: Co to cold start?**  
**A:** Free tier: backend "zasypia" po 15 min. Pierwszy request trwa 30-60s. Rozwiązanie: ping workflow co 10 min.

**Q: Jak sprawdzić ile hours zostało?**  
**A:** Dashboard → Account Settings → Usage (na koniec miesiąca resetuje się)

**Q: Backupy bazy?**  
**A:** Render robi snapshoty automatycznie (90 dni). Możesz też eksportować:
   ```bash
   # Render Shell w PostgreSQL service:
   pg_dump -Fc betassistant > backup.dump
   ```

**Q: Jak zmienić kod i zredeploy?**  
**A:** 
   ```powershell
   git add .
   git commit -m "Update code"
   git push
   # Render auto-redeploy!
   ```

**Q: Czy mogę używać Render + lokalnego n8n?**  
**A:** TAK! n8n lokalnie wywołuje Render backend przez HTTPS.

**Q: Co jeśli przekroczę 750h?**  
**A:** Service zostanie wstrzymany do nowego miesiąca. Upgrade do $7/mies jeśli potrzebujesz.

**Q: Logs dostępne jak długo?**  
**A:** 7 dni (free tier). Dla długoterminowych użyj Logtail/Papertrail.

**Q: Czy Render jest stabilny?**  
**A:** TAK! Używany przez tysiące projektów. Uptime >99.9%.

---

## 🆚 Render vs Railway

| Feature | Render (Free) | Railway (Trial) |
|---------|---------------|-----------------|
| **Koszt** | $0 na zawsze | Trial → płatne |
| **Karta kredytowa** | NIE ❌ | TAK ✅ |
| **Hours/miesiąc** | 750h (~25h/dzień) | 500h (trial) |
| **Sleep** | Po 15 min | Po 15 min |
| **PostgreSQL** | ✅ Darmowy | ✅ Darmowy (trial) |
| **Auto-deploy z Git** | ✅ | ✅ |
| **Cold start** | ~30-60s | ~30s |
| **RAM** | 512 MB | 512 MB - 1 GB |
| **Backupy DB** | 90 dni | Auto snapshots |
| **Logs retention** | 7 dni | 24h (free) |

**Verdict:** Render WYGRYWA dla prawdziwie darmowego tier! 🏆

---

## 🔗 Przydatne linki

- **Render Docs:** https://render.com/docs
- **Render Discord:** https://discord.gg/render
- **PostgreSQL Guide:** https://render.com/docs/databases
- **Troubleshooting:** https://render.com/docs/troubleshooting

---

**Gotowy na deployment?** Zaczynaj od kroku [Przygotowanie projektu](#przygotowanie)! 🚀

**Potrzebujesz pomocy?** Sprawdź sekcję [Troubleshooting](#troubleshooting) lub pisz do mnie!
