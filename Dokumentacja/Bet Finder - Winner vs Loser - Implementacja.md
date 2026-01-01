# Bet Finder - Winner vs Loser - Implementacja

**Data:** 1 stycznia 2026  
**Status:** ✅ Ukończono z historią zakończonych wyszukiwań  
**Algorytm:** Winner vs Loser (analiza obu scenariuszy)

---

## 🎯 Co zostało zaimplementowane

### Backend (Server)

#### 1. **Algorytmy wyszukiwania**

- **Plik:** `server/src/services/bet-finder-algorithms.ts` (365 linii)
- **Funkcje:**
  - `searchWinnerVsLoser()` - główny algorytm (analizuje OBA scenariusze: home i away advantage)
  - `getUpcomingMatches()` - pobiera nadchodzące mecze
  - `getTeamHistory()` - pobiera historię drużyny
  - `calculateTeamStats()` - oblicza statystyki
  - `searchByType()` - router dla różnych algorytmów

#### 2. **Serwis zarządzania kolejką**

- **Plik:** `server/src/services/bet-finder-service.ts` (107 linii)
- **Funkcje:**
  - `createSearchJob()` - tworzy zadanie wyszukiwania
  - `processJob()` - przetwarza zadanie asynchronicznie
  - `getAllSearchJobs()` - pobiera kolejkę
  - `getSearchJob()` - pobiera pojedyncze zadanie
  - `deleteSearchJob()` - usuwa zadanie
  - `clearCompletedJobs()` - czyści ukończone

#### 3. **API Endpoints**

- **Plik:** `server/routes/bet-finder.ts` (150 linii)
- **Endpointy:**
  - `POST /api/bet-finder/search` - tworzy wyszukiwania
  - `GET /api/bet-finder/queue` - pobiera kolejkę
  - `GET /api/bet-finder/queue/:id` - szczegóły zadania
  - `DELETE /api/bet-finder/queue/:id` - usuwa zadanie
  - `POST /api/bet-finder/queue/clear` - czyści ukończone

#### 4. **Integracja z serwerem**

- **Plik:** `server/league-config-server.ts`
- Dodano import i routing dla Bet Finder

---

### Frontend

#### 1. **Integracja z API + Auto-import**

- **Plik:** `src/pages/BetFinderPage.tsx` (763 linie)
- **Funkcje:**
  - `loadSearchQueue()` - pobiera kolejkę z backendu + auto-import do Google Sheets
  - `addToQueue()` - wysyła wyszukiwania do backendu
  - `importToGoogleSheets()` - automatycznie importuje wyniki przez `/api/strefa-typera/add-match-bet-builder`
  - `mapSearchTypeToBet()` - mapuje typ wyszukiwania na betType/betOption (analizuje rekomendację)
  - Auto-refresh co 5 sekund
  - Tłumaczenie typów na polski
  - Wyświetlanie wyników i błędów
  - **Ochrona przed duplikatami:** useRef + localStorage + isLoadingQueue flag
  - **Podział kolejki na 2 sekcje:** Aktywne i Zakończone wyszukiwania

#### 2. **Sekcje kolejki**

- **⏳ Aktywne wyszukiwania** - zadania w trakcie (pending/running/completed bez importu)
- **✅ Zakończone wyszukiwania** - zadania zaimportowane do arkusza (historia)
  - Nie są automatycznie usuwane
  - Wizualne odróżnienie (zielony border + tło)
  - Przycisk 🗑️ przy każdym zadaniu do indywidualnego usunięcia
  - Przycisk "Wyczyść historię" do usunięcia wszystkich zakończonych
  - Pokazuje liczbę znalezionych typów

#### 3. **Import do Google Sheets**

- Automatyczny import po zakończeniu wyszukiwania
- Każdy wynik przetwarzany indywidualnie
- Serwer oblicza statystyki i wypełnia 44 kolumny (A-AR)
- Pominięcie typów poniżej 60% prawdopodobieństwa (threshold)
- Logowanie: dodane/pominięte/błędy

#### 4. **Ochrona przed duplikatami**

- `useRef` dla synchronicznego śledzenia importowanych zadań
- `isLoadingQueue` flag blokuje równoczesne wywołania
- `localStorage` dla persystencji (klucz: `bet-finder-imported-{jobId}`)
- Przycisk "🧹 Wyczyść cache" do resetowania

#### 5. **Styles**

- **Plik:** `src/pages/BetFinderPage.module.css` (565 linii)
- Dodano style dla:
  - `.resultsCount` - liczba wyników
  - `.errorMessage` - komunikaty błędów
  - `.queueItemCompleted` - wizualne odróżnienie zakończonych
  - `.deleteButton` - przycisk usuwania pojedynczego zadania
  - `.clearHistoryButton` - przycisk czyszczenia całej historii
  - `.sectionHeaderWithButton` - header sekcji z przyciskiem akcji

---

## 🔍 Algorytm "Winner vs Loser"

### Logika biznesowa (zaktualizowana):

```typescript
1. Pobierz nadchodzące mecze (dateFrom - dateTo)
2. Dla każdego meczu:
   a) Pobierz ostatnie N meczów gospodarza
   b) Oblicz % wygranych gospodarza (homeWinRate)
   c) Oblicz % przegranych gospodarza (homeLossRate)
   d) Pobierz ostatnie N meczów gościa
   e) Oblicz % wygranych gościa (awayWinRate)
   f) Oblicz % przegranych gościa (awayLossRate)

   g) SCENARIUSZ A: scoreHomeAdvantage = homeWinRate + awayLossRate
   h) SCENARIUSZ B: scoreAwayAdvantage = awayWinRate + homeLossRate

   i) Wybierz scenariusz z wyższym score
   j) Rekomendacja zawiera "Zakład: 1" lub "Zakład: 2"

3. Sortuj po score (malejąco)
4. Zwróć TOP N wyników
```

### Przykłady:

**Przykład 1 - Przewaga gospodarzy:**

```
Mecz: Arsenal vs Chelsea
- Arsenal: 70% wygranych (home)
- Chelsea: 60% przegranych (away)
- Score A (home) = 70 + 60 = 130
- Score B (away) = 30 + 20 = 50
→ Zakład: 1 (wygrana gospodarzy)
```

**Przykład 2 - Przewaga gości:**

```
Mecz: Leicester vs Man City
- Man City: 80% wygranych (away)
- Leicester: 70% przegranych (home)
- Score A (home) = 30 + 20 = 50
- Score B (away) = 80 + 70 = 150
→ Zakład: 2 (wygrana gości)
```

### Rekomendacje:

- **Mocna przewaga** (≥60% + ≥60%): "Mocna przewaga [team] ... → Zakład: X"
- **Średnia przewaga** (≥50% + ≥50%): "Średnia przewaga [team] ... → Zakład: X"
- **Słaba przewaga** (<50%): "Słaba przewaga [team] - ostrożnie ... → Zakład: X"

---

## 📊 Typy danych

### SearchParams

```typescript
{
  dateFrom: string; // "2025-12-31"
  dateTo: string; // "2026-01-05"
  topCount: number; // 5, 10, 15, 20
  matchCount: number; // 5, 10, 15, 20, 30, 50, 999
}
```

### SearchJob

```typescript
{
  id: number
  searchType: string  // "winner-vs-loser"
  status: "pending" | "running" | "completed" | "failed"
  params: SearchParams
  results?: SearchResult[]
  progress?: number   // 0-100
  error?: string
  createdAt: string
  startedAt?: string
  completedAt?: string
}
```

### SearchResult

```typescript
{
  matchId: number
  homeTeam: string
  awayTeam: string
  matchDate: string
  league: string
  country: string
  score: number       // Ranking score
  homeStats: TeamStats
  awayStats: TeamStats
  homeOdds?: number
  drawOdds?: number
  awayOdds?: number
  recommendation: string
}
```

### TeamStats

```typescript
{
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsScored: number;
  goalsConceded: number;
  winRate: number;
  lossRate: number;
  drawRate: number;
  avgGoalsScored: number;
  avgGoalsConceded: number;
}
```

---

## 🧪 Testowanie

### Jak przetestować:

1. **Uruchom aplikację:**

   ```bash
   cd "d:\narzędzia\Bet Assistant 2.0"
   npm run server    # Terminal 1 - Backend
   npm run dev       # Terminal 2 - Frontend
   ```

2. **Otwórz Bet Finder:**

   - Przejdź do `http://localhost:5174/`

3. **Wykonaj wyszukiwanie:**

   - Ustaw parametry (TOP 10, Match Count 10)
   - Wybierz daty (np. jutro)
   - Kliknij "Automatycznie dodaj typy"
   - Zaznacz "🏆 Wygrane vs Przegrane"
   - Kliknij "Dodaj do kolejki"
   - Obserwuj kolejkę (auto-refresh co 5s)

4. **Sprawdź wyniki:**

   - Status zmienia się: pending → running → completed → ⏳ Importowanie
   - Po imporcie zadanie przenosi się do sekcji "✅ Zakończone wyszukiwania"
   - Wyświetla się liczba znalezionych typów
   - Sprawdź Google Sheets - typy zostały automatycznie dodane z pełnymi statystykami

5. **Testuj ochronę przed duplikatami:**

   - Odśwież stronę podczas importu
   - Sprawdź czy typy nie pojawiły się 2x w arkuszu
   - Console pokaże: "🔒 Locked job #X" dla zadań już przetwarzanych
     Więcej algorytmów:\*\*
   - Most Goals (najwięcej bramek w meczu)
   - Least Goals (najmniej bramek w meczu)
   - Goal Advantage (przewaga bramkowa jednej drużyny)
   - Handicap 1.5 (handicap bramkowy)
   - Most BTS (obydwie strzelają najczęściej)
   - No BTS (bez bramek jednej ze stron)
   - Most/Least Corners (najwięcej/najmniej rożnych)
   - Corner Advantage (przewaga rożnych)
   - Corner Handicap (handicap rożnych)
   - Home/Away Goals (bramki u siebie/na wyjeździe)

6. **Optymalizacja:**

   - Cache wyników w bazie danych
   - Parallel processing dla wielu wyszukiwań
   - Progress bar z procentami
   - Persystencja kolejki w PostgreSQL

7. **UI Enhancements:**

   - Modal z detalami wyników (statystyki, historia meczów)
   - Filtry dla zakończonych wyszukiwań
   - Export historii do CSV
   - Sortowanie zakończonych po dacie

8. **Konfiguracja:**
   - Wczytywanie mapowania betType z `modal-types-config.json`
   - Konfigurowalne thresholdy (obecnie na sztywno 60%)
   - Własne algorytmy użytkownika

---

## 🐛 Znane problemy i rozwiązania

### ✅ ROZWIĄZANE:

1. **Duplikaty w Google Sheets**

   - **Problem:** React Strict Mode podwaja useEffect, równoczesne wywołania importu
   - **Rozwiązanie:** useRef + localStorage + isLoadingQueue flag

2. **Wszystkie typy z zakładem "1"**

   - **Problem:** Algorytm analizował tylko home advantage
   - **Rozwiązanie:** Algorytm teraz sprawdza OBA scenariusze (home + away)

3. **404 przy usuwaniu zadań**

   - **Problem:** Próba usunięcia już usuniętego zadania
   - **Rozwiązanie:** Graceful handling 404, sprawdzanie `response.status === 404`

4. **Brak widoczności zakończonych wyszukiwań**
   - **Problem:** Zadania usuwały się automatycznie po imporcie
   - **Rozwiązanie:** Dwie sekcje - Aktywne i Zakończone (historia)

### 🔍 DO MONITOROWANIA:

- Performance przy dużej liczbie meczów (>1000)
- Czas trwania wyszukiwania dla 999 meczów historii
- Stabilność auto-refresh przy długim działaniu aplikacjiomponent do wyświetlania szczegółów

2. **Więcej algorytmów:**
   - Most Goals
   - Least Goals
   - Goal Advantage
   - Handicap 1.5
   - Most BTS
   - No BTS
   - Most Corners
   - Least Corners
   - Corner Advantage
   - Home/Away Advantage
3. **Akcje na wynikach:**
   - Dodaj do Bet Builder
   - Obserwuj mecz
   - Export do CSV
4. **Optymalizacja:**
   - Cache wyników serwisu

- Każde zadanie przetwarza się asynchronicznie

### Frontend:

- React hooks (useState, useEffect, useRef)
- Fetch API do komunikacji z backendem
- Auto-refresh z useEffect + setInterval (5s)
- Tłumaczenie typów i statusów na polski
- **useRef** dla synchronicznych checków (importingJobIds, isLoadingQueue)
- **localStorage** dla persystencji stanu importu między przeładowaniami

### Ochrona przed duplikatami (3-warstwowa):

1. **useRef importingJobIds** - synchroniczne śledzenie aktualnie importowanych zadań
2. **localStorage** - persystencja (klucz: `bet-finder-imported-{jobId}`)
3. **isLoadingQueue flag** - blokada równoczesnych wywołań `loadSearchQueue()`

### Mapowanie bet type:

```typescript
// Frontend analizuje rekomendację z backendu
mapSearchTypeToBet(searchType, result) {
  if (result.recommendation.includes('Zakład: 2') ||
      result.recommendation.includes('przewaga gości')) {
    return { betType: '2', betOption: '-' } // Away win
  } else {
    return { betType: '1', betOption: '-' } // Home win
  }
}
```

### Import do Google Sheets:

- Endpoint: `/api/strefa-typera/add-match-bet-builder`
- 44 kolumny (A-AR): dane meczu + statystyki 5/10/15 meczów + H/A
- Threshold: ≥60% dla dodania do arkusza
- Response: `{ success, szanse, skipped, skipReason }`

---

**Autor:** Agent Bet Finder  
**Przejrzano przez:** -  
**Ostatnia aktualizacja:** 1 stycznia 2026  
**Wersja:** 1.1 (z historią zakończonych wyszukiwań)

## 📝 Notatki techniczne

### Baza danych:

- Używamy Prisma Client do zapytań
- Tabela: `matches`
- Indeksy: `match_date`, `home_team`, `away_team`

### Performance:

- Zapytania są optymalizowane (LIMIT, indexy)
- Auto-refresh tylko kolejki (lekkie zapytanie)
- Wyniki cache'owane w pamięci

### Frontend:

- React hooks (useState, useEffect)
- Fetch API do komunikacji z backendem
- Auto-refresh z useEffect + setInterval
- Tłumaczenie typów i statusów na polski

---

**Autor:** Agent Bet Finder  
**Przejrzano przez:** -  
**Ostatnia aktualizacja:** 31 grudnia 2025
