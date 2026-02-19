# 🚂 Railway.app Deployment - Krok Po Kroku

**Cel:** Wdrożenie Bet Assistant 2.0 backendu w chmurze Railway.app (DARMOWE 500h/mies)

**Czas:** ~30-45 minut  
**Koszt:** $0/miesiąc (free tier wystarczy!)  
**Efekt:** Backend + PostgreSQL działają 24/7, nawet gdy Twój komputer jest wyłączony

---

## 📚 Spis treści

1. [Czym jest Railway?](#czym-jest-railway)
2. [Przygotowanie projektu](#przygotowanie)
3. [Utworzenie konta Railway](#konto-railway)
4. [Deploy PostgreSQL](#deploy-postgres)
5. [Deploy backendu](#deploy-backend)
6. [Konfiguracja zmiennych środowiskowych](#env-variables)
7. [Konfiguracja n8n](#konfiguracja-n8n)
8. [Testowanie](#testowanie)
9. [Monitoring i logi](#monitoring)
10. [Troubleshooting](#troubleshooting)

---

## Czym jest Railway? {#czym-jest-railway}

**Railway.app** to platforma cloud PaaS (Platform as a Service) do hostowania aplikacji.

### Dlaczego Railway?

✅ **500 godzin darmowo** miesięcznie (free tier)  
✅ **Łatwy deploy** z GitHub/GitLab lub lokalnie  
✅ **Managed PostgreSQL** (bez konfiguracji)  
✅ **Automatyczne SSL** (HTTPS)  
✅ **Darmowe buildy**  
✅ **Logs i monitoring** w przeglądarce  
✅ **Zero DevOps** - wszystko skonfigurowane automatycznie

### Co będziemy hostować?

```
┌─────────────────────────────────────┐
│         RAILWAY.APP (Cloud)         │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  PostgreSQL Database         │  │ ← Twoja baza danych
│  │  (Managed, automatyczne       │  │
│  │   backupy)                    │  │
│  └──────────────────────────────┘  │
│              ▲                      │
│              │                      │
│  ┌───────────┴──────────────────┐  │
│  │  Bet Assistant Backend       │  │ ← Twój serwer Express
│  │  (Node.js + Express)         │  │
│  │  Publiczny URL:              │  │
│  │  https://bet-assistant.      │  │
│  │  up.railway.app              │  │
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

Jeśli widzisz odpowiedź (nawet 401 Unauthorized) - OK! ✅

### Krok 2: Dodaj script startowy dla produkcji

Railway potrzebuje productionstartowego skryptu. Dodamy go do `package.json`:

Otwórz `package.json` i **dodaj** nowy script `start`:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview",
  "lint": "tsc --noEmit",
  "server": "nodemon --exec npx tsx server/league-config-server.ts",
  "server:worker": "npx tsx server/background-import-worker.ts",
  "start": "npx tsx server/league-config-server.ts",  ← DODAJ TĘ LINIĘ
  "db:generate": "prisma generate",
  "db:studio": "prisma studio",
  "db:migrate": "prisma migrate dev"
},
```

**Zapisz plik!**

### Krok 3: Stwórz plik `.railwayignore` (opcjonalnie)

To przyspieszy deploy - ignorujemy niepotrzebne pliki:

```powershell
cd "d:\narzędzia\Bet Assistant 2.0"
New-Item -ItemType File -Name ".railwayignore"
```

Otwórz `.railwayignore` i dodaj:

```
node_modules/
.git/
dist/
src/
stary/
backups/
Dokumentacja/
files/
logs/
*.md
.env.local
.vscode/
```

### Krok 4: Upewnij się że masz Git repo (WAŻNE!)

Railway może deployować z Git lub lokalnie. Git jest prostszy:

```powershell
cd "d:\narzędzia\Bet Assistant 2.0"

# Jeśli nie masz Git repo, inicjalizuj:
git init

# Dodaj wszystko (oprócz .gitignore):
git add .
git commit -m "Prepare for Railway deployment"
```

**✅ CHECKPOINT:** Masz dodany `start` script w package.json i projekt w Git

---

## Utworzenie konta Railway {#konto-railway}

### Krok 1: Zarejestruj się

1. Przejdź na: https://railway.app/
2. Kliknij **"Start a New Project"** lub **"Login"**
3. Zarejestruj się przez:
   - **GitHub** (ZALECANE - łatwiejszy deploy)
   - **Google**
   - **Email**

### Krok 2: Weryfikuj konto

Railway wymaga weryfikacji - **NIE POTRZEBUJESZ KARTY KREDYTOWEJ** dla free tier!

- Jeśli zalogowałeś się przez GitHub - automatycznie zweryfikowane ✅
- Jeśli przez email - sprawdź skrzynkę

### Krok 3: Zapoznaj się z Dashboard

```
┌──────────────────────────────────────────────────────┐
│  Railway Dashboard                              👤   │
├──────────────────────────────────────────────────────┤
│                                                       │
│  [+ New Project]  ← Tutaj zaczniemy                  │
│                                                       │
│  Your Projects:                                       │
│  (pusty jeśli nowe konto)                            │
│                                                       │
│                                                       │
│  Free Tier: 500 hours remaining this month           │
│  $0.00 usage                                         │
│                                                       │
└──────────────────────────────────────────────────────┘
```

**✅ CHECKPOINT:** Masz konto Railway i widzisz dashboard

---

## Deploy PostgreSQL {#deploy-postgres}

### Krok 1: Utwórz nowy projekt

1. Kliknij **"+ New Project"**
2. Wybierz **"Provision PostgreSQL"**
3. Railway automatycznie stworzy bazę danych!

**Poczekaj ~30 sekund** aż status = "Active" (zielony)

### Krok 2: Zobacz DATABASE_URL

1. Kliknij na **"PostgreSQL"** service (w projekcie)
2. Zakładka **"Variables"**
3. Zobacz zmienną **`DATABASE_URL`**

Będzie wyglądać tak:
```
postgresql://postgres:haslo@containers-us-west-xyz.railway.app:1234/railway
```

**NIE KOPIUJ JESZCZE** - Railway automatycznie podłączy to do backendu! ✅

### Krok 3: Opcjonalnie - Połącz się z bazą lokalnie (test)

Jeśli chcesz sprawdzić czy działa:

```powershell
# Zainstaluj Prisma Studio globalnie (jeśli nie masz)
npm install -g prisma

# Skopiuj DATABASE_URL z Railway
$env:DATABASE_URL="postgresql://postgres:haslo@..."

# Uruchom migracje
cd "d:\narzędzia\Bet Assistant 2.0"
npx prisma migrate deploy

# Otwórz Prisma Studio
npx prisma studio
```

Jeśli widzisz puste tabele - **SUKCES!** Baza działa w chmurze.

**✅ CHECKPOINT:** PostgreSQL działa na Railway

---

## Deploy Backendu {#deploy-backend}

### Krok 1: Dodaj service do projektu

W tym samym Railway project:

1. Kliknij **"+ New Service"**
2. Wybierz **"GitHub Repo"** (jeśli masz projekt na GitHub)
   
   **LUB**
   
   Wybierz **"Empty Service"** → potem deploy z CLI

### Opcja A: Deploy z GitHub (ŁATWIEJSZE)

#### A1: Połącz GitHub

1. Railway poprosi o dostęp do GitHub - kliknij **"Authorize"**
2. Wybierz swoje **bet-assistant-2.0** repo
3. Branch: **main** lub **master**
4. Railway automatycznie wykryje że to Node.js projekt! ✅

#### A2: Poczekaj na build

Railway:
- Zainstaluje npm dependencies
- Uruchomi `npm start` (dlatego dodałeś ten script!)
- Zbuduje aplikację

**Status:** Build logs → Deploy logs → "Active"

### Opcja B: Deploy z CLI (jeśli nie masz GitHub)

#### B1: Zainstaluj Railway CLI

```powershell
# Przez npm:
npm install -g @railway/cli

# Sprawdź instalację:
railway --version
```

#### B2: Login do Railway

```powershell
railway login
```

Otworzy przeglądarkę - zaloguj się.

#### B3: Link do projektu

```powershell
cd "d:\narzędzia\Bet Assistant 2.0"

# Link do istniejącego projektu Railway:
railway link

# Wybierz swój project z listy
```

#### B4: Deploy!

```powershell
railway up
```

Railway prześle pliki i zdeployuje backend.

**✅ CHECKPOINT:** Backend jest w procesie deploy

### Krok 2: Skonfiguruj Start Command

Railway powinien automatycznie wykryć `npm start`, ale sprawdźmy:

1. Kliknij na **backend service** (w Railway dashboard)
2. **Settings** tab
3. Sekcja **"Deploy"**
4. **Start Command:** `npm start`
5. **Watch Paths:** `server/**` (opcjonalnie - auto-redeploy gdy zmienisz kod)

### Krok 3: Włącz Public URL

Backend musi być dostępny publicznie dla n8n:

1. W backend service → **Settings**
2. Sekcja **"Networking"**
3. Kliknij **"Generate Domain"**

Railway utworzy URL typu:
```
https://bet-assistant-production-xyz.up.railway.app
```

**SKOPIUJ TEN URL!** Będziesz go potrzebować dla n8n.

**✅ CHECKPOINT:** Backend ma publiczny URL

---

## Konfiguracja zmiennych środowiskowych {#env-variables}

### Krok 1: Przejdź do Variables

1. Backend service → **Variables** tab
2. Zobaczysz już **`DATABASE_URL`** (automatycznie podłączona!)

### Krok 2: Dodaj pozostałe zmienne z .env

Otwórz lokalny `.env` i skopiuj wartości. W Railway dodaj każdą zmienną:

#### Wymagane zmienne:

```env
# API Football
API_FOOTBALL_KEY=twoj-klucz-api-football

# n8n Webhook Security
N8N_WEBHOOK_KEY=<wygeneruj-nowy-bezpieczny-klucz>

# Node Environment
NODE_ENV=production

# Port (Railway ustawi automatycznie, ale możesz dodać fallback)
PORT=3000
```

#### Opcjonalne (dla email notifications):

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=twoj-email@gmail.com
SMTP_PASS=haslo-aplikacji
EMAIL_FROM=twoj-email@gmail.com
EMAIL_TO=twoj-email@gmail.com
```

### Krok 3: Wygeneruj nowy N8N_WEBHOOK_KEY

**WAŻNE:** Użyj nowego klucza dla produkcji (bezpieczeństwo!)

Lokalnie w PowerShell:
```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
$apiKey = [Convert]::ToBase64String($bytes)
Write-Host "Production API Key:"
Write-Host $apiKey
```

Skopiuj output i dodaj w Railway jako `N8N_WEBHOOK_KEY`.

### Krok 4: Dodaj zmienne w Railway UI

Dla każdej zmiennej:

1. Kliknij **"+ New Variable"**
2. **Variable Name:** (np. `API_FOOTBALL_KEY`)
3. **Value:** (wklej wartość)
4. Kliknij **"Add"**

Po dodaniu wszystkich kliknij **"Deploy"** (Railway automatycznie zrestartuje backend).

**✅ CHECKPOINT:** Wszystkie zmienne skonfigurowane

---

## Migracje bazy danych {#migracje}

### Krok 1: Uruchom migracje Prisma

Backend potrzebuje tabel w PostgreSQL. Mamy 2 opcje:

#### Opcja A: Z Railway CLI (lokalnie)

```powershell
cd "d:\narzędzia\Bet Assistant 2.0"

# Pobierz DATABASE_URL z Railway
railway variables

# Ustaw zmienną lokalnie (skopiuj DATABASE_URL z output powyżej)
$env:DATABASE_URL="postgresql://postgres..."

# Uruchom migracje
npm run db:generate
npx prisma migrate deploy
```

#### Opcja B: Dodaj build command w Railway

1. Backend service → **Settings**
2. **"Build Command":** 
   ```
   npm install && npx prisma generate && npx prisma migrate deploy
   ```

Railway uruchomi migracje przy każdym deploy! ✅

**✅ CHECKPOINT:** Tabele utworzone w Railway PostgreSQL

---

## Konfiguracja n8n {#konfiguracja-n8n}

Teraz połączymy n8n (lokalnie lub w chmurze) z Railway backend.

### Krok 1: Zaktualizuj n8n Environment Variables

W n8n (Settings → Environment Variables):

1. **Dodaj/zmień:**
   - **Name:** `BET_ASSISTANT_API_URL`
   - **Value:** `https://bet-assistant-production-xyz.up.railway.app` (Twój Railway URL)

2. **Dodaj/zmień:**
   - **Name:** `BET_ASSISTANT_WEBHOOK_KEY`
   - **Value:** (ten sam klucz co `N8N_WEBHOOK_KEY` w Railway)

### Krok 2: Zaktualizuj workflows

Otwórz każdy workflow (Import, Update, Backup, Monitoring) i **zmień URL**:

**STARE (lokalne):**
```
http://localhost:3000/api/webhooks/n8n/import-matches
```

**NOWE (Railway):**
```
https://bet-assistant-production-xyz.up.railway.app/api/webhooks/n8n/import-matches
```

**LUB lepiej - użyj zmiennej:**
```
{{ $env.BET_ASSISTANT_API_URL }}/api/webhooks/n8n/import-matches
```

### Krok 3: Test połączenia

1. W n8n otwórz workflow **"Test - Połączenie z API"**
2. Zmień URL na Railway:
   ```
   {{ $env.BET_ASSISTANT_API_URL }}/api/webhooks/n8n/health
   ```
3. **Execute Workflow**

Powinieneś zobaczyć:
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

**✅ SUKCES!** n8n łączy się z Railway backend! 🎉

---

## Testowanie {#testowanie}

### Test 1: Health Check przez przeglądarkę

Otwórz w przeglądarce:
```
https://bet-assistant-production-xyz.up.railway.app/api/webhooks/n8n/health
```

**Oczekiwane:** Błąd 401 (brak API key) - to OK! Znaczy że endpoint działa.

### Test 2: Import przez n8n

1. W n8n otwórz workflow **"Codzienny Import Meczów"**
2. Zmień trigger na **Manual** (tymczasowo)
3. Ustaw URL z Railway
4. **Execute Workflow**
5. Sprawdź logi w Railway (zobacz poniżej)

### Test 3: Sprawdź bazę danych

#### Przez Prisma Studio:

```powershell
$env:DATABASE_URL="<railway-database-url>"
npx prisma studio
```

Sprawdź tabelę `matches` - powinny być zaimportowane mecze!

**✅ CHECKPOINT:** Wszystko działa w produkcji!

---

## Monitoring i logi {#monitoring}

### Zobacz logi w czasie rzeczywistym

1. Railway Dashboard → Backend service
2. Zakładka **"Deployments"**
3. Kliknij najnowszy deployment
4. **"View Logs"**

Zobaczysz output z `console.log()` Twojego backendu:
```
[2026-02-19 10:00:01] Starting match import...
[2026-02-19 10:00:05] Imported 150 matches for tomorrow
[2026-02-19 10:00:05] Import completed successfully!
```

### Metryki

Railway pokazuje:
- **CPU usage** (powinno być <20%)
- **Memory** (Node.js ~200-500 MB)
- **Network** (requesty)
- **Deployment status**

### Alerty

Możesz skonfigurować powiadomienia:
1. Project Settings → **"Notifications"**
2. Dodaj Slack/Discord webhook
3. Wybierz eventy: Deployment failed, Service crashed, itp.

---

## Troubleshooting {#troubleshooting}

### Problem 1: Build failed

**Sprawdź logs:**
- Railway Dashboard → Deployments → Failed deployment → View Logs

**Typowe przyczyny:**
- Brakujące dependencies w `package.json`
- Błąd TypeScript (uruchom `npm run lint` lokalnie)
- Brak `start` script w package.json

**Rozwiązanie:**
```powershell
# Lokalnie napraw błędy:
npm install
npm run lint

# Commit i push:
git add .
git commit -m "Fix build errors"
git push

# Railway automatycznie zredeploy!
```

### Problem 2: Application crashed

**Sprawdź logs** - szukaj błędów:
```
Error: connect ECONNREFUSED (baza nie działa)
Error: API_FOOTBALL_KEY is not defined
```

**Rozwiązanie:**
- Sprawdź czy wszystkie zmienne środowiskowe są ustawione
- Sprawdź czy PostgreSQL service jest "Active"
- Sprawdź czy `DATABASE_URL` jest połączona

### Problem 3: Timeout w n8n workflows

**Przyczyna:** Railway free tier może mieć cold start (~30s gdy backend śpi)

**Rozwiązanie tymczasowe:**
- Zwiększ timeout w n8n HTTP Request node: 60000 (60s)

**Rozwiązanie długoterminowe:**
- Dodaj "Ping" workflow w n8n który wywołuje `/health` co 10 min (utrzymuje backend "ciepły")

### Problem 4: 401 Unauthorized mimo prawidłowego klucza

**Sprawdź:**
1. Czy `N8N_WEBHOOK_KEY` w Railway = `BET_ASSISTANT_WEBHOOK_KEY` w n8n?
2. Czy n8n używa `{{ $env.BET_ASSISTANT_WEBHOOK_KEY }}` w headerze?
3. Czy Railway zrestartował backend po dodaniu zmiennych?

**Fix:**
```powershell
# W Railway → Backend service → Variables
# Usuń i dodaj ponownie N8N_WEBHOOK_KEY
# Kliknij "Restart"
```

### Problem 5: Migracje nie działają

**Error:** `Table 'matches' doesn't exist`

**Rozwiązanie:**
```powershell
# Lokalnie z Railway DATABASE_URL:
$env:DATABASE_URL="<railway-db-url>"
npx prisma migrate deploy

# Albo dodaj do Railway Build Command:
npm install && npx prisma generate && npx prisma migrate deploy && npm start
```

### Problem 6: Free tier hours exceeded

**Railway pokazuje:** "503 Service Unavailable" lub "Exceeded free tier"

**Rozwiązanie:**
- Sprawdź usage: Dashboard → Project → Usage
- 500h/miesiąc = ~16h/dzień - powinno wystarczyć!
- Jeśli przekraczasz - rozważ upgrade do Developer plan ($5/mies unlimited hours)

### Problem 7: Cannot reach Railway URL from n8n

**Test połączenia:**
```powershell
curl https://bet-assistant-production-xyz.up.railway.app/api/webhooks/n8n/health
```

**Jeśli działa lokalnie ale nie w n8n:**
- Sprawdź firewall n8n (jeśli self-hosted)
- Sprawdź czy n8n.cloud ma dostęp do internetu
- Sprawdź czy URL w workflow jest prawidłowy (bez spacji, typos)

---

## 🎉 GRATULACJE!

### Co osiągnąłeś:

✅ **Backend działa 24/7 w chmurze** (Railway.app)  
✅ **PostgreSQL managed database** (automatyczne backupy)  
✅ **Publiczny HTTPS endpoint** dla n8n  
✅ **Zero kosztów** (free tier 500h/mies)  
✅ **Automatyczne deploymenty** (push do Git = redeploy)  
✅ **Monitoring i logi** w przeglądarce  

### Teraz możesz:

🤖 **Wyłączyć komputer** - automatyzacja działa nadal!  
🌍 **Dostęp z dowolnego miejsca** przez HTTPS  
📊 **Monitorować** logi i metryki w Railway  
🚀 **Skalować** jeśli potrzebujesz (upgrade plan)  

---

## 📚 Dalsze kroki

### Optymalizacje:

1. **Dodaj Custom Domain** (Railway Settings → Custom Domain)
   - Możesz użyć własnej domeny zamiast `*.up.railway.app`

2. **Skonfiguruj automatyczne deploymenty**
   - Railway → Settings → GitHub Integration → Auto-deploy on push

3. **Dodaj PM2 dla restart policy** (opcjonalnie)
   ```json
   // ecosystem.config.json
   {
     "apps": [{
       "name": "bet-assistant",
       "script": "server/league-config-server.ts",
       "instances": 1,
       "autorestart": true,
       "watch": false,
       "max_memory_restart": "500M"
     }]
   }
   ```

4. **Backup bazy automatyczny**
   - Railway robi snapshoty, ale możesz dodać własny backup:
   - n8n workflow → `pg_dump` → Google Drive

### Monitoring zaawansowany:

1. **Dodaj Uptime Robot** (darmowe, sprawdza co 5 min czy działa)
   - https://uptimerobot.com
   - Monitor URL: `https://twoj-backend.up.railway.app/api/webhooks/n8n/health`

2. **Sentry dla error tracking** (opcjonalnie)
   ```bash
   npm install @sentry/node
   ```

3. **Prometheus + Grafana** (jeśli chcesz advanced metrics)

---

## 💰 Koszty i limity

### Free Tier (Trial):

- ✅ **500 godzin wykonywania** miesięcznie
- ✅ **$5 kredytu** (egress, storage)
- ✅ **1 GB RAM** per service
- ✅ **1 GB storage** dla PostgreSQL
- ✅ **100 GB egress** (transfer danych)

**Dla Bet Assistant to wystarczy:** ~16h/dzień, backend + DB używają ~500-700 MB RAM

### Jeśli potrzebujesz więcej:

**Developer Plan: $5/miesiąc**
- ✅ **Unlimited hours**
- ✅ **$5 usage included**
- ✅ **Więcej RAM/CPU**

**Typowy koszt Bet Assistant:** $0-2/mies (często mieści się w free tier!)

---

## ❓ FAQ

**Q: Czy muszę mieć komputer włączony?**  
**A:** NIE! Railway działa w chmurze 24/7.

**Q: Co się stanie gdy przekroczę 500h?**  
**A:** Railway wstrzyma services. Upgrade do $5/mies lub poczekaj do nowego miesiąca.

**Q: Jak sprawdzić ile hours zostało?**  
**A:** Dashboard → Usage → Hours remaining this month

**Q: Czy mogę używać Railway + lokalnego n8n?**  
**A:** TAK! n8n lokalnie może wywoływać Railway backend przez HTTPS.

**Q: Backupy bazy?**  
**A:** Railway robi snapshoty automatycznie. Możesz też eksportować:
```powershell
railway run pg_dump -f backup.sql
```

**Q: Jak zmienić kod i zredeploy?**  
**A:** 
```powershell
# Zmień kod lokalnie
git add .
git commit -m "Update"
git push
# Railway automatycznie redeploy!
```

**Q: Logs dostępne jak długo?**  
**A:** Railway trzyma logi ~24h. Dla długoterminowych użyj zewnętrznego loggera (Papertrail, Logtail).

---

**Potrzebujesz pomocy?** Sprawdź:
- [Railway Docs](https://docs.railway.app/)
- [Railway Discord](https://discord.gg/railway)
- [TUTORIAL-KROK-PO-KROKU.md](TUTORIAL-KROK-PO-KROKU.md) - n8n setup

**Gotowy na automatyzację 24/7!** 🚀

<function_calls>
<invoke name="read_file">
<parameter name="filePath">d:\narzędzia\Bet Assistant 2.0\server\package.json
