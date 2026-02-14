# ZADANIE: Clickable "no" w kolumnie is_finished

**Data:** 14 lutego 2026  
**Priorytet:** Średni  
**Agent docelowy:** Database Browser Implementation Agent

---

## KONTEKST

Użytkownik chce mieć możliwość szybkiego utworzenia zadania aktualizacji wyników dla meczu, który jeszcze się nie zakończył.

Obecnie w tabeli `matches` w kolumnie `is_finished` widzimy wartości "yes" lub "no". Kliknięcie w "no" powinno otworzyć nową kartę z zakładką Import i automatycznie uzupełnionym formularzem zadania.

---

## ZMIANY BACKEND (nie wymagane)

Backend nie wymaga zmian - wszystkie potrzebne endpointy już istnieją.

---

## ZMIANY FRONTEND

### 1. ImportPage.tsx - ZROBIONE ✅

Już dodano:

- Import `useSearchParams` z react-router-dom
- useEffect który czyta URL params: `date`, `league`, `country`
- Funkcja `openModalWithParams(date, league, country)` która:
  - Ładuje ligi z `/api/config`
  - Znajduje ligę po nazwie + kraju
  - Ustawia formularz:
    - `jobType = 'update_results'`
    - `dateFrom = dateFrom = date`
    - `selectedLeagues = [matchingLeague.id]`
  - Otwiera modal
- Funkcja `handleFinishedCellClick(row)` która:
  - Sprawdza czy `selectedTable === 'matches'` i `row.is_finished === 'no'`
  - Wyciąga z row: `match_date`, `league`, `country`
  - Otwiera nową kartę: `window.open('/import?date=X&league=Y&country=Z', '_blank')`

### 2. DatabasePage.tsx - ZROBIONE ✅

**Lokalizacja:** linia 973

**Zaimplementowano:**

- Zmieniono arrow function z `()` na `{}`
- Dodano zmienną `cellValue` przechowującą wartość komórki
- Dodano zmienną `isClickableFinished` sprawdzającą 3 warunki (matches + is_finished + no)
- Dodano do `<td>`:
  - `onClick` - wywołuje handleFinishedCellClick(row) gdy warunek spełniony
  - `style` - cursor: pointer dla clickable cells
  - `title` - tooltip "Click to update this match result"
- Zastąpiono `row[column.name]` przez `cellValue` wszędzie w return

---

## FLOW UŻYTKOWNIKA

```
User w Database Page (tabela matches)
  ↓
Widzi rekord z is_finished='no'
  ↓
Klika w komórkę "no"
  ↓
handleFinishedCellClick(row)
  ↓
Wyciąga: match_date, league, country
  ↓
window.open('/import?date=2026-01-17&league=Premier League&country=England', '_blank')
  ↓
Nowa karta → ImportPage
  ↓
useEffect wykrywa URL params
  ↓
openModalWithParams('2026-01-17', 'Premier League', 'England')
  ↓
Modal otwarty z:
  - Job type: update_results
  - Date from/to: 2026-01-17
  - Selected leagues: [39] (Premier League)
```

---

## TESTOWANIE

1. Otwórz zakładkę "Baza Danych"
2. Wybierz database: bet_assistant
3. Wybierz table: matches
4. Filtruj: is_finished = no
5. Kliknij w komórkę z "no"
6. **Oczekiwany rezultat:**
   - ✅ Otwiera się nowa karta
   - ✅ Zakładka Import jest aktywna
   - ✅ Modal "Utwórz zadanie" jest otwarty
   - ✅ Typ zadania: "Aktualizacja wyników"
   - ✅ Data od/do: data wybranego meczu
   - ✅ Liga: zaznaczona liga meczu
   - ✅ Po kliknięciu "Utwórz" - zadanie tworzy się dla tej jednej ligi i daty

---

## UWAGI TECHNICZNE

- Handler `handleFinishedCellClick` już dodany (linia ~447)
- Tylko jedna zmiana potrzebna: rendering komórek tabeli (linia ~973)
- Nie dodawać CSS - cursor pointer powinien wystarczyć
- Tooltip pokazuje się automatycznie przez atrybut `title`

---

## PRIORYTETY

1. ✅ ImportPage URL params handling - GOTOWE
2. ✅ DatabasePage clickable cells - GOTOWE
3. ✅ handleFinishedCellClick function - GOTOWE

**Szacowany czas:** N/A (zadanie zakończone)

---

**Status:** ✅ **ZAKOŃCZONE** - Wszystkie punkty zaimplementowane (14 lutego 2026)
