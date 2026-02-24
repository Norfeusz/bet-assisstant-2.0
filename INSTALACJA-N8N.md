# Instalacja i Konfiguracja n8n - Przewodnik Krok po Kroku

**Data:** 24 lutego 2026  
**Wersja:** 1.0  
**Status:** Tymczasowy przewodnik (do usunięcia po konfiguracji)

---

## Wymagania wstępne

✅ Backend wdrożony na Render  
✅ n8n zainstalowane (localhost lub cloud)  
✅ Dostęp do Render Dashboard (Environment Variables)

---

## KROK 1: Konfiguracja Environment Variables w n8n

### 1.1. Pobierz klucz API z Render

```bash
# Zaloguj się do Render Dashboard:
https://dashboard.render.com

# Przejdź do:
bet-assistant-backend → Environment → N8N_WEBHOOK_KEY

# Skopiuj wartość klucza (długi string typu: "abc123def456...")
```

### 1.2. Dodaj zmienne w n8n

```bash
# W n8n UI (http://localhost:5678 lub twoja domena):

1. Kliknij ikonę ustawień (⚙️) w lewym dolnym rogu
2. Wybierz "Variables"
3. Kliknij "+ Add Variable"

# Dodaj następujące zmienne:

Zmienna 1:
  Name: BET_ASSISTANT_WEBHOOK_KEY
  Value: <wklej skopiowany klucz z Render>
  
Zmienna 2:
  Name: BET_ASSISTANT_API_URL
  Value: https://bet-assistant-backend.onrender.com

4. Kliknij "Save" dla każdej zmiennej
```

**Weryfikacja:**
```bash
# W n8n → Variables powinny być widoczne:
BET_ASSISTANT_WEBHOOK_KEY = •••••••••••• (ukryte)
BET_ASSISTANT_API_URL = https://bet-assistant-backend.onrender.com
```

---

## KROK 2: Import Workflows

### 2.1. Keep-Alive Workflow (KRYTYCZNY - zrób PIERWSZY!)

```bash
# W n8n UI:

1. Workflows → Kliknij "+ Add workflow" → "Import from File"

2. Kliknij "Select file to import"

3. Nawiguj do:
   d:\narzędzia\Bet Assistant 2.0\n8n-workflows\keep-alive-render.json

4. Kliknij "Import"

5. Workflow się otworzy - SPRAWDŹ:
   - Node "Schedule Trigger" → powinien pokazywać cron: */10 10-16,20-23,0-3 * * *
   - Node "Health Check" → URL: {{ $env.BET_ASSISTANT_API_URL }}/api/webhooks/n8n/health
   - Node "Health Check" → Header: x-n8n-api-key = {{ $env.BET_ASSISTANT_WEBHOOK_KEY }}

6. Kliknij "Save" (góra ekranu)

7. ⚠️ WAŻNE: Kliknij przełącznik "Inactive" → "Active" (zmieni się na zielony)
   Workflow musi być aktywny aby działał automatycznie!

8. Zmień nazwę (opcjonalnie): "Keep-Alive - Render Worker"
```

**Test (wykonaj za 10-15 minut):**
```bash
# W n8n → Executions (ikona zegara po lewej)
# Filtruj: "Keep-Alive"
# Powinno być wykonanie z zielonym znaczkiem ✓
```

### 2.2. Manual Wake Worker Workflow

```bash
# W n8n UI:

1. Workflows → "+ Add workflow" → "Import from File"

2. Wybierz plik:
   d:\narzędzia\Bet Assistant 2.0\n8n-workflows\manual-wake-worker.json

3. Kliknij "Import"

4. SPRAWDŹ nodes:
   - "Wake Backend" → URL powinien zawierać: {{ $env.BET_ASSISTANT_API_URL }}
   - "Check Pending Jobs" → URL: .../api/webhooks/n8n/import-jobs/status

5. Kliknij "Save"

6. NIE aktywuj (to manual trigger, uruchamia się ręcznie)

7. Zmień nazwę: "Manual Wake Worker"

8. TEST NATYCHMIASTOWY:
   - Kliknij "Test workflow" (góra ekranu)
   - Czekaj 20-60 sekund (cold start Render)
   - Powinieneś zobaczyć zielone znaczniki ✓ na wszystkich nodes
   - Kliknij node "Final Summary" → Zobacz output
```

**Oczekiwany output "Final Summary":**
```json
{
  "backend": {
    "success": true,
    "message": "✅ Backend is awake and healthy!",
    "database": "ok",
    "apiKey": "configured"
  },
  "jobs": {
    "pending": [...],
    "rate_limited": [...],
    "running": [...],
    "total": 0
  },
  "message": "Worker is awake! Found 0 jobs waiting."
}
```

### 2.3. Daily Import Matches (opcjonalnie - do produkcji)

```bash
# Jeśli chcesz automatyczny codzienny import:

1. Import pliku: 1-daily-import-matches.json

2. SPRAWDŹ Schedule Trigger:
   - Cron: 0 4 * * * (04:00 NY = 10:00 PL)
   - Timezone: America/New_York

3. SPRAWDŹ HTTP Request node:
   - Method: POST
   - URL: {{ $env.BET_ASSISTANT_API_URL }}/api/webhooks/n8n/import-matches
   - Header: x-n8n-api-key = {{ $env.BET_ASSISTANT_WEBHOOK_KEY }}
   - Body:
     {
       "daysAhead": 1,
       "async": true
     }

4. Save + Activate

⚠️ UWAGA: Upewnij się że Keep-Alive jest aktywny PRZED aktywacją tego workflow!
```

---

## KROK 3: Weryfikacja Konfiguracji

### 3.1. Test API Key

```bash
# Otwórz PowerShell:

$headers = @{
    "x-n8n-api-key" = "TWOJ_KLUCZ_Z_RENDER"
}

Invoke-RestMethod -Uri "https://bet-assistant-backend.onrender.com/api/webhooks/n8n/health" -Headers $headers

# Oczekiwany wynik:
# success      : True
# status       : healthy
# checks       : @{database=ok; apiFootballKey=configured}
```

**Jeśli błąd 401 Unauthorized:**
- Sprawdź czy klucz w n8n Variables pasuje do Render Environment
- Sprawdź czy nie ma spacji przed/po kluczu

### 3.2. Sprawdź Render Logs

```bash
# Render Dashboard → bet-assistant-backend → Logs

# Po wykonaniu Manual Wake Worker powinieneś zobaczyć:
[backend-server] GET /api/webhooks/n8n/health 200 50ms
[backend-server] GET /api/webhooks/n8n/import-jobs/status 200 120ms
```

### 3.3. Monitoruj Keep-Alive Executions

```bash
# n8n → Executions → Filtr: "Keep-Alive"

# Sprawdź za:
- 10 minut → pierwsze wykonanie
- 20 minut → drugie wykonanie
- 30 minut → trzecie wykonanie

# Każde powinno mieć status: Success ✓
# Każde powinno trwać < 5 sekund (jeśli backend nie spał)
```

---

## KROK 4: Troubleshooting

### Problem 1: "Unauthorized" w Manual Wake Worker

**Symptom:**
```
Error: 401 Unauthorized
{
  "success": false,
  "error": "Unauthorized - Invalid API key"
}
```

**Diagnoza:**
```bash
# Sprawdź n8n Variables
n8n → Settings → Variables
BET_ASSISTANT_WEBHOOK_KEY = ?

# Sprawdź Render Environment
Render Dashboard → bet-assistant-backend → Environment
N8N_WEBHOOK_KEY = ?

# Muszą być IDENTYCZNE!
```

**Rozwiązanie:**
```bash
# Usuń i dodaj ponownie zmienną w n8n:
1. n8n → Variables → Usuń BET_ASSISTANT_WEBHOOK_KEY
2. Skopiuj DOKŁADNIE klucz z Render (bez spacji!)
3. Dodaj ponownie w n8n
4. Test workflow ponownie
```

### Problem 2: Keep-Alive nie wykonuje się

**Symptom:**
```
n8n → Executions → brak wykonań "Keep-Alive"
```

**Diagnoza:**
```bash
# Sprawdź czy workflow aktywny:
n8n → Workflows → "Keep-Alive - Render Worker"
Status: Active (zielony) lub Inactive (szary)?
```

**Rozwiązanie:**
```bash
1. Kliknij workflow
2. Kliknij przełącznik "Inactive" → "Active"
3. Czekaj 10 minut
4. Sprawdź Executions ponownie
```

### Problem 3: Backend timeout podczas Manual Wake

**Symptom:**
```
Error: Timeout - Server did not respond in 60000ms
```

**Przyczyna:**
Cold start Render trwa dłużej niż zwykle (przeciążenie)

**Rozwiązanie:**
```bash
1. Poczekaj 2 minuty
2. Uruchom Manual Wake Worker ponownie
3. Powinno zadziałać (backend już obudzony)

# Jeśli nadal timeout:
- Sprawdź Render Dashboard → bet-assistant-backend
- Status: Building / Deploying / Live?
- Jeśli "Building" → czekaj na zakończenie deploy
```

### Problem 4: Keep-Alive execution "Success" ale backend nadal usypia

**Symptom:**
```
Manual Wake Worker trwa 30-40s (cold start)
mimo że Keep-Alive wykonał się 5 min temu
```

**Diagnoza:**
```bash
# Sprawdź response time Keep-Alive execution:
n8n → Executions → Kliknij ostatnie wykonanie Keep-Alive
Node "Health Check" → Execution time: ?

# Jeśli > 20s → backend spał mimo wszystko
```

**Możliwe przyczyny:**
```bash
1. Keep-Alive timeline poza harmonogramem (sprawdź timezone)
2. Render Free Tier osiągnął limit 750h (sprawdź usage)
3. Render restart/maintenance
```

---

## KROK 5: Finalna Weryfikacja

### Checklist przed produkcją:

```
☐ Keep-Alive workflow zaimportowany i AKTYWNY
☐ Keep-Alive executions pojawiają się co 10 minut
☐ Manual Wake Worker działa (test przeszedł)
☐ Backend respond time < 5s (nie usypia)
☐ Environment Variables poprawnie skonfigurowane
☐ Render logs pokazują GET /health co 10 min

☐ (Opcjonalnie) Daily Import workflow zaimportowany i aktywny
☐ (Opcjonalnie) Update Results workflow skonfigurowany
```

### Sprawdź Render Usage:

```bash
Render Dashboard → bet-assistant-backend → Usage

# Powinno pokazywać:
Current month usage: ~50-100 hours (po kilku dniach)

# Keep-Alive zużywa:
13h/dzień × liczba dni = expected usage

# Jeśli Usage > 70% po tygodniu → rozważ zmniejszenie harmonogramu
```

---

## FAQ

**Q: Czy muszę mieć Keep-Alive aktywny 24/7?**  
A: Nie! Obecna konfiguracja (10-16, 20-03 NY) to tylko 13h/dzień (52% limitu). Możesz zmniejszyć do 10-13 NY (16% limitu) jeśli chcesz oszczędzać.

**Q: Co jeśli przekroczę 750h/miesiąc Render Free Tier?**  
A: Render przestanie akceptować requesty. Rozwiązanie: Upgrade do Starter ($7/miesiąc) lub zmniejsz harmonogram Keep-Alive.

**Q: Czy mogę używać tylko Manual Wake Worker bez Keep-Alive?**  
A: Tak, ale worker nie wznowi rate limited jobs automatycznie. Będziesz musiał ręcznie budzić serwis po każdym rate limit (co 15 min).

**Q: Ile kosztuje n8n cloud?**  
A: Self-hosted (localhost): $0. n8n.cloud: od $20/miesiąc. Zalecane: self-hosted na swoim komputerze lub VPS.

**Q: Czy n8n musi działać 24/7?**  
A: Jeśli używasz Docker/VPS - tak. Jeśli localhost - nie, ale Keep-Alive i Daily Import nie zadziałają gdy komputer wyłączony.

---

## Co dalej?

**Po pomyślnej konfiguracji:**

1. **Usuń ten plik** (`INSTALACJA-N8N.md`) - to tymczasowa instrukcja
2. **Dokumentacja produkcyjna:** `Dokumentacja/dokumentacja techniczna` sekcja 12
3. **Szczegóły techniczne:** `Dokumentacja/n8n-automation-tech.md`
4. **User guide:** `n8n-workflows/README.md`

**Następne kroki:**
1. Monitoruj executions przez tydzień
2. Sprawdź Render usage po tygodniu
3. Skonfiguruj pozostałe workflows (Update Results, Backup)
4. (Opcjonalnie) Przenieś n8n na VPS jeśli localhost nie działa 24/7

---

**W razie problemów:**
- Sprawdź `Dokumentacja/n8n-automation-tech.md` sekcja "Troubleshooting"
- Render logs: Dashboard → Logs
- n8n logs: Executions → Zobacz szczegóły błędu

**Status instalacji:** ✅ Backend deployed | ⏳ n8n configuration | ⏳ Testing
