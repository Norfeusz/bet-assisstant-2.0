# 📘 n8n - Tworzenie Workflows OD ZERA (Wersja FREE)

**Data:** 24 lutego 2026  
**Wersja:** 1.0 - Manual Setup  
**Status:** Tymczasowy przewodnik (do usunięcia po konfiguracji)  
**Cel:** Nauka tworzenia workflows n8n bez gotowych importów

---

## ⚠️ UWAGA: n8n FREE - Brak Environment Variables

W wersji **FREE n8n nie ma funkcji Variables**. Wszystkie klucze API i URLe będą **wpisane bezpośrednio w nodes**.

---

## PRZYGOTOWANIE: Pobierz klucz API z Render

```bash
# 1. Zaloguj się do Render Dashboard:
https://dashboard.render.com

# 2. Przejdź do:
bet-assistant-backend → Environment (lewa kolumna)

# 3. Znajdź zmienną: N8N_WEBHOOK_KEY

# 4. Skopiuj wartość (długi string typu: "abc123def456...")
   ⚠️ Zapisz w notatniku! Będzie potrzebny w każdym workflow

# 5. Backend URL (zapamiętaj):
https://bet-assistant-backend.onrender.com
```

---

## WORKFLOW 1: Keep-Alive - Render Worker (KRYTYCZNY!)

**Cel:** Budzi Render co 10 minut w wybranych godzinach (10-16, 20-03 czasu POLSKIEGO)

### Krok 1: Stwórz nowy workflow

```bash
# W n8n UI (http://localhost:5678):

1. Workflows → Kliknij "+ Add workflow" (góra ekranu)
2. Zmień nazwę: "Keep-Alive - Render Worker"
3. Kliknij "Save"
```

### Krok 2: Dodaj Schedule Trigger

```bash
# W canvas (puste białe pole):

1. Kliknij "+" (lub kliknij gdziekolwiek w canvas)
2. W search bar wpisz: "schedule"
3. Wybierz: "Schedule Trigger"

# Konfiguracja Schedule Trigger:

4. W panelu po prawej:
   - Mode: wybierz "Custom"
   - Value: wpisz dokładnie:
     */10 4-10,14-21 * * *
   
   ⏰ (Co 10 minut, godziny: 10-16 i 20-03 czasu POLSKIEGO)
   📍 n8n używa timezone America/New_York, więc:
      4-10 NY = 10-16 PL (Europe/Warsaw)
      14-21 NY = 20-03 PL (Europe/Warsaw)

5. NIE zamykaj panelu - node jest gotowy
```

**Co to robi:** Uruchamia workflow automatycznie co 10 min w aktywnych godzinach (390h/miesiąc = 52% Render Free Tier).

### Krok 3: Dodaj HTTP Request - Health Check

```bash
# W canvas:

1. Kliknij małą kropkę po prawej stronie node "Schedule Trigger"
2. Przeciągnij do pustego miejsca (pojawi się lista nodes)
3. W search wpisz: "http request"
4. Wybierz: "HTTP Request"

# Konfiguracja HTTP Request:

5. W panelu po prawej:
   
   Method: GET
   
   URL: https://bet-assistant-backend.onrender.com/api/webhooks/n8n/health
   
   Authentication: None (wyłącz jeśli zaznaczone)
   
6. Zjedź niżej → rozwij sekcję "Options"
   
   Timeout: 30000
   (30 sekund - daje czas na cold start Render)

7. Zjedź niżej → rozwij sekcję "Headers"
   
   Kliknij "Add Header"
   
   Name: x-n8n-api-key
   Value: <WKLEJ TUTAJ KLUCZ Z RENDER N8N_WEBHOOK_KEY>
   
   (Przykład: abc123def456... - twój prawdziwy klucz bez cudzysłowów)

8. Zmień nazwę node (góra panelu): "Health Check Render"

9. Kliknij poza panelem aby zamknąć
```

**Co to robi:** Wysyła GET request do Render backendu co 10 min, budząc serwer jeśli śpi.

### Krok 4: Testuj i aktywuj

```bash
# Test przed aktywacją:

1. Kliknij "Test workflow" (góra ekranu)
2. Czekaj 10-30 sekund (cold start jeśli Render śpi)
3. Powinieneś zobaczyć:
   - Zielony znacznik ✓ na "Schedule Trigger"
   - Zielony znacznik ✓ na "Health Check Render"
4. Kliknij node "Health Check Render" → sprawdź Output:
   {
     "success": true,
     "message": "Webhook endpoint is healthy",
     "database": "connected",
     "timestamp": "..."
   }

# Jeśli test OK:

5. Kliknij "Save" (góra ekranu)

6. ⚠️ KRYTYCZNE: Kliknij przełącznik "Inactive" → zmieni się na "Active" (zielony)

7. Workflow działa! Pierwsza automatyczna egzekucja nastąpi w najbliższym słocie czasowym.
```

**✅ WORKFLOW 1 GOTOWY** - Render będzie buzowany co 10 min w godzinach 10-16, 20-03 (czas polski).

---

## WORKFLOW 2: Manual Wake Worker

**Cel:** Manual trigger do budzenia Render + sprawdzania statusu jobuów (poza harmonogramem Keep-Alive).

### Krok 1: Stwórz nowy workflow

```bash
1. Workflows → "+ Add workflow"
2. Nazwa: "Manual Wake Worker"
3. Save
```

### Krok 2: Dodaj Manual Trigger

```bash
1. Kliknij "+" w canvas
2. Wpisz: "manual trigger"
3. Wybierz: "Manual Trigger"
4. Node gotowy (nie wymaga konfiguracji)
```

### Krok 3: Dodaj HTTP Request - Wake Backend

```bash
1. Przeciągnij z "Manual Trigger" → dodaj "HTTP Request"

# Konfiguracja:

Method: GET

URL: https://bet-assistant-backend.onrender.com/api/webhooks/n8n/health

Authentication: None

Options → Timeout: 60000
(60 sekund - dajemy więcej czasu na cold start przy manual wake)

Headers → Add Header:
  Name: x-n8n-api-key
  Value: <TWÓJ_KLUCZ_Z_RENDER>

Nazwa node: "Wake Backend"
```

### Krok 4: Dodaj HTTP Request - Check Jobs Status

```bash
1. Przeciągnij z "Wake Backend" → dodaj "HTTP Request"

# Konfiguracja:

Method: GET

URL: https://bet-assistant-backend.onrender.com/api/webhooks/n8n/import-jobs/status

Authentication: None

Options → Timeout: 30000

Headers → Add Header:
  Name: x-n8n-api-key
  Value: <TWÓJ_KLUCZ_Z_RENDER>

Nazwa node: "Check Pending Jobs"
```

### Krok 5: (Opcjonalne) Dodaj Code node - Format Summary

```bash
1. Przeciągnij z "Check Pending Jobs" → dodaj "Code"

# Konfiguracja:

Mode: Run Once for All Items

Language: JavaScript

Code: (wklej poniższy kod)
```

```javascript
// Format job status summary
const jobsData = $input.first().json;

const summary = {
  backend_status: "✅ Awake",
  total_jobs: (jobsData.running?.length || 0) + 
              (jobsData.rate_limited?.length || 0) + 
              (jobsData.pending?.length || 0),
  running: jobsData.running?.length || 0,
  rate_limited: jobsData.rate_limited?.length || 0,
  pending: jobsData.pending?.length || 0,
  details: jobsData
};

return [{ json: summary }];
```

```bash
Nazwa node: "Format Summary"

Kliknij poza panelem aby zamknąć
```

### Krok 6: Test workflow

```bash
1. Kliknij "Test workflow"
2. Czekaj 20-60 sekund
3. Wszystkie nodes powinny mieć ✓
4. Kliknij "Format Summary" (lub "Check Pending Jobs" jeśli nie dodałeś Code)
5. Sprawdź output - zobaczysz status jobów

6. Save workflow

7. NIE aktywuj (to manual trigger - używasz "Test workflow" gdy potrzebujesz)
```

**✅ WORKFLOW 2 GOTOWY** - Możesz teraz ręcznie budzić Render i sprawdzać joby.

---

## WORKFLOW 3: Daily Import Matches (PRODUKCJA)

**Cel:** Automatyczny codzienny import meczów o 15:00 (America/New_York).

### Krok 1: Stwórz workflow

```bash
1. "+ Add workflow"
2. Nazwa: "1. Daily Import Matches"
3. Save
```

### Krok 2: Dodaj Schedule Trigger

```bash
Method: Schedule Trigger

Cron: 0 15 * * *
(Codziennie o 15:00 America/New_York = 21:00 PL)
```

### Krok 3: Dodaj HTTP Request - Create Import Job

```bash
Method: POST

URL: https://bet-assistant-backend.onrender.com/api/webhooks/n8n/import-matches

Headers:
  x-n8n-api-key: <TWÓJ_KLUCZ>
  Content-Type: application/json

Body:
  Body Content Type: JSON
  
  JSON:
  {
    "daysAhead": 1,
    "async": true
  }

Options → Timeout: 30000

Nazwa: "Create Daily Import Job"
```

### Krok 4: Aktywuj

```bash
Save → Active

⚠️ UWAGA: Keep-Alive MUSI być aktywny przed aktywacją tego workflow!
```

---

## WORKFLOW 4: Daily Update Results (AUTOMATYCZNA AKTUALIZACJA)

**Cel:** Automatyczna aktualizacja wyników meczów z wczoraj o 01:01 czasu POLSKIEGO (19:01 NY).

### Krok 1: Stwórz workflow

```bash
1. "+ Add workflow"
2. Nazwa: "2. Daily Update Results"
3. Save
```

### Krok 2: Dodaj Schedule Trigger

```bash
1. Dodaj node: "Schedule Trigger"

# Konfiguracja:

Mode: Custom

Value: 1 19 * * *

⏰ To oznacza:
   - 19:01 America/New_York (n8n timezone)
   - = 01:01 Europe/Warsaw (czas polski)
   - Codziennie w nocy
```

**Czemu 19:01 NY?**
- Chcemy: 01:01 czasu polskiego (po zakończeniu wszystkich meczów)
- n8n timezone: America/New_York (+6h różnicy)
- 19:01 NY poprzedniego dnia = 01:01 PL następnego dnia ✓

### Krok 3: Dodaj HTTP Request - Update Results

```bash
1. Przeciągnij z "Schedule Trigger" → dodaj "HTTP Request"

# Konfiguracja:

Method: POST

URL: https://bet-assistant-backend.onrender.com/api/webhooks/n8n/update-results

Authentication: None

Headers:
  x-n8n-api-key: <TWÓJ_KLUCZ>
  Content-Type: application/json

Body:
  Body Content Type: JSON
  
  JSON:
  {
    "daysBack": 1,
    "async": true
  }

Options → Timeout: 60000
(60 sekund - dajemy czas na auto-detect lig i utworzenie jobu)

Nazwa node: "Update Yesterday Results"
```

**Co robi `daysBack: 1` i `async: true`:**
- Aktualizuje wyniki meczów z **wczoraj** (ostatnie 24h)
- Auto-wykrywa ligi z meczami w tym okresie
- Tworzy **async job** dla Background Workera (nie blokuje n8n request)
- Worker sprawdza tylko nieukończone mecze (`is_finished = 'no'`)
- Job wykonuje się w tle, n8n dostaje natychmiastowy response z `jobId`

### Krok 4: (Opcjonalne) Dodaj HTTP Request - Check Job Status

```bash
1. Przeciągnij z "Update Yesterday Results" → dodaj "HTTP Request"

# Konfiguracja:

Method: GET

URL: https://bet-assistant-backend.onrender.com/api/webhooks/n8n/import-jobs/status

Authentication: None

Headers:
  x-n8n-api-key: <TWÓJ_KLUCZ>

Options → Timeout: 15000

Nazwa node: "Check Job Status"
```

**Opcjonalnie:** Dodaj Code node do formatowania statusu jobów.

### Krok 5: (ZAMIAST Kroku 4) Albo dodaj Code node - Log Summary

**Jeśli nie dodawałeś Kroku 4**, możesz dodać prosty logger:

```bash
1. Przeciągnij z "Update Yesterday Results" → dodaj "Code"

# Konfiguracja:

Mode: Run Once for All Items

Language: JavaScript

Code:
```

```javascript
// Log async job creation
const response = $input.first().json;

const summary = {
  timestamp: new Date().toISOString(),
  job_id: response.jobId,
  job_type: response.job?.type || 'update_results',
  leagues_count: response.job?.leagues || 0,
  date_range: response.job?.dateRange,
  status: response.success ? "✅ Job Created" : "❌ Failed",
  check_url: response.checkStatusUrl
};

console.log('Daily Update Results Job:', summary);

return [{ json: summary }];
```

```bash
Nazwa node: "Log Job Created"
```

### Krok 6: Aktywuj workflow

```bash
1. Kliknij "Save"

2. Toggle "Inactive" → "Active" (zielony)

3. Workflow będzie wykonywany CODZIENNIE o 01:01 czasu polskiego
```

**✅ WORKFLOW 4 GOTOWY** - Wyniki meczów będą automatycznie aktualizowane każdej nocy o 01:01 PL.

---

## 🧪 Testowanie

### Test 1: Manual Wake Worker (PIERWSZY TEST)

```bash
1. Otwórz workflow "Manual Wake Worker"
2. Kliknij "Test workflow"
3. Czekaj 20-60 sekund
4. Sprawdź output wszystkich nodes

Oczekiwany rezultat:
✓ Wake Backend → status 200, message: "healthy"
✓ Check Pending Jobs → lista jobów (może być pusta)
✓ Format Summary → total_jobs: 0-X, backend_status: "✅ Awake"
```

**Jeśli błąd 401:**
- Sprawdź czy klucz API w header `x-n8n-api-key` jest poprawny
- Porównaj z Render Environment → N8N_WEBHOOK_KEY

**Jeśli timeout:**
- Render cold start może trwać do 60s
- Poczekaj 2 min i spróbuj ponownie

### Test 2: Keep-Alive (za 10 minut)

```bash
1. n8n → Executions
2. Za ~10 minut powinna pojawić się egzekucja "Keep-Alive"
3. Status: Success ✓
4. Duration: < 10s (jeśli backend nie spał)

Sprawdź Render logs:
Render Dashboard → bet-assistant-backend → Logs
Powinien być wpis: GET /api/webhooks/n8n/health 200
```

### Test 3: Daily Import (manual test)

```bash
1. Otwórz "1. Daily Import Matches"
2. Kliknij "Test workflow"
3. Sprawdź output "Create Daily Import Job"

Oczekiwany output:
{
  "success": true,
  "jobId": 347,
  "status": "Job created and queued",
  "message": "Import job created..."
}

4. Sprawdź Render logs - Background Worker powinien rozpocząć import
```

### Test 4: Daily Update Results (manual test)

```bash
1. Otwórz "2. Daily Update Results"
2. Kliknij "Test workflow"
3. Czekaj 5-15 sekund (szybka odpowiedź - tworzy tylko job)
4. Sprawdź output "Update Yesterday Results"

Oczekiwany output:
{
  "success": true,
  "async": true,
  "jobId": 348,
  "message": "Update-results job created successfully. Background worker will process it.",
  "checkStatusUrl": "/api/import-jobs/348",
  "job": {
    "id": 348,
    "status": "pending",
    "type": "update_results",
    "leagues": 8,
    "dateRange": { "from": "2026-02-23", "to": "2026-02-24" }
  }
}

5. Jeśli dodałeś "Log Job Created" node:
   - Kliknij node → Zobacz formatted summary z jobId

6. Sprawdź Render logs - Background Worker powinien rozpocząć update
   - Zobacz: "🔄 Processing job #348: update_results"

7. Po ~30-60 sekundach sprawdź status jobu:
   - Manual Wake Worker → Test workflow → Check Pending Jobs
   - Job #348 powinien mieć status "completed"
```

**Jeśli błąd "No matches found in date range":**
- To NORMAL jeśli wczoraj nie było żadnych meczów w twoich ligach ✓
- Próbuj ponownie w dniu gdy są mecze

**Jeśli błąd "No unfinished matches found":**
- To NORMAL jeśli wszystkie wczorajsze mecze już zakończone ✓
- Update działa poprawnie, po prostu nie było czego aktualizować

---

## 📊 Monitorowanie

### n8n Executions

```bash
n8n → Executions (ikona zegara)

Co sprawdzać:
- Keep-Alive: Egzekucje co 10 minut w godzinach 10-16, 20-03 PL
- Daily Import: Egzekucja codziennie o 15:00 NY (21:00 PL) → tworzy async job
- Daily Update Results: Egzekucja codziennie o 19:01 NY (01:01 PL) → tworzy async job
- Wszystkie z zielonym znaczkiem ✓
- Import i Update zwracają `jobId` w odpowiedzi

Czerwony X = błąd:
- Kliknij execution → Zobacz szczegóły błędu
- Sprawdź node który się wysypał
- Zobacz error message

⚠️ WAŻNE: Daily Import i Daily Update Results tworzą tylko JOB - faktyczna praca dzieje się w Background Workerze.
   - Workflow n8n: < 10 sekund (tworzy job, zwraca jobId)
   - Worker execution: 30-300 sekund (faktyczny import/update)
   - Sprawdzaj status jobów w Render logs lub przez Manual Wake Worker → Check Pending Jobs
```

### Render Logs

```bash
Render Dashboard → bet-assistant-backend → Logs

Co sprawdzać:
- GET /health co 10 minut (Keep-Alive)
- PM2 log: Background Import Worker started
- POST /import-matches 200 (Daily Import workflow)
- POST /update-results 200 (Daily Update Results workflow)
- 🔄 Processing job #XXX: new_matches (Worker rozpoczął import)
- 🔄 Processing job #XXX: update_results (Worker rozpoczął update)
- Import job #XXX progress logs
- ✅ Job #XXX completed (Worker zakończył job)
- Brak error messages

⏱️ Typowy flow Daily Update Results:
01:01 - n8n wywołuje POST /update-results → zwraca jobId 348 (< 5s)
01:01 - Worker wykrywa job #348 w kolejce
01:02 - Worker rozpoczyna: "🔄 Processing job #348: update_results"
01:03 - Worker aktualizuje mecze z wczoraj
01:04 - Worker kończy: "✅ Job #348 completed: 25 matches updated"
```

### Render Usage

```bash
Render Dashboard → bet-assistant-backend → Usage

Sprawdź po kilku dniach:
Current month usage: ~50-150 hours (zależy od harmonogramu)

Keep-Alive zużycie:
- Harmonogram 10-16, 20-03 PL (4-10, 14-21 NY) = 15h/dzień
- Miesiąc: 15h × 30 dni = 450h (60% z 750h FREE)

Jeśli przekroczysz 750h:
- Plan A: Zmniejsz harmonogram Keep-Alive (np. tylko 12-14 NY = 4h/dzień)
- Plan B: Upgrade Render do Starter ($7/miesiąc)
```

---

## ⚠️ Troubleshooting

### Problem 1: "401 Unauthorized"

**Diagozna:**
```bash
Sprawdź klucze API:

Render Dashboard → Environment → N8N_WEBHOOK_KEY = X
n8n workflow → HTTP Request → Header x-n8n-api-key = Y

X musi = Y (identyczne!)
```

**Fix:**
```bash
1. Skopiuj klucz z Render (DOKŁADNIE, bez spacji)
2. Edytuj workflow → HTTP Request node
3. Headers → x-n8n-api-key → Wklej nowy klucz
4. Save
5. Test workflow ponownie
```

### Problem 2: Keep-Alive nie wykonuje się

**Diagnoza:**
```bash
n8n → Workflows → Keep-Alive
Status pokazuje: Inactive (szary) zamiast Active (zielony)
```

**Fix:**
```bash
1. Kliknij workflow
2. Toggle "Inactive" → "Active"
3. Save
4. Za 10 min sprawdź Executions
```

### Problem 3: Backend timeout (Manual Wake trwa >60s)

**Przyczyny:**
- Render cold start
- Backend jeszcze deployment w trakcie
- Render przeciążony

**Fix:**
```bash
1. Sprawdź Render Dashboard → Status
   - Jeśli "Building" → czekaj na zakończenie
   - Jeśli "Live" ale timeout → czekaj 2 min

2. Spróbuj ponownie Manual Wake
3. Powinno zadziałać (backend już ciepły)

4. Jeśli nadal timeout:
   - Zwiększ timeout w HTTP Request do 90000 (90s)
   - Save workflow
```

### Problem 4: Worker nie przetwarza jobów

**Symptom:**
```
Daily Import stworzyło job #347
Render logs: Job #347 status = "pending"
Ale import się nie zaczyna
```

**Diagnoza:**
```bash
Sprawdź Render logs:
"🚀 Background Import Worker started" - widoczne?

Jeśli NIE:
- PM2 nie uruchomił workera
- Sprawdź deploy logs
```

**Fix:**
```bash
Render Dashboard → Manual Deploy → Deploy latest commit

Poczekaj 2-3 minuty
Sprawdź logs ponownie:
"🚀 Background Import Worker started" ✓
"⏰ Checking for jobs every 5 minutes..." ✓
```

### Problem 5: Keep-Alive działa ale backend nadal usypia

**Symptom:**
```
n8n Executions: Keep-Alive ✓ Success (5 min temu)
Manual Wake: Duration 35s (cold start!)
```

**Diagnoza:**
```bash
Sprawdź execution time Keep-Alive:
n8n → Executions → Ostatnia Keep-Alive execution
Node "Health Check Render" → Execution time > 20s?

Jeśli TAK → backend spał mimo Keep-Alive
```

**Możliwe przyczyny:**
```bash
1. Timezone różnica:
   - n8n domyślnie: America/New_York
   - Twój komputer: Europe/Warsaw (+6h)
   - Keep-Alive o "10:00 NY" = 16:00 Polski czas

2. Render osiągnął limit 750h i wyłączył service

3. Render maintenance/restart

4. Keep-Alive timeout przed odpowiedzią backend
```

**Fix:**
```bash
Dla #1 (timezone):
- Zaakceptuj różnicę czasową
- Lub zmień cron na lokalny czas (wymaga n8n config)

Dla #2 (limit):
- Sprawdź Usage w Render Dashboard
- Zmniejsz harmonogram lub upgrade plan

Dla #3:
- Czekaj - powinno się naprawić samo po maintenance

Dla #4:
- Zwiększ timeout HTTP Request Keep-Alive do 45000
```

---

## ✅ Checklist Końcowy

```
Po zakończeniu konfiguracji sprawdź:

☐ Keep-Alive workflow stworzony i AKTYWNY
☐ Manual Wake Worker stworzony (test przeszedł)
☐ Daily Import (opcjonalnie) stworzony i aktywny
☐ Daily Update Results (ZALECANE) stworzony i aktywny
☐ Manual Wake test: backend odpowiada < 10s
☐ Keep-Alive executions: pojawia się co 10 min
☐ Daily Import/Update: zwracają jobId w response (async mode)
☐ Render logs: GET /health co 10 min widoczne
☐ Render logs: Background Worker przetwarza joby co ~5 min
☐ Render usage: < 70% po tygodniu

☐ n8n działa 24/7 (VPS/Docker) LUB
☐ Zaakceptowane że Keep-Alive działa tylko gdy komputer włączony

☐ INSTALACJA-N8N.md - MOŻNA USUNĄĆ po pomyślnej konfiguracji
```

---

## 📚 Dokumentacja Produkcyjna

**Po pomyślnej instalacji użyj:**

1. **Full Tech Docs:** `Dokumentacja/n8n-automation-tech.md`
   - Architektura PM2 + Background Worker
   - Async job queue flow
   - Rate limiting strategy
   - Detailed troubleshooting

2. **Workflow Details:** `n8n-workflows/README.md`
   - Opis wszystkich 6 workflows
   - Harmonogramy i koszty
   - Use cases przykłady

3. **Main Docs:** `Dokumentacja/dokumentacja techniczna` sekcja 12
   - Integracja n8n w całym systemie
   - Endpoints reference
   - Monitoring setup

**Usuń ten plik** gdy konfiguracja działa - to tylko tymczasowa instrukcja setup.

---

## 🎓 Co się nauczyłeś

- ✅ Jak stworzyć workflow n8n od zera (bez importu)
- ✅ Jak dodać Schedule Trigger (cron syntax)
- ✅ Jak konfigurować HTTP Request nodes
- ✅ Jak dodawać Headers (API authentication)
- ✅ Jak używać async job queue (webhooks zwracają jobId, worker przetwarza w tle)
- ✅ Jak testować workflows przed aktywacją
- ✅ Jak monitorować executions i job status
- ✅ Jak debugować błędy 401, timeouts, cold starts
- ✅ Jak zarządzać Render Free Tier usage (750h limit)
- ✅ Jak połączyć n8n automatyzację z Background Worker
- ✅ Różnica między async job (zwraca jobId) vs sync request (czeka na wynik)

**Next steps:**
1. Poeksperymentuj z innymi nodes (Webhook, Code, IF, Split)
2. Stwórz własne custom workflows
3. Dopasuj harmonogramy do swoich potrzeb
4. Monitoruj przez tydzień i optymalizuj

---

**Status:** ✅ Gotowe do użycia | Usuń ten plik po pomyślnej konfiguracji
