# 🎓 n8n Tutorial - Krok Po Kroku

**Cel:** Nauczysz się n8n budując system automatyzacji dla Bet Assistant 2.0

**Czas:** ~2-3 godziny  
**Poziom:** Początkujący → Zaawansowany

---

## 📚 Spis treści

1. [Czym jest n8n?](#czym-jest-n8n)
2. [Instalacja i pierwsze kroki](#instalacja)
3. [Podstawy: Twój pierwszy workflow](#pierwszy-workflow)
4. [Lekcja 1: Codzienny import meczów](#lekcja-1-import)
5. [Lekcja 2: Aktualizacja wyników](#lekcja-2-update)
6. [Lekcja 3: Backup bazy danych](#lekcja-3-backup)
7. [Lekcja 4: Monitoring i alerty](#lekcja-4-monitoring)
8. [Zaawansowane techniki](#zaawansowane)
9. [Troubleshooting](#troubleshooting)

---

## Czym jest n8n?

**n8n** to narzędzie do **automatyzacji workflow** (podobne do Zapier, ale open-source i self-hosted).

### Kluczowe koncepcje:

```
┌─────────────┐
│   TRIGGER   │ ← Uruchamia workflow (cron, webhook, manual)
└──────┬──────┘
       │
┌──────▼──────┐
│    NODE     │ ← Wykonuje akcję (HTTP request, transform data, itp.)
└──────┬──────┘
       │
┌──────▼──────┐
│    NODE     │ ← Kolejna akcja
└──────┬──────┘
       │
┌──────▼──────┐
│   OUTPUT    │ ← Końcowy rezultat (email, slack, database, itp.)
└─────────────┘
```

### Przykład z życia:
```
Trigger: Cron (codziennie 10:00)
  ↓
Node: HTTP Request (pobierz mecze z API)
  ↓
Node: Filter (tylko Premier League)
  ↓
Output: Slack notification (wyślij podsumowanie)
```

---

## Instalacja

### Krok 1: Wybierz metodę instalacji

Masz 3 opcje:

#### Opcja A: **Docker** (ZALECANE dla początkujących)
```powershell
# Otwórz PowerShell i uruchom:
docker run -it --rm `
  --name n8n `
  -p 5678:5678 `
  -v n8n_data:/home/node/.n8n `
  n8nio/n8n
```

**Plusy:** Łatwa instalacja, izolowane środowisko  
**Minusy:** Wymaga Docker Desktop

#### Opcja B: **npm** (jeśli masz Node.js)
```powershell
npm install -g n8n
n8n start
```

**Plusy:** Szybkie, bez Docker  
**Minusy:** Może konfliktować z innymi pakietami npm

#### Opcja C: **n8n.cloud** (hosted w chmurze)
Przejdź na: https://n8n.cloud

**Plusy:** Zero instalacji, dostęp z dowolnego miejsca  
**Minusy:** Płatne (po trial), dane w chmurze

### Krok 2: Otwórz n8n UI

Po uruchomieniu, przejdź do:
```
http://localhost:5678
```

Jeśli to pierwsze uruchomienie, n8n poprosi o:
- **Email** (do konta)
- **Hasło** (wybierz silne!)

### Krok 3: Zapoznaj się z interfejsem

```
┌─────────────────────────────────────────────────────────────┐
│  [n8n]  Workflows  Credentials  Executions  Settings   👤   │ ← Top menu
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐                                           │
│  │   Canvas     │ ← Tutaj przeciągasz i łączysz node'y     │
│  │              │                                           │
│  │     🔷       │                                           │
│  │      ↓       │                                           │
│  │     🔷       │                                           │
│  │              │                                           │
│  └──────────────┘                                           │
│                                                              │
│  [+ Add node]    ← Kliknij aby dodać nowy node             │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  [Execute Workflow]  [Save]  [Settings]                     │ ← Akcje
└─────────────────────────────────────────────────────────────┘
```

**✅ CHECKPOINT:** Masz otwarte n8n UI i widzisz pusty canvas

---

## Pierwszy Workflow

### Cel: Zbuduj prosty workflow który testuje połączenie z Bet Assistant API

### Krok 1: Utwórz nowy workflow

1. Kliknij **"Workflows"** w top menu
2. Kliknij **"+ Add Workflow"**
3. Nazwij go: `Test - Połączenie z API` (kliknij tytuł "My workflow")

### Krok 2: Dodaj trigger - Manual

1. Kliknij **"+ Add first step"**
2. W search wpisz: `manual`
3. Wybierz **"Manual Trigger"** (On clicking 'execute')

**Co to robi?** Workflow uruchomi się gdy klikniesz "Execute Workflow"

### Krok 3: Dodaj HTTP Request node

1. Kliknij **"+" na dole Manual Trigger node**
2. Wpisz: `http`
3. Wybierz **"HTTP Request"**
4. Skonfiguruj:
   - **Method:** GET
   - **URL:** `http://localhost:3000/api/webhooks/n8n/health`
   - Kliknij **"Add Parameter"** → **Headers**
   - **Name:** `x-n8n-api-key`
   - **Value:** `test-key-for-now` (zmienisz później)

### Krok 4: Wykonaj test

1. Uruchom Bet Assistant backend (jeśli nie działa):
   ```powershell
   cd "d:\narzędzia\Bet Assistant 2.0\server"
   npm run dev
   ```

2. W n8n kliknij **"Execute Workflow"** (góra, po prawej)

### Krok 5: Zobacz rezultat

Jeśli backend działa, zobaczysz **błąd 401 Unauthorized** - to DOBRZE!
Znaczy że API odpowiada, ale wymaga prawdziwego klucza.

**Canvas powinien pokazać:**
```json
{
  "success": false,
  "error": "Unauthorized - Invalid API key"
}
```

### Krok 6: Wygeneruj prawdziwy API key

Otwórz nowy PowerShell:
```powershell
# Wygeneruj bezpieczny klucz
$bytes = New-Object byte[] 32
[Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
$apiKey = [Convert]::ToBase64String($bytes)
Write-Host "Twój klucz API:"
Write-Host $apiKey
```

Skopiuj wygenerowany klucz!

### Krok 7: Dodaj klucz do .env

Otwórz: `d:\narzędzia\Bet Assistant 2.0\.env`

Dodaj/zmień linię:
```env
N8N_WEBHOOK_KEY=<tu-wklej-wygenerowany-klucz>
```

**Restart backend** (Ctrl+C w terminalu, potem znowu `npm run dev`)

### Krok 8: Dodaj klucz do n8n jako zmienną

1. W n8n idź do **Settings** (góra prawo, ikona ⚙️)
2. **Environment Variables**
3. Kliknij **"+ Add Variable"**
4. **Name:** `BET_ASSISTANT_WEBHOOK_KEY`
5. **Value:** `<ten-sam-klucz-co-w-env>`
6. Kliknij **"Save"**

### Krok 9: Użyj zmiennej w workflow

Wróć do swojego workflow:

1. Kliknij na **HTTP Request node**
2. W Header `x-n8n-api-key` zmień value na:
   ```
   {{ $env.BET_ASSISTANT_WEBHOOK_KEY }}
   ```
   *(Dwukrotne nawiasy klamrowe {{ }} to składnia n8n dla zmiennych)*

3. Kliknij **"Execute Workflow"** ponownie

### Krok 10: SUCCESS! 🎉

Teraz powinieneś zobaczyć:
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

**✅ GRATULACJE!** Stworzyłeś swój pierwszy działający workflow w n8n!

### Co się nauczyłeś:
- ✅ Jak dodawać node'y
- ✅ Jak konfigurować HTTP Request
- ✅ Jak używać zmiennych środowiskowych `{{ $env.NAZWA }}`
- ✅ Jak testować workflows
- ✅ Jak czytać resultat

**Zapisz workflow:** Kliknij **"Save"** (góra)

---

## Lekcja 1: Codzienny Import Meczów {#lekcja-1-import}

### Cel: Workflow który automatycznie importuje mecze codziennie o 10:00

### Krok 1: Utwórz nowy workflow

1. **Workflows** → **+ Add Workflow**
2. Nazwa: `Codzienny Import Meczów`

### Krok 2: Dodaj Schedule Trigger (Cron)

1. **+ Add first step**
2. Wpisz: `schedule`
3. Wybierz **"Schedule Trigger"**
4. Konfiguracja:
   - **Trigger Interval:** Custom (cron expression)
   - **Cron Expression:** `0 10 * * *`
   
**Co to znaczy?** 
```
0    10   *   *   *
│    │    │   │   │
│    │    │   │   └─ Dzień tygodnia (any)
│    │    │   └───── Miesiąc (any)
│    │    └───────── Dzień miesiąca (any)
│    └────────────── Godzina (10)
└─────────────────── Minuta (0)

Wynik: Codziennie o 10:00
```

💡 **Tip:** Użyj https://crontab.guru do generowania cronów

### Krok 3: Dodaj node do przygotowania parametrów

1. Kliknij **"+" pod Schedule Trigger**
2. Wpisz: `set`
3. Wybierz **"Set"** node
4. Konfiguracja:
   - Kliknij **"Add Value"** → **String**
     - **Name:** `apiKey`
     - **Value:** `{{ $env.BET_ASSISTANT_WEBHOOK_KEY }}`
   
   - Kliknij **"Add Value"** → **Number**
     - **Name:** `daysAhead`
     - **Value:** `1`

**Co to robi?** Przygotowuje dane które wyślemy do API

### Krok 4: Dodaj HTTP Request do importu

1. Kliknij **"+" pod Set node**
2. Wybierz **"HTTP Request"**
3. Konfiguracja:
   - **Method:** POST
   - **URL:** `http://localhost:3000/api/webhooks/n8n/import-matches`
   
   - **Send Headers:** ON (toggle)
   - Kliknij **"+ Add Header"**
     - **Name:** `x-n8n-api-key`
     - **Value:** `{{ $json.apiKey }}`
   
   - **Send Body:** ON (toggle)
   - **Body Content Type:** JSON
   - **Specify Body:** Using JSON
   - **JSON:** 
     ```json
     {
       "daysAhead": {{ $json.daysAhead }}
     }
     ```
   
   - **Options** → **Timeout:** `300000` (5 minut)

**Co to robi?** Wysyła POST request do API z parametrami importu

### Krok 5: Dodaj node do sprawdzenia sukcesu

1. Kliknij **"+" pod HTTP Request**
2. Wpisz: `if`
3. Wybierz **"IF"** node
4. Konfiguracja:
   - **Value 1:** `{{ $json.success }}`
   - **Operation:** Equal
   - **Value 2:** `true` (Boolean)

**Co to robi?** Sprawdza czy `success: true` w odpowiedzi

### Krok 6: Dodaj powiadomienie o sukcesie (opcjonalne)

Jeśli masz Slacka/Email, dodaj tutaj. Jeśli nie - pomiń ten krok.

Dla prostoty, dodamy **"Stop and Error"** node dla błędów:

1. Z **IF node** połącz **FALSE** output (czerwony) z nowym node
2. Wpisz: `stop`
3. Wybierz **"Stop and Error"**
4. Konfiguracja:
   - **Error Message:** 
     ```
     Import failed: {{ $json.error || 'Unknown error' }}
     ```

### Krok 7: Test workflow (manual)

1. **WAŻNE:** Zmień Schedule Trigger na Manual Trigger tymczasowo
   - Kliknij na Schedule Trigger node
   - Górny prawy róg: kliknij **"..."** → **Replace Node**
   - Wybierz **"Manual Trigger"**

2. Kliknij **"Execute Workflow"**

3. Sprawdź rezultat w HTTP Request node

### Krok 8: Przywróć Schedule Trigger

1. Kliknij na Manual Trigger
2. **"..."** → **Replace Node**
3. Wybierz **"Schedule Trigger"**
4. Ustaw cron: `0 10 * * *`

### Krok 9: Aktywuj workflow

1. Kliknij **"Save"**
2. **WAŻNE:** Przełącznik **"Active"** (góra prawo) → ON

**Teraz workflow będzie działał automatycznie codziennie o 10:00!**

### 🎯 Co się nauczyłeś:

- ✅ Schedule Trigger (cron)
- ✅ Set node (przygotowanie danych)
- ✅ HTTP Request POST z JSON body
- ✅ IF node (warunkowa logika)
- ✅ Używanie `{{ $json.propertyName }}` do dostępu do danych
- ✅ Aktywacja automatycznych workflows

---

## Lekcja 2: Aktualizacja Wyników {#lekcja-2-update}

### Cel: Workflow który aktualizuje wyniki o 0:01

**ĆWICZENIE:** Spróbuj zbudować to sam, używając tego co nauczyłeś się w Lekcji 1!

### Wskazówki:

<details>
<summary>Kliknij aby pokazać wskazówki</summary>

1. **Schedule Trigger:** `1 0 * * *` (00:01)
2. **Set node:** apiKey + daysBack = 1
3. **HTTP Request POST:** 
   - URL: `http://localhost:3000/api/webhooks/n8n/update-results`
   - Body: `{ "daysBack": {{ $json.daysBack }} }`
4. **IF node:** sprawdź success
5. **Active:** ON

</details>

### Rozwiązanie krok po kroku:

<details>
<summary>Kliknij aby pokazać pełne rozwiązanie</summary>

1. Nowy workflow: `Aktualizacja Wyników`

2. Schedule Trigger:
   - Cron: `1 0 * * *`

3. Set node:
   - apiKey (String): `{{ $env.BET_ASSISTANT_WEBHOOK_KEY }}`
   - daysBack (Number): `1`

4. HTTP Request:
   - Method: POST
   - URL: `http://localhost:3000/api/webhooks/n8n/update-results`
   - Header: `x-n8n-api-key` = `{{ $json.apiKey }}`
   - Body: `{ "daysBack": {{ $json.daysBack }} }`
   - Timeout: 180000 (3 min)

5. IF node:
   - Value1: `{{ $json.success }}`
   - Operation: Equal
   - Value2: `true`

6. (Opcjonalnie) Stop and Error dla FALSE

7. Save + Active ON

</details>

---

## Lekcja 3: Backup Bazy Danych {#lekcja-3-backup}

### Cel: Workflow który robi backup o północy + commituje do Git

### Krok 1: Podstawowy workflow backupu

Powtórz schemat z poprzednich lekcji:

1. Schedule Trigger: `0 0 * * *` (midnight)
2. Set node: apiKey
3. HTTP Request POST:
   - URL: `http://localhost:3000/api/webhooks/n8n/backup-database`
   - Body: `{ "pushToGit": false, "skipIfNoChanges": true }`

### Krok 2: NOWE - Dodaj Git commit po backupie

To jest **zaawansowana** lekcja!

1. Po HTTP Request (jeśli success), dodaj **Execute Command** node
2. Wpisz: `execute command`
3. Wybierz **"Execute Command"**
4. Konfiguracja:
   - **Command:** 
     ```bash
     cd "d:\narzędzia\Bet Assistant 2.0\backups" && git add . && git commit -m "Automated backup: {{ $now.toFormat('yyyy-MM-dd HH:mm') }}" && git push
     ```

**UWAGA:** Ten node wymaga:
- Git zainstalowany
- Folder `backups/` jako Git repo
- Skonfigurowane credentials (git config)

**Jeśli nie masz Git** - pomiń ten krok i zostaw tylko HTTP Request.

### Krok 3: Dodaj powiadomienie o błędzie

Backup to **krytyczna** operacja - MUSISZ wiedzieć gdy się nie powiedzie!

1. Z IF node (FALSE output) dodaj:
   - **Slack** lub **Email** node z alertem
   - **Stop and Error** node

---

## Lekcja 4: Monitoring i Alerty {#lekcja-4-monitoring}

### Cel: Workflow który co 15 min sprawdza czy system działa

### Krok 1: Schedule co 15 minut

Schedule Trigger:
- Cron: `*/15 * * * *`

**Co to znaczy?** `*/15` = co 15 minut

### Krok 2: RÓWNOLEGŁE requesty

**NOWA TECHNIKA:** Możemy wywołać 2 endpointy jednocześnie!

1. Po Schedule Trigger, dodaj **2 HTTP Request nodes obok siebie**:

**Node 1 - Health Check:**
- GET `http://localhost:3000/api/webhooks/n8n/health`
- Header: x-n8n-api-key

**Node 2 - Status:**
- GET `http://localhost:3000/api/webhooks/n8n/status`
- Header: x-n8n-api-key

Jak to zrobić?
1. Dodaj pierwszy HTTP Request normalnie (pod Schedule)
2. Kliknij na **Schedule Trigger node**
3. Zobacz **mały "+"** - przeciągnij go OBOK pierwszego HTTP Request
4. To stworzy drugi branch (równoległy)

### Krok 3: Warunki monitoringu

Dodaj IF nodes aby sprawdzić:

1. **IF - Czy system działa?**
   - Input: z Health Check node
   - Condition: `{{ $json.success }}` = `true`

2. **IF - Czy niska liczba meczów?**
   - Input: z Status node
   - Condition: `{{ $json.stats.totalMatches }}` < `100`

### Krok 4: Alerty

Dla FALSE outputs - dodaj powiadomienia!

---

## Zaawansowane Techniki {#zaawansowane}

### 1. Używanie expressions ({{ }})

**Podstawy:**
```javascript
{{ $json.propertyName }}          // Dostęp do danych
{{ $env.VARIABLE }}               // Zmienne środowiskowe
{{ $now.toFormat('yyyy-MM-dd') }} // Data dzisiaj
{{ $now.plus({ days: 1 }) }}      // Jutro
```

**Zaawansowane:**
```javascript
{{ $json.stats.imported + $json.stats.failed }} // Matematyka

{{ $json.error || 'Unknown error' }}            // Fallback

{{ $json.leagues.length > 5 ? 'Many' : 'Few' }} // Ternary

{{ JSON.stringify($json, null, 2) }}            // Format JSON
```

### 2. Łączenie wielu nodes

Jeden node może mieć **wiele inputów**:

```
Node A ─┐
        ├─→ Node C (łączy dane z A i B)
Node B ─┘
```

Użyj w Node C:
```javascript
{{ $node["Node A"].json.value }}  // Dane z konkretnego node
{{ $node["Node B"].json.value }}
```

### 3. Loops (pętle)

**Split In Batches** node:
```
Input: [1,2,3,4,5]
Batch Size: 2

Loop 1: [1,2]
Loop 2: [3,4]
Loop 3: [5]
```

### 4. Error handling

**Try/Catch pattern:**

```
HTTP Request
  ↓ (error output - czerwony)
Set Error Message
  ↓
Slack Alert
```

Włącz "Continue on Fail" w HTTP Request node!

### 5. Debugging

**Najlepsze praktyki:**

1. **Dodaj "Edit Fields" node** po każdym kroku aby zobaczyć dane
2. Użyj **manual trigger** do testowania
3. Sprawdzaj **Executions** (menu górne) - historia wszystkich uruchomień
4. Kliknij na execution aby zobaczyć flow danych przez każdy node

---

## Troubleshooting {#troubleshooting}

### Problem: "Unauthorized" mimo prawidłowego klucza

**Rozwiązanie:**
1. Sprawdź czy klucz w `.env` jest identyczny jak w n8n Environment Variables
2. Restart backend po zmianie `.env`
3. Sprawdź czy używasz `{{ $env.BET_ASSISTANT_WEBHOOK_KEY }}` a nie hard-coded klucza

### Problem: Timeout w HTTP Request

**Rozwiązanie:**
1. Zwiększ timeout: Options → Timeout → `300000` (5 min)
2. Zmniejsz zakres importu (mniej lig/dni)

### Problem: Workflow się nie uruchamia automatycznie

**Sprawdź:**
1. Czy workflow jest **Active** (toggle ON)?
2. Czy Schedule Trigger ma prawidłowy cron?
3. Czy n8n działa? (http://localhost:5678)
4. Executions → zobacz błędy

### Problem: Git push nie działa

**Rozwiązanie:**
1. Sprawdź czy folder `backups/` jest Git repo:
   ```powershell
   cd "d:\narzędzia\Bet Assistant 2.0\backups"
   git status
   ```
2. Konfiguruj Git:
   ```powershell
   git config user.name "n8n-backup"
   git config user.email "backup@betassistant.com"
   ```
3. Testuj komendę manualnie przed użyciem w n8n

### Problem: Nie widzę danych w node

**Debug:**
1. Kliknij "Execute Workflow"
2. Kliknij na każdy node aby zobaczyć INPUT/OUTPUT
3. Sprawdź czy poprzedni node zwrócił dane
4. Użyj "Edit Fields" node do transformacji jeśli potrzeba

---

## 🎓 Podsumowanie - Co osiągnąłeś

### Umiejętności n8n:

✅ **Podstawy:**
- Tworzenie workflows
- Dodawanie i konfiguracja nodes
- Testowanie (Execute Workflow)
- Zapisywanie i aktywacja

✅ **Triggers:**
- Manual Trigger (testy)
- Schedule Trigger (cron)

✅ **Actions:**
- HTTP Request (GET/POST)
- Set (przygotowanie danych)
- IF (warunki)
- Execute Command (skrypty)
- Stop and Error (error handling)

✅ **Zaawansowane:**
- Environment Variables `{{ $env.VAR }}`
- JSON expressions `{{ $json.property }}`
- Date formatting `{{ $now.toFormat() }}`
- Równoległe branches
- Error handling

### Twój system automatyzacji:

🤖 **4 działające workflows:**
1. ⏰ Import meczów (10:00)
2. 🔄 Update wyników (00:01)
3. 💾 Backup bazy (00:00)
4. 📊 Monitoring (co 15 min)

---

## 📚 Dalsze kroki

### Naucz się więcej:

1. **n8n Documentation:** https://docs.n8n.io/
2. **n8n Community:** https://community.n8n.io/
3. **Tutorial Videos:** https://www.youtube.com/c/n8n-io
4. **Templates:** https://n8n.io/workflows

### Eksperymentuj:

1. Dodaj Slack/Email notifications
2. Zbuduj dashboard w Google Sheets
3. Dodaj więcej warunków w IF nodes
4. Stwórz workflow do analizy statystyk
5. Integruj z innymi API

### Optymalizuj:

1. Zmniejsz częstotliwość jeśli zużywasz za dużo API calls
2. Dodaj więcej error handling
3. Zbuduj bardziej zaawansowane alerty
4. Dodaj rate limiting logic

---

## 🎉 GRATULACJE!

Przeszedłeś przez cały tutorial! Teraz znasz n8n na poziomie pozwalającym:
- ✅ Budować własne automatyzacje
- ✅ Integrować różne systemy
- ✅ Debugować problemy
- ✅ Rozszerzać i optymalizować workflows

**Powodzenia w automatyzacji Bet Assistant 2.0!** 🚀

---

**Pytania?** Sprawdź:
- [README.md](README.md) - Szczegółowa dokumentacja API
- [../Dokumentacja/n8n-automation-tech.md](../Dokumentacja/n8n-automation-tech.md) - Dokumentacja techniczna
