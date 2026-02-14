# BRIEFING DLA AGENTA - BET FINDER IMPLEMENTATION

**Data utworzenia:** 31 grudnia 2025  
**Agent tworzący:** Primary Migration Agent  
**Dla:** Secondary Agent - Bet Finder Implementation Specialist  
**Status projektu:** Frontend GOTOWY ✅ | Backend DO ZROBIENIA ⏳

---

## 🎯 TWOJE ZADANIE

Zaimplementuj pełną logikę wyszukiwania typów bukmacherskich (Bet Finder) dla aplikacji Bet Assistant 2.0.

**Frontend jest już gotowy** - nie musisz go tworzyć ani modyfikować.  
**Twoja odpowiedzialność:** Backend, algorytmy, API, integracja z bazą danych.

---

## ⚠️ KRYTYCZNA REGUŁA - FOLDER "stary"

**ABSOLUTNIE ZAKAZANE: Odwoływanie się do folderu `stary/` w nowym kodzie!**

❌ **NIGDY NIE ROB TEGO:**
```typescript
import something from '../stary/...'
const filePath = path.join(process.cwd(), 'stary', '...')
```

✅ **ZAWSZE ROB TO:**
```typescript
// Pliki potrzebne do działania aplikacji muszą być w głównym katalogu
const filePath = path.join(process.cwd(), 'files', 'Lista rozgrywek.csv')
```

**POWÓD:**
- Folder `stary/` to **TYLKO REFERENCJA** do starej wersji aplikacji
- Jest używany **WYŁĄCZNIE do sprawdzania jak działał stary kod**
- Zostanie **USUNIĘTY** po zakończeniu migracji
- Wszystkie potrzebne pliki już zostały skopiowane do właściwych folderów:
  - `files/Lista rozgrywek.csv` - linki do Superbet i Flashscore
  - `config/` - konfiguracje
  - `data/` - dane aplikacji

**JEŚLI POTRZEBUJESZ PLIKU:**
1. Sprawdź czy już istnieje poza folderem `stary/`
2. Jeśli nie - skopiuj go do odpowiedniego miejsca (`files/`, `config/`, `data/`)
3. Zaktualizuj ścieżki w kodzie

---

## 📋 CO ZOSTAŁO JUŻ ZROBIONE

### ✅ Przez Primary Agent (struktura UI):

1. **BetFinderPage.tsx** (420 linii)

   - Kompletny interfejs użytkownika
   - Selektory parametrów (TOP, liczba meczów, zakres dat)
   - Modal z 17 typami zakładów (4 grupy)
   - System kolejki wyszukiwań (UI)
   - Placeholder funkcji `addToQueue()` - **CZEKA NA TWOJĄ IMPLEMENTACJĘ**

2. **BetFinderPage.module.css** (477 linii)

   - Pełen styling z gradientami
   - Responsywny design
   - Animacje i hover effects

3. **Dokumentacja techniczna**
   - [Bet Finder - Agent Instructions.md](./Bet%20Finder%20-%20Agent%20Instructions.md) - 572 linie szczegółowych instrukcji
   - Sekcja 4: Referencja do starego kodu (5562 linii JS)
   - Sekcja 5: Szczegółowe zadania (4 fazy)
   - Sekcja 7: Schemat bazy danych

---

## 🚀 CO MUSISZ ZROBIĆ

### FAZA 1: Struktura Backendowa

**1.1 Utwórz pliki:**

```
server/
  routes/
    bet-finder.ts          ← API endpoints
  src/
    services/
      bet-finder-service.ts     ← logika zarządzania kolejką
      bet-finder-algorithms.ts  ← 17 algorytmów wyszukiwania
```

**1.2 API Endpoints (bet-finder.ts):**

```typescript
POST   /api/bet-finder/search          ← Utwórz zadania wyszukiwania
GET    /api/bet-finder/queue            ← Pobierz kolejkę
GET    /api/bet-finder/queue/:id        ← Pobierz zadanie + wyniki
DELETE /api/bet-finder/queue/:id        ← Usuń z kolejki
POST   /api/bet-finder/process/:id      ← Ręczne uruchomienie
```

**1.3 Interfejsy TypeScript:**

```typescript
interface SearchParams {
  betTypes: string[]; // ['winner-vs-loser', 'most-goals', ...]
  topCount: number; // 5 | 10 | 15 | 20
  matchCount: number; // 5 | 10 | 15 | 20 | 30 | 50 | 'all'
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
}

interface SearchJob {
  id: number;
  searchType: string;
  status: "pending" | "running" | "completed" | "failed";
  topCount: number;
  matchCount: number;
  dateFrom: string;
  dateTo: string;
  results?: MatchResult[];
  error?: string;
  progress?: number;
  createdAt: Date;
  completedAt?: Date;
}

interface MatchResult {
  homeTeam: string;
  awayTeam: string;
  date: string;
  league: string;
  homeScore?: number;
  awayScore?: number;
  homeCorners?: number;
  awayCorners?: number;
  // ... inne dane statystyczne
}
```

### FAZA 2: Algorytmy Wyszukiwania (17 typów)

**Grupa 1: REZULTAT (1 typ)**

- `winner-vs-loser` - Drużyny z największą różnicą wygranych vs przegranych

**Grupa 2: BRAMKI (5 typów)**

- `most-goals` - Najwięcej bramek (suma home + away)
- `least-goals` - Najmniej bramek
- `goal-advantage` - Największa przewaga bramkowa (różnica strzelonych i straconych)
- `most-bts` - Najwięcej meczów z BTS (Both Teams To Score)
- `no-bts` - Najwięcej meczów bez BTS

**Grupa 3: ROŻNE (5 typów)**

- `most-corners-match` - Najwięcej rożnych w meczu (suma obu drużyn)
- `least-corners-match` - Najmniej rożnych w meczu
- `most-corners-team` - Drużyna z największą liczbą rożnych
- `least-corners-team` - Drużyna z najmniejszą liczbą rożnych
- `corner-advantage` - Największa przewaga rożnych

**Grupa 4: HOME/AWAY (6 typów)**

- `home-wins` - Najwięcej wygranych u siebie
- `away-wins` - Najwięcej wygranych na wyjeździe
- `home-losses` - Najwięcej przegranych u siebie
- `away-losses` - Najwięcej przegranych na wyjeździe
- `home-advantage` - Największa przewaga u siebie (wygrane - przegrane)
- `away-advantage` - Największa przewaga na wyjeździe

**Każdy algorytm powinien:**

1. Pobrać mecze z zakresu dat (`dateFrom` - `dateTo`)
2. Pogrupować mecze według drużyn
3. Obliczyć statystyki dla każdej drużyny
4. Posortować drużyny według kryterium
5. Wybrać TOP X drużyn (`topCount`)
6. Pobrać Y ostatnich meczów każdej drużyny (`matchCount`)
7. Zwrócić wyniki w formacie `MatchResult[]`

### FAZA 3: Integracja z Frontendem

**3.1 Zaktualizuj `addToQueue()` w BetFinderPage.tsx:**

```typescript
const addToQueue = async () => {
  if (selectedBetTypes.length === 0) {
    alert("Wybierz przynajmniej jeden typ zakładu");
    return;
  }

  try {
    const response = await fetch(
      "http://localhost:3000/api/bet-finder/search",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          betTypes: selectedBetTypes,
          topCount,
          matchCount,
          dateFrom,
          dateTo,
        }),
      }
    );

    const data = await response.json();

    if (data.success) {
      // Dodaj zadania do lokalnej kolejki
      const newJobs = data.jobs.map((job) => ({
        id: job.id,
        searchType: job.searchType,
        status: job.status,
        createdAt: job.createdAt,
      }));

      setSearchQueue((prev) => [...prev, ...newJobs]);
      setShowAutoAddModal(false);
      setSelectedBetTypes([]);

      // Opcjonalnie: Pokaż komunikat sukcesu
      console.log(`✅ Dodano ${data.jobsCreated} zadań do kolejki`);
    }
  } catch (error) {
    console.error("Error adding to queue:", error);
    alert("Błąd podczas dodawania do kolejki");
  }
};
```

**3.2 Dodaj polling dla aktualizacji statusu:**

```typescript
useEffect(() => {
  if (searchQueue.length === 0) return;

  const interval = setInterval(async () => {
    try {
      const response = await fetch(
        "http://localhost:3000/api/bet-finder/queue"
      );
      const jobs = await response.json();
      setSearchQueue(jobs);
    } catch (error) {
      console.error("Error fetching queue:", error);
    }
  }, 2000); // co 2 sekundy

  return () => clearInterval(interval);
}, [searchQueue.length]);
```

### FAZA 4: Wyświetlanie Wyników i Przenoszenie do Strefy Typera

**⚠️ WAŻNA ZMIANA KONCEPCJI:**

- **NIE TWORZYMY** modali z wynikami
- **ZAMIAST TEGO:** Automatyczne przenoszenie do Strefy Typera + sekcja "Zakończone wyszukiwania"

**4.1 Sekcja "Zakończone wyszukiwania" w BetFinderPage.tsx:**

Dodaj pod kolejką sekcję pokazującą zakończone wyszukiwania:

```typescript
{
  /* Sekcja Zakończone Wyszukiwania */
}
<div className={styles.completedSection}>
  <h3>📋 Zakończone wyszukiwania</h3>
  {searchQueue
    .filter((job) => job.status === "completed")
    .map((job) => (
      <div key={job.id} className={styles.completedItem}>
        <div className={styles.completedInfo}>
          <span className={styles.completedType}>{job.searchType}</span>
          <span className={styles.completedStats}>
            {job.results?.length || 0} wyników •{job.matchCount} meczów •
            {job.dateFrom} - {job.dateTo}
          </span>
        </div>
        <button onClick={() => deleteFromQueue(job.id)}>🗑️</button>
      </div>
    ))}
</div>;
```

**4.2 Automatyczne przenoszenie do Strefy Typera:**

Po zakończeniu wyszukiwania, wyniki **automatycznie** trafiają do arkusza "Strefa Typera" (Google Sheets "Bet Builder").

**📖 SZCZEGÓŁY PRZENOSZENIA - PRZECZYTAJ TEN PLIK:**

📁 [Instrukcje - wyszukiwarka automatyczna.txt](./Instrukcje%20-%20wyszukiwarka%20automatyczna.txt)

**Ten plik zawiera:**

- ✅ Dokładny schemat przenoszenia ze starego narzędzia
- ✅ Lokalizacje plików w `stary/` (frontend + backend)
- ✅ Algorytmy obliczania szansy (próg 60%)
- ✅ Mapowanie typów wyszukiwań na zakłady (modal-types-config.json)
- ✅ Struktura danych przekazywanych do Strefy Typera
- ✅ Endpoint API: `/api/strefa-typera/add-match-bet-builder`

**Kluczowe lokalizacje w starym kodzie:**

```
stary/public/js/bet-finder.js         - Linia ~2903: autoAddResultsToBetBuilder()
stary/server/routes/strefa-typera.ts  - Linia ~450-600: endpoint POST
stary/public/modal-types-config.json  - Mapowanie typów
stary/server/utils/bet-statistics.ts  - Obliczenia statystyk
```

**4.3 Co musisz zaimplementować:**

1. **Po zakończeniu jobu (status === 'completed'):**
   - Automatycznie wywołaj przenoszenie do Strefy Typera
   - Użyj logiki z `autoAddResultsToBetBuilder()` (stary kod)
2. **Endpoint do wykorzystania:**

   ```
   POST /api/strefa-typera/add-match-bet-builder
   Body: {
     homeTeam, awayTeam, league, date,
     betType, betOption, odds,
     superbetLink, flashscoreLink
   }
   ```

3. **Mapowanie typów:**

   - Skopiuj `modal-types-config.json` do nowego projektu
   - Zmapuj typ wyszukiwania (np. `most-goals`) na zakład (np. `Over 2.5`)

4. **Walidacja:**

   - Backend sprawdza: szansa >= 60% (próg twardy)
   - Minimum 4 wartości statystycznych wymagane
   - Jeśli warunki nie spełnione → skip (nie dodaje)

5. **Feedback dla użytkownika:**
   - Toast: "✅ Dodano 7 zakładów do Strefy Typera"
   - Toast: "⚠️ Pominięto 3 (szansa < 60%)"

---

## 🗄️ BAZA DANYCH

**Tabela `matches`:**

```sql
id                 INTEGER
league_id          INTEGER
season             INTEGER
round              TEXT
date               TIMESTAMP
status             TEXT (FT, NS, CANC, etc.)
home_team_id       INTEGER
home_team_name     TEXT
away_team_id       INTEGER
away_team_name     TEXT
home_score         INTEGER (NULL jeśli mecz się nie odbył)
away_score         INTEGER
home_corners       INTEGER
away_corners       INTEGER
-- ... inne kolumny
```

**Zapytanie Prisma (przykład):**

```typescript
const matches = await prisma.match.findMany({
  where: {
    date: {
      gte: new Date(dateFrom),
      lte: new Date(dateTo),
    },
    status: "FT", // tylko zakończone mecze
  },
  orderBy: {
    date: "desc",
  },
});
```

---

## 📚 ZASOBY

### Dokumentacja szczegółowa:

📖 [Bet Finder - Agent Instructions.md](./Bet%20Finder%20-%20Agent%20Instructions.md)

### Stary kod (referencja):

📂 `stary/public/js/bet-finder.js` (5562 linii)

- Linie 1-500: Inicjalizacja i UI handlers
- Linie 500-2000: Algorytmy wyszukiwania
- Linie 2000-3500: Wyświetlanie wyników
- Linie 3500-5562: Funkcje pomocnicze

### Pliki frontendowe (NIE MODYFIKUJ):

- `src/pages/BetFinderPage.tsx`
- `src/pages/BetFinderPage.module.css`

---

## ✅ KOLEJNOŚĆ IMPLEMENTACJI (PRIORYTET)

1. **START: `winner-vs-loser`** ← NAJPROSTSZY, zacznij od tego

   - Prosty algorytm (wygrane - przegrane)
   - Przetestuj cały przepływ (API → algorytm → wyniki)
   - Sprawdź integrację z frontendem

2. **Bramki: `most-goals`, `least-goals`** ← ŚREDNIA TRUDNOŚĆ

   - Podobne do siebie, łatwo przetestować

3. **BTS: `most-bts`, `no-bts`** ← WARUNEK LOGICZNY

   - Sprawdź czy `home_score > 0 AND away_score > 0`

4. **Rożne: `most-corners-match`, etc.** ← DANE Z INNEJ KOLUMNY

   - Używaj `home_corners` i `away_corners`

5. **Home/Away: wszystkie 6 typów** ← FILTROWANIE

   - Wymagają grupowania według `home_team_id` / `away_team_id`

6. **Pozostałe algorytmy**

---

## 🧪 TESTOWANIE

### 1. Test API (curl / Postman):

```bash
curl -X POST http://localhost:3000/api/bet-finder/search \
  -H "Content-Type: application/json" \
  -d '{
    "betTypes": ["winner-vs-loser"],
    "topCount": 10,
    "matchCount": 5,
    "dateFrom": "2024-01-01",
    "dateTo": "2024-12-31"
  }'
```

### 2. Test z frontendu:

1. Otwórz `http://localhost:5173/`
2. Wybierz parametry (TOP 10, 5 meczów, zakres dat)
3. Kliknij "Automatycznie dodaj typy"
4. Zaznacz "Wygrane vs Przegrane"
5. Kliknij "Dodaj do kolejki"
6. Sprawdź czy pojawia się w kolejce z statusem "pending" → "running" → "completed"

### 3. Sprawdź wyniki:

```bash
curl http://localhost:3000/api/bet-finder/queue/1
```

Powinieneś dostać:

```json
{
  "id": 1,
  "searchType": "winner-vs-loser",
  "status": "completed",
  "results": [
    {
      "homeTeam": "Man City",
      "awayTeam": "Arsenal",
      "date": "2024-12-15",
      "homeScore": 2,
      "awayScore": 1,
      ...
    }
  ]
}
```

---

## ⚠️ WAŻNE UWAGI

### DO NOT:

- ❌ Nie modyfikuj BetFinderPage.tsx (poza funkcją `addToQueue()` i dodaniem sekcji "Zakończone wyszukiwania")
- ❌ Nie zmieniaj struktury `betTypeGroups` - musi być zgodna z backendem
- ❌ Nie twórz modali z wynikami wyszukiwania (wyniki idą do Strefy Typera)
- ❌ Nie implementuj własnej logiki przenoszenia - użyj schematu ze starego projektu

### DO:

- ✅ Stwórz wszystkie pliki backendowe od zera
- ✅ Używaj Prisma do zapytań do bazy
- ✅ Dodaj dokładne logi (`console.log`) w algorytmach
- ✅ Obsługuj błędy (try-catch, statusy 400/500)
- ✅ Testuj każdy algorytm osobno przed przejściem do następnego
- ✅ **PRZECZYTAJ** [Instrukcje - wyszukiwarka automatyczna.txt](./Instrukcje%20-%20wyszukiwarka%20automatyczna.txt) przed implementacją przenoszenia
- ✅ Skopiuj `stary/public/modal-types-config.json` do nowego projektu
- ✅ Zaimplementuj automatyczne przenoszenie według schematu ze starego kodu

---

## 🚦 CHECKPOINTY

Po każdej fazie zgłoś:

**FAZA 1 DONE:**

```
✅ Utworzone pliki: bet-finder.ts, bet-finder-service.ts, bet-finder-algorithms.ts
✅ API endpoints działają (test curl)
✅ Struktura interfejsów zdefiniowana
```

**FAZA 2 DONE:**

```
✅ Zaimplementowano algorytm: winner-vs-loser
✅ Test: zwraca TOP 10 drużyn z 5 meczami każda
✅ Wyniki zawierają wszystkie wymagane pola
```

**FAZA 3 DONE:**

```
✅ Frontend wysyła żądania do API
✅ Kolejka aktualizuje się automatycznie
✅ Statusy zmieniają się: pending → running → completed
```

**FAZA 4 DONE:**

```
✅ Sekcja "Zakończone wyszukiwania" dodana
✅ Automatyczne przenoszenie do Strefy Typera działa
✅ Walidacja 60% progu zaimplementowana
✅ Toast notifications pokazują wyniki (dodane/pominięte)
```

---

## 📞 KOMUNIKACJA

**Jeśli masz pytania:**

1. Najpierw sprawdź [Bet Finder - Agent Instructions.md](./Bet%20Finder%20-%20Agent%20Instructions.md)
2. Przejrzyj stary kod: `stary/public/js/bet-finder.js`
3. Zapytaj Primary Agent (ja będę dostępny)

**Jeśli znajdziesz błędy w dokumentacji:**

- Zgłoś natychmiast
- Kontynuuj pracę z sensowną interpretacją

**Progress reporting:**

- Zgłaszaj po każdej ukończonej fazie
- Informuj o problemach jak najszybciej
- Commituj kod regularnie (nie czekaj do końca)

---

## 🎯 DEFINICJA SUKCESU

**Projekt ZAKOŃCZONY gdy:**

1. ✅ Wszystkie 17 algorytmów zaimplementowane i przetestowane
2. ✅ API działa stabilnie (obsługa błędów, walidacja)
3. ✅ Frontend integruje się z backendem (kolejka aktualizuje się)
4. ✅ Sekcja "Zakończone wyszukiwania" działa
5. ✅ Automatyczne przenoszenie do Strefy Typera działa (próg 60%, mapowanie typów)
6. ✅ Kod scommitowany i spushowany do repozytorium
7. ✅ Dokumentacja zaktualizowana (README, komentarze w kodzie)

---

**Powodzenia! 🚀**

_Primary Migration Agent_  
_31 grudnia 2025_
