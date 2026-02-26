# 📘 n8n - Tworzenie Workflows OD ZERA (Wersja FREE)

**Data:** 24 lutego 2026  
**Wersja:** 1.0 - Manual Setup  
**Status:** Tymczasowy przewodnik (do usunięcia po konfiguracji)  
**Cel:** Nauka tworzenia workflows n8n bez gotowych importów

---

## ⚠️ UWAGA: n8n FREE - Brak Environment Variables

W wersji **FREE n8n nie ma funkcji Variables**. Wszystkie klucze API i URLe będą **wpisane bezpośrednio w nodes**.

---

## PRZYGOTOWANIE 1: Pobierz klucz API z Render

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

## PRZYGOTOWANIE 2: Połącz Google Sheets z n8n (dla Workflow 5)

**⚠️ WAŻNE:** To jest potrzebne TYLKO dla Workflow 5 (Daily Bet Finder). Jeśli nie planujesz używać automatycznego bet-findera, możesz pominąć.

### Krok 1: Pobierz ID arkusza Google Sheets

```bash
1. Otwórz Google Sheets - arkusz "Strefa Typera"
   Przykładowy URL:
   https://docs.google.com/spreadsheets/d/1abc...XYZ/edit#gid=0

2. Skopiuj ID arkusza (środkowa część URL):
   1abc...XYZ

   ⚠️ To jest SPREADSHEET_ID - zapisz w notatniku!

3. Sprawdź nazwę zakładki (sheet name):
   Domyślnie: "Strefa Typera"
   (Nazwa widoczna na dole arkusza - karta/tab)
```

### Krok 2: Skonfiguruj Google Sheets Credential w n8n

```bash
# W n8n UI (http://localhost:5678):

1. Kliknij ikonę "Credentials" (górne menu, ikona klucza)

2. Kliknij "+ Add Credential" (góra po prawej)

3. W search wpisz: "google sheets"

4. Wybierz: "Google Sheets API"

5. Wybierz metodę autoryzacji: "OAuth2"

6. Postępuj według opcji poniżej:
```

**Opcja A: Szybka konfiguracja (używając Google Account)**

```bash
1. W panelu Credential:
   - Name: "Google Sheets - Strefa Typera"
   - Kliknij: "Connect my account"

2. Pojawi się popup Google OAuth:
   - Wybierz swoje konto Google
   - Zaakceptuj uprawnienia (widok i edycja arkuszy)

3. Po pomyślnej autoryzacji:
   - Status: "Connected" ✓
   - Kliknij "Save"

4. Credential gotowy do użycia!
```

**Opcja B: Google Service Account (zaawansowane, opcjonalne)**

Pomiń jeśli Opcja A działa. Use case: automatyzacja bez interakcji użytkownika.

```bash
1. Google Cloud Console:
   https://console.cloud.google.com

2. Stwórz nowy projekt: "n8n-automation"

3. Enable API:
   APIs & Services → Library → Szukaj "Google Sheets API" → Enable

4. Create Service Account:
   APIs & Services → Credentials → Create Credentials → Service Account

5. Pobierz JSON key file

6. W n8n:
   - Wybierz "Service Account"
   - Upload JSON key file
   - Save

7. Udostępnij arkusz dla Service Account email:
   Google Sheets → Share → Wklej service account email → Editor access
```

**✅ GOTOWE** - Credential Google Sheets skonfigurowany!

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
  total_jobs:
    (jobsData.running?.length || 0) +
    (jobsData.rate_limited?.length || 0) +
    (jobsData.pending?.length || 0),
  running: jobsData.running?.length || 0,
  rate_limited: jobsData.rate_limited?.length || 0,
  pending: jobsData.pending?.length || 0,
  details: jobsData,
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
  job_type: response.job?.type || "update_results",
  leagues_count: response.job?.leagues || 0,
  date_range: response.job?.dateRange,
  status: response.success ? "✅ Job Created" : "❌ Failed",
  check_url: response.checkStatusUrl,
};

console.log("Daily Update Results Job:", summary);

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

## WORKFLOW 5: Daily Bet Finder (AUTOMATYCZNA WYSZUKIWARKA)

**Cel:** Codzienne wyszukiwanie zakładów na jutro o 15:00 NY (21:00 PL) + automatyczny export do Google Sheets.

**⚠️ UWAGA:** To workflow używa **SYNC mode** dla edukacji. Backend wykonuje wyszukiwanie i zwraca wyniki synchronicznie (timeout 45s). Idealny do nauki Code nodes, pętli i error handling w n8n FREE.

### Krok 1: Stwórz workflow

```bash
1. "+ Add workflow"
2. Nazwa: "5. Daily Bet Finder"
3. Save
```

### Krok 2: Dodaj Schedule Trigger

```bash
1. Dodaj node: "Schedule Trigger"

# Konfiguracja:

Mode: Custom

Value: 0 15 * * *

⏰ To oznacza:
   - 15:00 America/New_York (n8n timezone)
   - = 21:00 Europe/Warsaw (czas polski)
   - Codziennie wieczorem

Nazwa node: "Daily 21:00 PL"
```

**Czemu 15:00 NY?**

- Twój komputer: Europe/Warsaw (UTC+1)
- n8n timezone: America/New_York (UTC-5)
- 15:00 NY = 21:00 PL ✓ (wieczor, przed meczami następnego dnia)

### Krok 3: Dodaj HTTP Request - Search Bets

```bash
1. Przeciągnij z "Daily 21:00 PL" → dodaj "HTTP Request"

# Konfiguracja:

Method: POST

URL: https://bet-assistant-backend.onrender.com/api/webhooks/n8n/search-bets

Authentication: None

Headers (WAŻNE - dodaj header):
  Kliknij "Add Header"
  Name: x-n8n-api-key
  Value: <TWÓJ_KLUCZ_Z_RENDER>
  
  ⚠️ NIE dodawaj "Content-Type: application/json" ręcznie!
     n8n automatycznie doda gdy wybierzesz "Body Content Type: JSON"

Body (KRYTYCZNE - musi być):
  ⬇️ Rozwiń sekcję "Body" (jeśli zwinięta)
  
  Body Content Type: JSON (wybierz z listy)
  
  ⚠️ WAŻNE: Pole JSON pojawi się dopiero po wybraniu "JSON" w Body Content Type!
  
  JSON (wklej poniższy obiekt):
  {
    "searchType": "winner-vs-loser",
    "daysAhead": 1,
    "topCount": 40,
    "matchCount": 10
  }

Options (rozwiń sekcję):
  Timeout: 45000
  (45 sekund - dajemy czas na pełne wyszukiwanie)

Nazwa node: "Search Tomorrow Bets"
```

**🔴 Troubleshooting - częste błędy:**

```
Błąd: "Cannot read properties of undefined (reading 'searchType')"
Przyczyna: n8n nie wysłał JSON body

Fix:
1. Kliknij node "Search Tomorrow Bets"
2. Sprawdź sekcję "Body" - czy jest rozwinięta?
3. Body Content Type MUSI być: "JSON" (nie "Form-Data", nie "Raw")
4. Pole JSON MUSI zawierać obiekt (sprawdź czy wszystkie " są podwójne, nie pojedyncze)
5. Save → Test workflow ponownie
```

**Co oznaczają parametry:**

- `searchType`: Algorytm wyszukiwania (na razie tylko "winner-vs-loser" zaimplementowany)
- `daysAhead: 1`: Szukaj tylko na **jutro** (nie dziś, nie pojutrze)
- `topCount: 40`: Zwróć TOP 40 najlepszych zakładów
- `matchCount: 10`: Minimalna liczba meczów w historii dla analizy

### Krok 4: Dodaj Code node - Parse Results (LEARNING!)

```bash
1. Przeciągnij z "Search Tomorrow Bets" → dodaj "Code"

# Konfiguracja:

Mode: Run Once for All Items

Language: JavaScript

Code: (wklej poniższy kod)
```

```javascript
// 🎓 NAUKA: Parse i prepare results for loop
const response = $input.first().json;

// Sprawdź czy są wyniki
if (!response.success || !response.results || response.results.length === 0) {
  console.log("⚠️ No bets found for tomorrow");
  return [];
}

console.log(`✅ Found ${response.results.length} bets for tomorrow`);

// Zwróć każdy result jako osobny item (dla loop node)
// Backend już zwraca pełne 44 kolumny - po prostu przepuszczamy wszystko
return response.results.map((bet) => ({
  json: bet, // Przepuść cały obiekt (wszystkie 44 kolumny + metadata)
}));
```

```bash
Nazwa node: "Parse Results"

Kliknij poza panelem aby zamknąć
```

**🎓 CO SIĘ TUTAJ DZIEJE:**

- `$input.first().json` - pobiera response z poprzedniego node (Search Tomorrow Bets)
- Backend już zwrócił **pełne 44 kolumny** + metadata (szanse wyliczone, statystyki 5/10/15, standing, etc.)
- `.map(bet => ({ json: bet }))` - przepuszcza CAŁY obiekt bet (wszystkie kolumny)
- `json: bet` - zachowuje wszystkie pola które backend zwrócił (A-AR + score, recommendation)
- To przygotowuje dane dla **Loop node** - każdy bet będzie przetworzony osobno przez Google Sheets

### Krok 5: Dodaj IF node - Check Results (ERROR HANDLING)

```bash
1. Przeciągnij z "Parse Results" → dodaj "IF"

# Konfiguracja:

Conditions:
  Add Condition → Number (WYBIERZ "Number", NIE "Boolean"!)

  Value 1: {{ $input.all().length }}

  Operation: Larger (wybierz z listy)

  Value 2: 0

Nazwa node: "Has Results?"
```

**🎓 CO TO ROBI:**

- Sprawdza czy liczba items > 0
- Jeśli NIE (0 results) → idzie do FALSE branch (później dodamy komunikat)
- Jeśli TAK → idzie do TRUE branch (loop import)

**🔴 Troubleshooting:**

```
Błąd: "Wrong type: '40' is a string but was expecting a boolean"
Przyczyna: Wybrałeś "Boolean" zamiast "Number" w condition type

Fix:
1. Kliknij "Has Results?" node
2. Conditions → Usuń current condition (X)
3. Add Condition ponownie → tym razem wybierz "Number"
4. Value 1: {{ $input.all().length }}
5. Operation: Larger
6. Value 2: 0
7. Save
```

### Krok 6: Dodaj Google Sheets node (BEZPOŚREDNI IMPORT!)

```bash
1. Przeciągnij z "Has Results?" node → Kliknij małą kropkę przy "true" (zielona)
2. Dodaj node: "Google Sheets"

⚠️ WAŻNE: "Parse Results" już zwrócił wiele items (każdy bet osobno).
   Google Sheets automatycznie wykona się dla KAŻDEGO item - to implicit loop w n8n!
   NIE POTRZEBUJESZ "Split Out" node!

# Konfiguracja Google Sheets node:

⚠️ PRZED KONFIGURACJĄ: Upewnij się że wykonałeś PRZYGOTOWANIE 2 (Google OAuth)

Resource: Spreadsheet

Operation: Append or Update Row

Document (Spreadsheet ID):
  Kliknij pole → Wybierz z listy: "Strefa Typera"
  (Lub wklej ręcznie ID: 1abc...XYZ z PRZYGOTOWANIE 2)

Sheet: Strefa Typera
(Nazwa zakładki w arkuszu - sprawdź na dole Google Sheets)

Data Mode: Define Below

Values to Send:
  Kliknij "Add Field"

  **Dodaj kolejno 44 pola (kolumny A-AR):**

  **A-G: Podstawowe dane zakładu**
  Column A → {{ $json.homeTeam }}        (Gospodarz)
  Column B → {{ $json.awayTeam }}        (Gość)
  Column C → {{ $json.betType }}         (Typ zakładu: "Winner")
  Column D → {{ $json.betOption }}       (Opcja: "1" lub "2")
  Column E → {{ $json.szanse }}          (Szanse - wyliczone z H-O, format: "72,5%" lub "za mało danych")
  Column F → {{ $json.odds }}            (Kurs: homeOdds lub awayOdds)
  Column G → {{ $json.mocBet }}          (Pusty - formuła w arkuszu: =E*F)

  **H-S: Statystyki 5/10/15 meczów (Overall + Home/Away)**
  Column H → {{ $json.stats5OverallHome }}   (5 H % (o) - 5 meczów gospodarza ogółem)
  Column I → {{ $json.stats5OverallAway }}   (5 A % (o) - 5 meczów gościa ogółem)
  Column J → {{ $json.stats5HaHome }}        (5 H % (H/A) - 5 meczów gospodarza u siebie)
  Column K → {{ $json.stats5HaAway }}        (5 A % (H/A) - 5 meczów gościa na wyjeździe)
  Column L → {{ $json.stats10OverallHome }}  (10 H % (o))
  Column M → {{ $json.stats10OverallAway }}  (10 A % (o))
  Column N → {{ $json.stats10HaHome }}       (10 H % (H/A))
  Column O → {{ $json.stats10HaAway }}       (10 A % (H/A))
  Column P → {{ $json.stats15OverallHome }}  (15 H % (o))
  Column Q → {{ $json.stats15OverallAway }}  (15 A % (o))
  Column R → {{ $json.stats15HaHome }}       (15 H % (H/A))
  Column S → {{ $json.stats15HaAway }}       (15 A % (H/A))

  **T-W: Wyniki (ręczne wypełnienie po meczu)**
  Column T → {{ $json.kuponR }}          (Pusty - czy dodano do kuponu)
  Column U → {{ $json.wszedlR }}         (Pusty - czy zakład wszedł)
  Column V → {{ $json.wynikHomeR }}      (Pusty - bramki gospodarza)
  Column W → {{ $json.wynikAwayR }}      (Pusty - bramki gościa)

  **X-Z: Standing i komentarz**
  Column X → {{ $json.standingHome }}    (Pozycja gospodarza w tabeli, np. "3")
  Column Y → {{ $json.standingAway }}    (Pozycja gościa w tabeli, np. "12")
  Column Z → {{ $json.komentarzR }}      (Pusty - notatki ręczne)

  **AA-AG: Kontekst meczu i linki**
  Column AA → {{ $json.country }}        (Kraj, np. "England")
  Column AB → {{ $json.league }}         (Liga, np. "Premier League")
  Column AC → {{ $json.matchDate }}      (Data meczu: "2026-02-27")
  Column AD → {{ $json.matchId }}        (ID meczu z bazy)
  Column AE → {{ $json.idKuponuR }}      (Pusty - ID kuponu w systemie)
  Column AF → {{ $json.superbetLink }}   (Link do Superbet)
  Column AG → {{ $json.flashscoreLink }} (Link do Flashscore)

  **AH-AR: Dodatkowe (obecnie puste)**
  Column AH-AR → {{ $json.notesAR }}     (Puste - rezerwa na przyszłość)

---

**🎓 Jak działa kolumna E (SZANSE)?**

Backend automatycznie wylicza szanse jako **średnią z 8 wartości (H-O)**:
- Tylko z 5 i 10 meczów (BEZ 15!)
- Minimum 4 wartości numeryczne wymagane
- Jeśli mniej niż 4 → "za mało danych"

Algorytm:
```

percentages = [H, I, J, K, L, M, N, O] // 8 wartości
validPercentages = filter(p => typeof p === 'number') // Pomijamy "za mało danych"

if (validPercentages.length < 4) {
szanse = "za mało danych"
} else {
average = sum(validPercentages) / validPercentages.length
szanse = average.toFixed(1).replace('.', ',') + '%' // "72,5%"
}

```

**Przykład**: H=75%, I=80%, J="za mało danych", K=70%, L=78%, M=82%, N=76%, O=74%
→ validPercentages = [75, 80, 70, 78, 82, 76, 74] (7 wartości)
→ average = 535 / 7 = 76.43
→ **szanse = "76,4%"**

Options (rozwiń sekcję):
  Range: A:AR (cały zakres kolumn)
  Value Input Mode: USER_ENTERED (domyślnie)

Credentials:
  Wybierz: "Google Sheets - Strefa Typera" (credential z PRZYGOTOWANIE 2)

Nazwa node: "Add to Google Sheets"
```

**🎓 NAUKA: Google Sheets Integration**

- **Bezpośrednia integracja** - n8n → Google API (BEZ backendu!)
- **Render usage: 0h** - nie męczymy backendu, oszczędzamy FREE tier ✨
- **Implicit Loop** - Google Sheets automatycznie wykona się dla każdego item z poprzedniego node
- **Column mapping** - {{ $json.field }} → konkretna kolumna (A, B, C...)
- **Append or Update** - dodaje nowy wiersz na końcu arkusza

**Co się dzieje pod maską:**

```
n8n Parse Results zwraca 40 items → Google Sheets node wykona się 40 razy:
  1. Dla każdego item: pobiera $json.homeTeam, $json.awayTeam, etc.
  2. Google Sheets API: appendRow()
  3. Adds new row to "Strefa Typera"
  4. Returns success/error

Całość: 40 API calls do Google (nie do Render!)
```

### Krok 7: Dodaj Code node - Summary (Final Stats)

```bash
1. Przeciągnij z "Add to Google Sheets" → dodaj "Code"

# Konfiguracja:

Mode: Run Once for All Items

Language: JavaScript

Code: (wklej poniższy kod)
```

```javascript
// 🎓 NAUKA: Agregacja wyników loop (Google Sheets)
const allItems = $input.all();

const summary = {
  total: allItems.length,
  added: allItems.filter((item) => {
    // Google Sheets zwraca updatedRange jeśli sukces
    return item.json.updatedRange || item.json.spreadsheetId;
  }).length,
  errors: allItems.filter((item) => {
    // Sprawdź czy nie ma error
    return !item.json.updatedRange && !item.json.spreadsheetId;
  }).length,
  timestamp: new Date().toISOString(),
};

console.log("📊 Daily Bet Finder Summary:", summary);

return [{ json: summary }];
```

```bash
Nazwa node: "Final Summary"
```

**🎓 CO TO ROBI:**

- `$input.all()` - pobiera WSZYSTKIE items z poprzedniego node (wszystkie loop iterations Google Sheets)
- Google Sheets zwraca `updatedRange` jeśli row został dodany pomyślnie
- `.filter()` - zlicza ile było success vs errors
- `console.log()` - widoczne w n8n Executions → Logs
- Zwraca podsumowanie jako final output workflow

### Krok 8: (Opcjonalne) Dodaj No Results Handler

```bash
1. Wróć do "Has Results?" node
2. Przeciągnij z kropki przy "false" (czerwona) → dodaj "Code"

# Konfiguracja:

Mode: Run Once for All Items

Language: JavaScript

Code:
```

```javascript
// Handler gdy brak wyników
console.log("⚠️ No bets found for tomorrow - workflow ended");

return [
  {
    json: {
      status: "no_results",
      message: "No betting opportunities found for tomorrow",
      timestamp: new Date().toISOString(),
    },
  },
];
```

```bash
Nazwa node: "No Results"
```

### Krok 9: Testuj workflow (WAŻNE!)

```bash
1. Kliknij "Save"

2. Kliknij "Test workflow"

3. Czekaj 10-45 sekund (backend szuka zakładów)

4. Sprawdź każdy node:

   ✓ Daily 21:00 PL → Trigger (zielony)

   ✓ Search Tomorrow Bets → Zobacz output:
     {
       "success": true,
       "count": 15-40,
       "results": [
         {
           "homeTeam": "Arsenal",
           "awayTeam": "Chelsea",
           "betType": "Winner",
           "betOption": "1",
           "szanse": "72,3%",
           "odds": 1.85,
           "mocBet": "",
           "stats5OverallHome": "80%",
           "stats5OverallAway": "70%",
           "stats5HaHome": "75%",
           "stats5HaAway": "65%",
           "stats10OverallHome": "78%",
           "stats10OverallAway": "72%",
           "stats10HaHome": "73%",
           "stats10HaAway": "68%",
           "stats15OverallHome": "76%",
           "stats15OverallAway": "70%",
           "stats15HaHome": "71%",
           "stats15HaAway": "66%",
           "standingHome": "3",
           "standingAway": "7",
           "country": "England",
           "league": "Premier League",
           "matchDate": "2026-02-27",
           "matchId": 12345,
           "superbetLink": "https://...",
           "flashscoreLink": "https://...",
           "score": 145.8,
           "recommendation": "Mocna przewaga gospodarzy → Zakład: 1"
         },
         ...
       ]
     }

   ✓ Parse Results → Powinno być 15-40 items (każdy bet osobno)

   ✓ Has Results? → TRUE branch (zielony)

   ✓ Add to Google Sheets → Wykona się 15-40 razy (implicit loop dla każdego item)
     Każde wykonanie ma response:
     {
       "spreadsheetId": "1abc...XYZ",
       "updatedRange": "Strefa Typera!A123",
       "updatedRows": 1,
       "updatedColumns": 44
     }
     (Google Sheets API potwierdza dodanie wiersza!)

   ✓ Final Summary → Zobacz:
     {
       "total": 40,
       "added": 40,
       "errors": 0,
       "timestamp": "2026-02-25T21:00:00.000Z"
     }

5. Sprawdź Google Sheets:
   Otwórz arkusz "Strefa Typera"
   Powinno być 15-40 nowych wierszy z bet-finderem
   🎉 DODANE BEZPOŚREDNIO przez n8n (bez backendu!)

3. Workflow będzie wykonywany CODZIENNIE o 21:00 czasu polskiego

⚠️ UWAGA: Keep-Alive MUSI być aktywny przed aktywacją tego workflow!
           (Żeby backend był ciepły o 21:00)
```

**✅ WORKFLOW 5 GOTOWY** - Automatyczne wyszukiwanie zakładów każdego wieczora o 21:00 PL!

---

## 🎓 Co się nauczyłeś w Workflow 5

### 1. SYNC vs ASYNC webhooks

**ASYNC (Workflow 3, 4):**

- Endpoint tworzy **job** i zwraca `jobId`
- Worker przetwarza w tle (może trwać minuty)
- n8n dostaje natychmiastowy response (< 5s)

**SYNC (Workflow 5):**

- Endpoint wykonuje **całą pracę** przed odpowiedzią
- n8n CZEKA na <response> (może trwać 45s)
- Pros: Masz wyniki od razu (łatwa nauka loop/parse)
- Cons: Timeout risk jeśli > 45s

### 2. Code Nodes - Parse Results

**Pattern:**

```javascript
const response = $input.first().json; // Pobierz input
return response.results.map((item) => ({ json: item })); // Array → Items
```

**Co to robi:**

- `$input.first()` - pierwszy (i jedyny) item z poprzedniego node
- `.map(item => ({ json: item }))` - przekształca array na n8n items format
- Każdy item MUSI mieć pole `json`

### 3. IF Node - Conditional Logic

**Pattern:**

```
Condition Type: Number
Value 1: {{ $input.all().length }}
Operation: Larger
Value 2: 0
```

**Branches:**

- `true` (zielona kropka) → Jest coś do przetworzenia (length > 0)
- `false` (czerwona kropka) → Pusta lista, error handling

**Typowe błędy:**
- NIE używaj "Boolean" + "is not empty" dla liczb
- `.length` zwraca Number, nie String - użyj condition typu "Number"

### 4. Implicit Loop w n8n

**Działanie:**

```
Jeśli poprzedni node zwraca wiele items:
Input:  [{json: item1}, {json: item2}, {json: item3}]

Następny node automatycznie wykona się dla KAŻDEGO:
  Execution 1: item1 → Google Sheets
  Execution 2: item2 → Google Sheets
  Execution 3: item3 → Google Sheets
```

- n8n automatycznie loopuje przez items - NIE POTRZEBUJESZ "Split Out" node!
- `{{ $json.field }}` - odnosi się do CURRENT item w loop
- Każde wykonanie to osobny API call do Google Sheets

### 5. Google Sheets Integration (BEZ backendu!)

**Pattern:**

```bash
Resource: Spreadsheet
Operation: Append or Update Row
Document: Strefa Typera
Sheet: Strefa Typera
Values: {{ $json.homeTeam }}, {{ $json.awayTeam }}, ...
```

**Co to robi:**

- n8n łączy się BEZPOŚREDNIO z Google Sheets API
- NIE używa backendu Render → **OSZCZĘDZASZ RENDER HOURS!** 🎉
- Każdy bet z loop = osobny appendRow() do Google Sheets
- Response: `{ updatedRange: "A123", updatedRows: 1 }`

**Wyliczanie SZANS (kolumna E):**

Backend automatycznie oblicza średnią z 8 wartości:

```
Kolumny H-O (5 i 10 meczów):
- H: 5 H % (o)    stats5OverallHome
- I: 5 A % (o)    stats5OverallAway
- J: 5 H % (H/A)  stats5HaHome
- K: 5 A % (H/A)  stats5HaAway
- L: 10 H % (o)   stats10OverallHome
- M: 10 A % (o)   stats10OverallAway
- N: 10 H % (H/A) stats10HaHome
- O: 10 A % (H/A) stats10HaAway

Algorytm:
1. Zbierz 8 wartości z H-O
2. Odrzuć "za mało danych" (tylko numeric values)
3. Jeśli < 4 wartości → "za mało danych"
4. Jeśli >= 4 wartości → średnia arytmetyczna
5. Format: "72,3%" (przecinek!)

Przykład:
H=80%, I=70%, J=75%, K=65%, L=78%, M=72%, N=73%, O=68%
Średnia = (80+70+75+65+78+72+73+68) / 8 = 72,625% → "72,6%"
```

**Kolumny P-S (15 meczów):**

- NIE UŻYWANE do wyliczania szans
- Tylko informacyjnie w arkuszu
- Pozwalają zobaczyć dłuższą historię

**Korzyści:**

| **PRZED (HTTP → Backend)**           | **PO (Google Sheets node)**   |
| ------------------------------------ | ----------------------------- |
| 40 HTTP calls → Render               | 0 HTTP calls → Render ✅      |
| Render: +10h/miesiąc                 | Render: 0h oszczędności ✅    |
| Timeout: backend + Google API        | Timeout: tylko Google API     |
| Error: 3 warstwy (n8n→Render→Google) | Error: 1 warstwa (n8n→Google) |

### 6. Code Node - Agregacja po Loop

**Pattern (dla Google Sheets):**

```javascript
const allItems = $input.all(); // Wszystkie loop iterations
const added = allItems.filter((i) => i.json.updatedRange).length; // Google Sheets success
return [{ json: { total, added, errors } }];
```

**Co to robi:**

- `$input.all()` - pobiera WSZYSTKIE items z poprzedniego node (po loop)
- `.filter(i => i.json.updatedRange)` - Google Sheets zwraca `updatedRange` jeśli sukces
- Zlicza ile było success vs errors
- Zwraca podsumowanie

### 7. Error Handling - Retry Pattern

**Jak retry w n8n:**

```bash
1. HTTP Request node → Settings (ikona koła zębatego)
2. Scroll do: "Retry On Fail"
3. Toggle ON
4. Max Tries: 3
5. Wait Between Tries: 5000 (5 sekund)
```

**Kiedy użyć:**

- Timeout errors (backend cold start)
- Rate limit (429)
- Network issues (500, 503)

---

## 🧪 Testowanie Workflow 5

### Test 1: Manual Execution (PIERWSZY TEST)

```bash
1. Otwórz "5. Daily Bet Finder"
2. Kliknij "Test workflow"
3. Czekaj 10-45 sekund
4. Sprawdź output każdego node (kliknij node → See output)

Oczekiwany flow:
✓ Search Tomorrow Bets → 200 OK, count: 15-40
✓ Parse Results → 15-40 items
✓ Has Results? → TRUE branch
✓ Add to Google Sheets → 15-40 executions (implicit loop)
✓ Final Summary → total: 15-40, added: 15-40
```

**Jeśli FALSE branch (No Results):**

- Sprawdź "Search Tomorrow Bets" output: `count: 0`
- To normalne jeśli nie ma meczów na jutro ✓
- Backend działa poprawnie, po prostu brak zakładów do wyszukania

**Jeśli timeout (> 45s):**

- Zwiększ timeout w "Search Tomorrow Bets" do 60000 (60s)
- Cold start Render może trwać do 60s przy pierwszym wywołaniu

### Test 2: Sprawdź Google Sheets

```bash
1. Otwórz Google Sheets - arkusz "Strefa Typera"
2. Sprawdź ostatnie wiersze
3. Powinieneś zobaczyć nowe bets z:
   - Kolumna A: Data meczu (jutro)
   - Kolumna B: Home Team
   - Kolumna C: Away Team
   - Kolumna D: Liga
   - ...
   - Kolumna I: Recommendation (1, X, 2)
   - Kolumna AP: Superbet link
   - Kolumna AQ: Flashscore link

Jeśli są duplikaty:
- Frontend już ma duplikate prevention (localStorage + useRef)
- n8n też może to mieć - dodaj Code node przed "Add to Google Sheets":
```

```javascript
// Deduplikacja przed importem
const items = $input.all();
const seen = new Set();

return items.filter((item) => {
  const key = `${item.json.homeTeam}-${item.json.awayTeam}-${item.json.matchDate}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});
```

### Test 3: Error Handling - Broken Backend

```bash
Symuluj błąd:

1. Zmień URL w "Search Tomorrow Bets":
   https://bet-assistant-backend.onrender.com/api/webhooks/n8n/WRONG-URL

2. Test workflow

3. Sprawdź error:
   - "Search Tomorrow Bets" → ❌ 404 Not Found
   - Workflow się zatrzymał

4. Dodaj Retry:
   - Kliknij "Search Tomorrow Bets" → Settings (koło zębate)
   - Retry On Fail: ON
   - Max Tries: 2
   - Wait: 3000

5. Test ponownie:
   - Będzie 2 próby (każda fail)
   - Workflow kończy z error

6. Przywróć poprawny URL
```

### Test 4: Automatic Execution (Production)

```bash
Po aktywacji workflow:

1. Czekaj do 21:00 czasu polskiego (15:00 NY)
2. n8n → Executions
3. Za ~1 min po 21:00 powinna pojawić się egzekucja
4. Status: Success ✓
5. Sprawdź:
   - Duration: 10-45s (wyszukiwanie + import)
   - Final Summary node: Zobacz ile dodano
   - Google Sheets: Nowe wiersze

Jeśli błąd:
- Kliknij execution → Zobacz który node się wysypał
- Sprawdź error message
- Fix w workflow → Save → Czekaj do jutra 21:00
```

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
☐ Daily Bet Finder (EDUKACYJNE) stworzony i aktywny - automatyczne wyszukiwanie zakładów
☐ Manual Wake test: backend odpowiada < 10s
☐ Keep-Alive executions: pojawia się co 10 min
☐ Daily Import/Update: zwracają jobId w response (async mode)
☐ Daily Bet Finder: zwraca wyniki synchronicznie (sync mode, 45s timeout)
☐ Render logs: GET /health co 10 min widoczne
☐ Render logs: Background Worker przetwarza joby co ~5 min
☐ Render logs: POST /search-bets (Daily Bet Finder) wykonuje się codziennie o 21:00 PL
☐ Google Sheets: Nowe zakłady pojawiają się automatycznie po 21:00 PL
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
   - Opis wszystkich workflows
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
- ✅ Jak używać sync webhooks (webhook zwraca wyniki od razu, timeout 45s)
- ✅ **Jak skonfigurować Google OAuth2 dla n8n (credentials)**
- ✅ **Jak używać Google Sheets node do bezpośredniego zapisu (BEZ backendu!)**
- ✅ **Jak oszczędzać Render hours używając natywnych integracji n8n + Google**
- ✅ Jak używać Code nodes do parsowania JSON i agregacji danych
- ✅ Jak używać IF nodes do conditional logic (error handling)
- ✅ Jak działa implicit loop w n8n (automatyczne przetwarzanie array items)
- ✅ Jak używać n8n expressions: {{ $json.field }}, {{ $input.all() }}
- ✅ Jak mapować pola JSON do kolumn Google Sheets (Column A → {{ $json.field }})
- ✅ Jak testować workflows przed aktywacją
- ✅ Jak monitorować executions i job status
- ✅ Jak debugować błędy 401, timeouts, cold starts
- ✅ Jak zarządzać Render Free Tier usage (750h limit)
- ✅ Jak połączyć n8n automatyzację z Background Worker
- ✅ Różnica między async job (zwraca jobId) vs sync request (czeka na wynik)
- ✅ Jak implementować retry mechanism w n8n (error handling)

**Next steps:**

1. Poeksperymentuj z innymi nodes (Webhook, Switch, Merge, Set)
2. Stwórz własne custom workflows (np. Daily Reports, Error Notifications)
3. Dopasuj harmonogramy do swoich potrzeb (zmień cron expressions)
4. **Zintegruj inne Google services (Gmail, Drive, Calendar) z n8n**
5. Monitoruj przez tydzień i optymalizuj (Render usage, Google Sheets quota)
6. Zaimplementuj pozostałe 16 algorytmów bet-finder (most-goals, least-goals, etc.)

---

**Status:** ✅ Gotowe do użycia | Usuń ten plik po pomyślnej konfiguracji
