# INSTRUKCJE DLA NOWEGO AGENTA - BET FINDER

**Data:** 31 grudnia 2025  
**Twórca:** Agent Migracji (Primary Agent)  
**Dla:** Agent Bet Finder (Secondary Agent)

---

## 1. KONTEKST PROJEKTU

Projekt: **Bet Assistant 2.0** - Migracja z Vanilla JS do React + TypeScript  
Twój zakres: **Wyszukiwarka Typów (Bet Finder)** - implementacja logiki biznesowej

### Co zostało już zrobione (przez mnie):

✅ **Struktura UI** (BetFinderPage.tsx - 420 linii)
✅ **Styling** (BetFinderPage.module.css - 450 linii)
✅ **Stan aplikacji** (React hooks: topCount, matchCount, dateFrom, dateTo, searchQueue, selectedBetTypes)
✅ **Modal "Automatycznie dodaj typy"** - 4 grupy z checkboxami
✅ **Routing** - strona dostępna pod `/` (główna strona aplikacji)

### Co musisz zrobić (Ty):

🎯 **Implementacja logiki wyszukiwania**
🎯 **System kolejki wyszukiwań**
🎯 **Algorytmy analizy meczów**
🎯 **Integracja z backendem**
🎯 **Wyświetlanie wyników**

---

## 2. STRUKTURA KODU KTÓRĄ DOSTAŁEŚ

### BetFinderPage.tsx - Kluczowe elementy:

```typescript
// Stan (już zaimplementowany)
const [topCount, setTopCount] = useState(10); // TOP 5/10/15/20
const [matchCount, setMatchCount] = useState(10); // 5/10/15/20/30/50/all
const [dateFrom, setDateFrom] = useState(""); // YYYY-MM-DD
const [dateTo, setDateTo] = useState(""); // YYYY-MM-DD
const [searchQueue, setSearchQueue] = useState<SearchQueue[]>([]); // TODO: Implementuj
const [selectedBetTypes, setSelectedBetTypes] = useState<string[]>([]);

// Interface SearchQueue (do rozszerzenia)
interface SearchQueue {
  id: number;
  searchType: string;
  status: "pending" | "running" | "completed" | "failed";
  results?: any[]; // TODO: Zdefiniuj dokładny typ
  createdAt: string;
}
```

### Funkcja do implementacji:

```typescript
const addToQueue = async () => {
  if (selectedBetTypes.length === 0) {
    alert("Wybierz przynajmniej jeden typ zakładu");
    return;
  }

  // TODO: Tutaj implementuj logikę:
  // 1. Walidacja parametrów (dateFrom, dateTo, topCount, matchCount)
  // 2. Utworzenie zadań w kolejce dla każdego selectedBetTypes
  // 3. Wywołanie API do backendu (POST /api/bet-finder/search)
  // 4. Aktualizacja stanu searchQueue
  // 5. Zamknięcie modala i reset selectedBetTypes

  console.log("Adding to queue:", {
    betTypes: selectedBetTypes,
    topCount,
    matchCount,
    dateFrom,
    dateTo,
  });

  setShowAutoAddModal(false);
  setSelectedBetTypes([]);
};
```

---

## 3. TYPY ZAKŁADÓW (betTypeGroups)

### Grupa 1: Rezultat

- `winner-vs-loser` - Wygrane vs Przegrane

### Grupa 2: Bramki (6 typów)

- `most-goals` - Najwięcej bramek
- `least-goals` - Najmniej bramek
- `goal-advantage` - Przewaga bramkowa
- `handicap-15` - Handicap 1.5
- `most-bts` - Najwięcej BTS
- `no-bts` - Bez BTS

### Grupa 3: Rożne (4 typy)

- `most-corners` - Najwięcej rożnych
- `least-corners` - Najmniej rożnych
- `corner-advantage` - Przewaga rożnych
- `corner-handicap` - Handicap rożnych

**UWAGA:** Wykluczono "najwięcej rożnych pojedynczo" i "najmniej rożnych pojedynczo"

### Grupa 4: Dom/Wyjazd (4 typy)

- `home-advantage` - Przewaga gospodarzy
- `away-advantage` - Przewaga gości
- `home-goals` - Bramki gospodarzy
- `away-goals` - Bramki gości

---

## 4. STARY PROJEKT - REFERENCJA

**Lokalizacja:** `stary/public/js/bet-finder.js` (5562 linii)

### Kluczowe funkcje do zmigrowania:

```javascript
// Stare funkcje (vanilla JS) - do przepisania na TypeScript:
- validateDateRange() - walidacja dat
- calculateGoalStats() - statystyki bramek
- calculateFirstHalfStats() - statystyki pierwszej połowy
- calculateCornerStats() - statystyki rożnych
- calculateOffsidesStats() - statystyki spalonego
- queueWinnerVsLoser() - wygrane vs przegrane (PRIORYTET)
- queueMostGoals() - najwięcej bramek (PRIORYTET)
- queueLeastGoals() - najmniej bramek
// ... i wiele więcej
```

### Backend API (już istnieje w starym projekcie):

**Endpoint:** `GET /api/matches`
**Query params:**

- `dateFrom` - data od (YYYY-MM-DD)
- `dateTo` - data do (YYYY-MM-DD)
- `country` (optional) - filtr kraju
- `league` (optional) - filtr ligi

**Response:**

```json
[
  {
    "id": 123,
    "home_team": "Arsenal",
    "away_team": "Chelsea",
    "match_date": "2025-12-31",
    "home_goals": null, // null jeśli mecz się nie odbył
    "away_goals": null,
    "home_odds": 1.75,
    "draw_odds": 3.5,
    "away_odds": 4.2,
    "standing_home": 3,
    "standing_away": 8,
    "home_corners": null,
    "away_corners": null
    // ... więcej pól
  }
]
```

---

## 5. TWOJE ZADANIA (SZCZEGÓŁOWO)

### FAZA 1: Backend API (Priorytet)

**Cel:** Stwórz nowe endpointy dla Bet Finder

**Endpointy do utworzenia:**

1. **POST /api/bet-finder/search**

   - Body: `{ betTypes: string[], topCount: number, matchCount: number, dateFrom: string, dateTo: string }`
   - Response: `{ queueId: number, jobs: SearchJob[] }`
   - Logika: Tworzy zadania w kolejce dla każdego typu zakładu

2. **GET /api/bet-finder/queue**

   - Response: `SearchQueue[]`
   - Logika: Zwraca aktualną kolejkę wyszukiwań

3. **GET /api/bet-finder/queue/:id**

   - Response: `SearchQueue` (z results)
   - Logika: Zwraca szczegóły pojedynczego wyszukiwania

4. **DELETE /api/bet-finder/queue/:id**
   - Response: `{ success: true }`
   - Logika: Usuwa zadanie z kolejki

**Pliki do utworzenia:**

- `server/routes/bet-finder.ts` - routing
- `server/src/services/bet-finder-service.ts` - logika biznesowa
- `server/src/services/bet-finder-algorithms.ts` - algorytmy wyszukiwania

### FAZA 2: Algorytmy wyszukiwania

**Cel:** Zaimplementuj logikę wyszukiwania dla każdego typu zakładu

**Przykład: Winner vs Loser**

```typescript
// Pseudokod
async function searchWinnerVsLoser(params: SearchParams): Promise<Match[]> {
  // 1. Pobierz nadchodzące mecze (dateFrom - dateTo)
  const upcomingMatches = await getUpcomingMatches(
    params.dateFrom,
    params.dateTo
  );

  // 2. Dla każdego meczu:
  for (const match of upcomingMatches) {
    // 3. Pobierz historyczne mecze gospodarza (matchCount)
    const homeHistory = await getTeamHistory(
      match.home_team,
      params.matchCount
    );

    // 4. Oblicz % wygranych gospodarza
    const homeWinRate = calculateWinRate(homeHistory, match.home_team);

    // 5. Pobierz historyczne mecze gościa
    const awayHistory = await getTeamHistory(
      match.away_team,
      params.matchCount
    );

    // 6. Oblicz % przegranych gościa
    const awayLossRate = calculateLossRate(awayHistory, match.away_team);

    // 7. Score = homeWinRate + awayLossRate
    match.score = homeWinRate + awayLossRate;
  }

  // 8. Sortuj po score (malejąco)
  const sorted = upcomingMatches.sort((a, b) => b.score - a.score);

  // 9. Zwróć TOP N
  return sorted.slice(0, params.topCount);
}
```

**Podobnie zaimplementuj dla:**

- Most Goals (średnia bramek obu drużyn)
- Least Goals (najniższa średnia)
- Goal Advantage (jedna dużo strzela, druga dużo traci)
- Handicap 1.5 (różnica bramek ≥2)
- Most BTS (Both Teams Score)
- No BTS (przeciwieństwo)
- Most Corners, Least Corners, etc.
- Home/Away Advantage

### FAZA 3: Frontend Integration

**Cel:** Podłącz UI do backendu

**Kroki:**

1. **Funkcja addToQueue:**

```typescript
const addToQueue = async () => {
  if (selectedBetTypes.length === 0) {
    alert("Wybierz przynajmniej jeden typ zakładu");
    return;
  }

  try {
    const response = await fetch("/api/bet-finder/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        betTypes: selectedBetTypes,
        topCount,
        matchCount,
        dateFrom,
        dateTo,
      }),
    });

    if (!response.ok) throw new Error("Failed to create search jobs");

    const data = await response.json();

    // Zaktualizuj kolejkę
    await loadSearchQueue();

    alert(`✅ Dodano ${data.jobs.length} wyszukiwań do kolejki`);

    setShowAutoAddModal(false);
    setSelectedBetTypes([]);
  } catch (error) {
    console.error("Error adding to queue:", error);
    alert("Błąd podczas dodawania do kolejki");
  }
};
```

2. **Funkcja loadSearchQueue:**

```typescript
const loadSearchQueue = async () => {
  try {
    const response = await fetch("/api/bet-finder/queue");
    if (!response.ok) throw new Error("Failed to load queue");
    const data = await response.json();
    setSearchQueue(data);
  } catch (error) {
    console.error("Error loading queue:", error);
  }
};
```

3. **Auto-refresh kolejki:**

```typescript
useEffect(() => {
  loadSearchQueue();
  const interval = setInterval(loadSearchQueue, 5000); // Co 5s
  return () => clearInterval(interval);
}, []);
```

### FAZA 4: Wyświetlanie wyników

**Cel:** Stwórz UI dla wyników wyszukiwania

**Co zrobić:**

1. Rozszerz `SearchQueue` interface:

```typescript
interface SearchQueue {
  id: number;
  searchType: string;
  status: "pending" | "running" | "completed" | "failed";
  results?: SearchResult[];
  progress?: number; // 0-100
  error?: string;
  createdAt: string;
  completedAt?: string;
}

interface SearchResult {
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  score: number; // Ranking score
  homeStats: TeamStats;
  awayStats: TeamStats;
  recommendation: string;
  // ... więcej pól
}
```

2. Dodaj komponent wyników:

```tsx
// src/components/SearchResults.tsx
function SearchResults({ search }: { search: SearchQueue }) {
  if (search.status === "running") {
    return <div>Wyszukiwanie... {search.progress}%</div>;
  }

  if (search.status === "failed") {
    return <div>Błąd: {search.error}</div>;
  }

  return (
    <div>
      <h4>
        {search.searchType} - TOP {search.results?.length}
      </h4>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Mecz</th>
            <th>Data</th>
            <th>Score</th>
            <th>Akcje</th>
          </tr>
        </thead>
        <tbody>
          {search.results?.map((result, idx) => (
            <tr key={result.matchId}>
              <td>{idx + 1}</td>
              <td>
                {result.homeTeam} vs {result.awayTeam}
              </td>
              <td>{result.matchDate}</td>
              <td>{result.score.toFixed(2)}</td>
              <td>
                <button onClick={() => showDetails(result)}>Szczegóły</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

3. Dodaj modal ze szczegółami meczu (podobny do starego projektu)

---

## 6. PRIORYTET IMPLEMENTACJI

**Kolejność (od najważniejszego):**

1. ✅ **Backend API** - endpointy
2. ✅ **Algorytm: Winner vs Loser** - najprostszy
3. ✅ **Frontend: addToQueue** - integracja
4. ✅ **Frontend: loadSearchQueue** - auto-refresh
5. ✅ **Wyświetlanie wyników** - podstawowe
6. ⏳ **Algorytm: Most Goals** - drugi najpopularniejszy
7. ⏳ **Algorytm: Least Goals**
8. ⏳ **Pozostałe algorytmy** (15 typów razem)
9. ⏳ **Modal ze szczegółami meczu**
10. ⏳ **Optymalizacja i testy**

---

## 7. BAZA DANYCH

**Tabela: matches** (już istnieje)

```sql
CREATE TABLE matches (
  id SERIAL PRIMARY KEY,
  fixture_id INTEGER UNIQUE,
  home_team VARCHAR(255),
  away_team VARCHAR(255),
  match_date DATE,
  home_goals INTEGER,
  away_goals INTEGER,
  home_odds DECIMAL,
  draw_odds DECIMAL,
  away_odds DECIMAL,
  standing_home INTEGER,
  standing_away INTEGER,
  home_corners INTEGER,
  away_corners INTEGER,
  home_offsides INTEGER,
  away_offsides INTEGER,
  home_fouls INTEGER,
  away_fouls INTEGER,
  home_yellow_cards INTEGER,
  away_yellow_cards INTEGER,
  home_red_cards INTEGER,
  away_red_cards INTEGER,
  league_id INTEGER,
  season INTEGER,
  is_finished VARCHAR(10),  -- 'yes' / 'no'
  -- ... więcej pól
);
```

**Indeksy (ważne dla performance):**

- `match_date` - dla filtrowania po dacie
- `league_id` - dla filtrowania po lidze
- `home_team`, `away_team` - dla szukania historii drużyny
- `is_finished` - dla filtrowania nadchodzących meczów

---

## 8. TESTOWANIE

**Jak testować:**

1. **Uruchom aplikację:**

```bash
cd "d:\narzędzia\Bet Assistant 2.0"
start-all.bat  # Backend + Worker + Frontend
```

2. **Otwórz Bet Finder:**

- Przejdź do `http://localhost:5173/`
- Sprawdź czy wszystkie sekcje się wyświetlają

3. **Testuj workflow:**

- Ustaw TOP 10, Match Count 10
- Wybierz daty (np. jutro)
- Kliknij "Automatycznie dodaj typy"
- Zaznacz kilka typów
- Kliknij "Dodaj do kolejki"
- Sprawdź czy pojawia się w kolejce
- Odśwież stronę - kolejka powinna się załadować
- Poczekaj na zakończenie wyszukiwania
- Sprawdź wyniki

4. **Test algorytmów:**

```typescript
// Utwórz test w server/__tests__/bet-finder.test.ts
describe("Bet Finder Algorithms", () => {
  it("should find winner vs loser matches", async () => {
    const results = await searchWinnerVsLoser({
      dateFrom: "2025-12-31",
      dateTo: "2025-12-31",
      topCount: 10,
      matchCount: 10,
    });

    expect(results).toHaveLength(10);
    expect(results[0].score).toBeGreaterThan(results[9].score);
  });
});
```

---

## 9. DOKUMENTACJA DO AKTUALIZACJI

**Po zakończeniu zadania zaktualizuj:**

1. `Dokumentacja/dokumentacja techniczna` - dodaj sekcję o Bet Finder
2. Dodaj komentarze w kodzie (JSDoc)
3. Utwórz README w `server/src/services/bet-finder/` z opisem algorytmów

---

## 10. KONTAKT I PYTANIA

**Jeśli masz pytania:**

1. Przeczytaj stary kod: `stary/public/js/bet-finder.js`
2. Sprawdź backend API: `server/routes/`
3. Zobacz strukturę bazy: `prisma/schema.prisma`

**Co jest już gotowe:**

- ✅ UI struktura (BetFinderPage.tsx)
- ✅ Styling (BetFinderPage.module.css)
- ✅ Stan aplikacji (React hooks)
- ✅ Modal z typami zakładów
- ✅ Backend (Express, Prisma, PostgreSQL)
- ✅ Baza danych z meczami

**Co musisz zrobić:**

- 🎯 Backend API endpointy
- 🎯 Algorytmy wyszukiwania (17 typów)
- 🎯 Integracja frontend-backend
- 🎯 Wyświetlanie wyników
- 🎯 System kolejki

---

**Powodzenia! 🚀**

_Agent Migracji_
