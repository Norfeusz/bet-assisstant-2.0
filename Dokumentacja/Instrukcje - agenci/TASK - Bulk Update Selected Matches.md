# TASK: Bulk Update Selected Matches (Database → Import)

**Priorytet:** Średni  
**Status:** ✅ **UKOŃCZONE** (14.02.2026)  
**Agent:** Database Browser Implementation Agent  
**Data utworzenia:** 14.02.2026

---

## 📋 Kontekst

Użytkownik chce mieć możliwość zaznaczenia wielu meczów w tabeli `matches` w zakładce Database i jednym kliknięciem zaktualizować ich wyniki poprzez utworzenie zadania importu z odpowiednio skonfigurowanymi parametrami.

**User story:**

> "Zaznaczam kilka meczów w tabeli matches, klikam przycisk 'Zaktualizuj wybrane' → otwiera się nowa karta z zakładką Import i automatycznie utworzonym zadaniem typu 'Aktualizacja wyników' z odpowiednim zakresem dat i zaznaczonymi ligami"

---

## ✅ Zmiany w Backend

❌ **NIE WYMAGANE**  
Wszystkie niezbędne endpointy już istnieją:

- `/api/config` - lista lig (używany przez ImportPage)
- `/api/import-jobs` - tworzenie zadania (używany przez ImportPage)

---

## ⚛️ Zmiany w Frontend - ImportPage

✅ **UKOŃCZONE**  
ImportPage został rozszerzony o obsługę URL params z wieloma ligami:

**Nowe URL params obsługiwane przez ImportPage:**

```
/import?dateFrom=2025-01-15&dateTo=2025-01-20&leagues=Premier%20League|England,La%20Liga|Spain
```

**Format parametru `leagues`:**

- Format: `"Liga1|Kraj1,Liga2|Kraj2,Liga3|Kraj3"`
- Separator lig: przecinek `,`
- Separator liga-kraj: pipe `|`
- Przykład: `"Premier League|England,La Liga|Spain,Bundesliga|Germany"`

**Dodane funkcje:**

1. `openModalWithMultipleParams(dateFrom, dateTo, leaguesParam)` - otwiera modal z wieloma ligami
2. Rozszerzony `useEffect` sprawdzający 2 scenariusze:
   - `dateFrom` + `dateTo` + `leagues` → bulk update (NOWY)
   - `date` + `league` + `country` → single match (ISTNIEJĄCY)

---

## ⚛️ Zmiany w Frontend - DatabasePage

✅ **ZAIMPLEMENTOWANE**

### Lokalizacja: `src/pages/DatabasePage.tsx`

---

### 1. Dodanie przycisku "Update Selected" ✅

**Gdzie:** Linia 890 (przed przyciskiem "Delete Selected")

**Zaimplementowany kod:**

```tsx
<button
  className={styles.btnDelete}
  onClick={handleOpenDeleteModal}
  disabled={loading || selectedRows.size === 0}
  title={`Delete ${selectedRows.size} selected record(s)`}
>
  🗑️ Delete Selected ({selectedRows.size})
</button>
```

**Dodaj PRZED przyciskiem Delete Selected:**

```tsx
<button
  className={styles.btnWarning}
  onClick={handleUpdateSelected}
  disabled={loading || selectedRows.size === 0 || selectedTable !== "matches"}
  title={
    selectedTable !== "matches"
      ? "This feature only works for the matches table"
      : `Update results for ${selectedRows.size} selected match(es)`
  }
>
  🔄 Update Selected ({selectedRows.size})
</button>
```

**Uwagi:**

- Przycisk aktywny tylko gdy `selectedTable === 'matches'` i `selectedRows.size > 0`
- Używa klasy `styles.btnWarning` (prawdopodobnie żółty/pomarańczowy kolor)
- Jeśli klasa `btnWarning` nie istnieje, użyj `styles.btnPrimary` lub dodaj nowy styl

---

### 2. Dodanie funkcji `handleUpdateSelected` ✅

**Gdzie:** Linia 469 (tuż po funkcji `handleFinishedCellClick`)

**Zaimplementowana funkcja:**

```tsx
const handleUpdateSelected = () => {
  // Only works for matches table
  if (selectedTable !== "matches" || selectedRows.size === 0) {
    console.warn("Update selected only works for matches table");
    return;
  }

  if (!queryResult || !tableSchema) {
    console.error("No query result or table schema");
    return;
  }

  // Get full row objects for selected PKs
  const pkColumn = tableSchema.primaryKeys[0];
  if (!pkColumn) {
    console.error("No primary key found");
    return;
  }

  const selectedMatches = queryResult.rows.filter((row) => {
    const pkValue = row[pkColumn];
    return selectedRows.has(pkValue);
  });

  if (selectedMatches.length === 0) {
    console.error("No matching rows found");
    return;
  }

  // Extract match dates
  const matchDates = selectedMatches
    .map((row) => row.match_date)
    .filter((date) => date != null)
    .map((date) => new Date(date));

  if (matchDates.length === 0) {
    alert("Selected matches have no valid dates");
    return;
  }

  // Find min/max dates
  const minDate = new Date(Math.min(...matchDates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...matchDates.map((d) => d.getTime())));
  const dateFrom = minDate.toISOString().split("T")[0];
  const dateTo = maxDate.toISOString().split("T")[0];

  // Collect unique leagues (league + country pairs)
  const leagueSet = new Map<string, { league: string; country: string }>();

  for (const match of selectedMatches) {
    const league = match.league;
    const country = match.country;

    if (!league || !country) continue;

    const key = `${league}|${country}`;
    if (!leagueSet.has(key)) {
      leagueSet.set(key, { league, country });
    }
  }

  if (leagueSet.size === 0) {
    alert("Selected matches have no valid league/country information");
    return;
  }

  // Build leagues parameter: "Liga1|Kraj1,Liga2|Kraj2"
  const leaguesParam = Array.from(leagueSet.values())
    .map(({ league, country }) => `${league}|${country}`)
    .join(",");

  // Build URL with parameters
  const params = new URLSearchParams({
    dateFrom,
    dateTo,
    leagues: leaguesParam,
  });

  const url = `/import?${params.toString()}`;

  console.log("Opening Import page with params:", {
    dateFrom,
    dateTo,
    leagues: leaguesParam,
  });

  // Open in new tab
  window.open(url, "_blank");
};
```

**Logika funkcji:**

1. Sprawdź czy `selectedTable === 'matches'` i czy są zaznaczone rekordy
2. Pobierz pełne obiekty rekordów z `queryResult.rows` używając `selectedRows` (Set PK values)
3. Wyciągnij wszystkie `match_date` i znajdź najstarszą/najnowszą datę
4. Zbierz unikalne pary `(league, country)` używając Map
5. Zbuduj string `leagues` w formacie: `"Liga1|Kraj1,Liga2|Kraj2,..."`
6. Utwórz URL: `/import?dateFrom=X&dateTo=Y&leagues=...`
7. Otwórz w nowej karcie: `window.open(url, '_blank')`

---

### 3. Style ✅

Dodano klasę `styles.btnWarning` w `DatabasePage.module.css` (linia 557):

```css
.btnWarning {
  background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
  color: white;
  border: none;
  padding: 10px 18px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btnWarning:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 152, 0, 0.3);
}

.btnWarning:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}
```

---

## 🧪 User Flow (Scenariusz testowy)

1. **Przejdź do zakładki Database**
2. **Wybierz bazę:** `bet_assistant`
3. **Wybierz tabelę:** `matches`
4. **Zaznacz kilka meczów** (checkboxy w pierwszej kolumnie):
   - Wybierz 3-5 meczów z różnych dat (np. 15.01, 17.01, 20.01)
   - Wybierz mecze z różnych lig (np. Premier League, La Liga, Bundesliga)
5. **Kliknij przycisk** "🔄 Update Selected (X)"
6. **Sprawdź:**
   - ✅ Otwiera się nowa karta z zakładką Import
   - ✅ Modal "Utwórz zadanie" jest otwarty
   - ✅ Typ zadania: "Aktualizacja wyników"
   - ✅ Data od: najstarsza data z zaznaczonych meczów
   - ✅ Data do: najnowsza data z zaznaczonych meczów
   - ✅ Ligi: wszystkie unikalne ligi z zaznaczonych meczów są zaznaczone
7. **Kliknij "Utwórz"** i sprawdź czy zadanie jest poprawnie utworzone w kolejce

---

## 🔍 Testing Checklist

- [ ] Przycisk "Update Selected" pojawia się obok "Delete Selected"
- [ ] Przycisk jest wyłączony gdy:
  - [ ] Nie wybrano żadnych rekordów (`selectedRows.size === 0`)
  - [ ] Wybrana tabela to nie `matches` (`selectedTable !== 'matches'`)
- [ ] Przycisk jest aktywny gdy:
  - [ ] Wybrano ≥1 rekord w tabeli `matches`
- [ ] Kliknięcie przycisku otwiera nową kartę z `/import?dateFrom=X&dateTo=Y&leagues=...`
- [ ] ImportPage prawidłowo parsuje parametry URL:
  - [ ] `dateFrom` → pole "Data od"
  - [ ] `dateTo` → pole "Data do"
  - [ ] `leagues` → zaznaczone ligi w liście
- [ ] Modal otwarty automatycznie po załadowaniu strony
- [ ] Typ zadania ustawiony na "Aktualizacja wyników"
- [ ] Można utworzyć zadanie i pojawia się w kolejce

---

## 📚 Dodatkowe informacje techniczne

**Struktura danych:**

- `selectedRows: Set<any>` - zawiera primary key values (nie pełne rekordy)
- `queryResult.rows: any[]` - zawiera pełne obiekty rekordów
- `tableSchema.primaryKeys: string[]` - nazwy kolumn PK

**Funkcje pomocnicze już istniejące:**

- `getPrimaryKeyValue(row)` - zwraca wartość PK dla rekordu (linia ~399)
- `handleToggleRow(row)` - zaznacza/odznacza wiersz (linia ~405)
- `handleToggleAllRows()` - zaznacza/odznacza wszystkie wiersze (linia ~418)

**Format daty:**

- Backend: PostgreSQL DATE (np. `2025-01-15`)
- Frontend input: `type="date"` wymaga formatu ISO: `YYYY-MM-DD`
- Konwersja: `new Date(row.match_date).toISOString().split('T')[0]`

**Encoding URL:**

- URLSearchParams automatycznie enkoduje spacje i znaki specjalne
- Przykład: `"Premier League"` → `"Premier%20League"`
- Przecinki i pipe (`|`) NIE są enkodowane (poprawne w URL)

---

## 📝 Podsumowanie zmian

### DatabasePage.tsx

**Zaimplementowane zmiany:**

1. **Linia 890**: ✅ Dodano przycisk "Update Selected" PRZED przyciskiem "Delete Selected"
2. **Linia 469**: ✅ Dodano funkcję `handleUpdateSelected()` tuż PO funkcji `handleFinishedCellClick`

### DatabasePage.module.css

**Zaimplementowane zmiany:**

1. **Linia 557**: ✅ Dodano styl `.btnWarning` (pomarańczowy gradient) przed `.btnDelete`

**Ilość zmian:**

- 1 przycisk (10 linii JSX)
- 1 funkcja (93 linie TypeScript)
- 1 styl CSS (17 linii)

**Czas realizacji:** Zakończone

---

## ✨ Expected Result

Po implementacji użytkownik będzie mógł:

1. Zaznaczyć wiele meczów w Database (np. 10 meczów z 3 różnych lig z zakresu 5 dni)
2. Kliknąć "Update Selected"
3. Automatycznie otworzy się Import z formularzem skonfigurowanym do zaktualizowania wyników tych konkretnych meczów

**Oszczędność czasu:** Zamiast ręcznie wybierać daty i ligi, wszystko jest automatycznie wykryte z zaznaczonych meczów.

---

**Powodzenia z implementacją! 🚀**
