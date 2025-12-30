# 🚀 URUCHOMIENIE BET ASSISTANT 2.0

## Szybki start

### Opcja 1: Tylko frontend (backend uruchomiony osobno)
```bash
# Kliknij dwukrotnie lub uruchom w terminalu:
start.bat
```

### Opcja 2: Backend + Frontend automatycznie
```bash
# Kliknij dwukrotnie lub uruchom w terminalu:
start-all.bat
```

---

## Szczegóły

### `start.bat` - Launcher frontendu
**Co robi:**
- ✅ Sprawdza czy backend jest dostępny na localhost:3000
- ✅ Uruchamia Vite dev server (localhost:5173)
- ✅ Pokazuje komunikaty statusu

**Kiedy używać:**
- Backend jest już uruchomiony w osobnym terminalu
- Chcesz tylko odświeżyć frontend

**Jak zatrzymać:**
- Naciśnij `Ctrl+C` w oknie terminala

---

### `start-all.bat` - Full launcher (Backend + Frontend)
**Co robi:**
- ✅ Automatycznie znajduje folder backendu
- ✅ Uruchamia backend w nowym oknie terminala
- ✅ Czeka 3 sekundy na start backendu
- ✅ Uruchamia frontend w głównym oknie

**Gdzie szuka backendu:**
1. `../backend` (poziom wyżej)
2. `../stary/server` (w folderze stary)
3. `../../backend` (dwa poziomy wyżej)

**Kiedy używać:**
- Pierwszy start aplikacji
- Backend nie jest uruchomiony
- Chcesz uruchomić wszystko jednym kliknięciem

**Jak zatrzymać:**
- Frontend: Naciśnij `Ctrl+C` w głównym oknie
- Backend: Zamknij drugie okno terminala (lub Ctrl+C w nim)

---

## Alternatywne metody

### Ręczne uruchomienie w PowerShell

**Frontend:**
```powershell
cd "d:\narzędzia\Bet Assistant 2.0"
npm run dev
```

**Backend** (przykład):
```powershell
cd "d:\narzędzia\backend"
npm start
```

---

## Rozwiązywanie problemów

### ❌ Backend nie startuje automatycznie
**Rozwiązanie:** Uruchom backend ręcznie:
```bash
cd ścieżka/do/backend
npm start
```

### ❌ Port 5173 jest zajęty
**Rozwiązanie:** Vite automatycznie wybierze inny port (np. 5174)

### ❌ Port 3000 jest zajęty
**Rozwiązanie:** 
1. Zatrzymaj inną aplikację na porcie 3000
2. Lub zmień port w konfiguracji backendu

### ❌ "Nie znaleziono package.json"
**Rozwiązanie:** Upewnij się, że uruchamiasz plik z folderu głównego projektu

---

## Gdzie aplikacja będzie dostępna?

✅ **Frontend:** http://localhost:5173  
✅ **Backend API:** http://localhost:3000  

---

## Po uruchomieniu

1. Otwórz przeglądarkę: http://localhost:5173
2. Powinieneś zobaczyć nagłówek "⚽ Bet Assistant 2.0"
3. Sprawdź czy wszystkie zakładki są dostępne
4. Jeśli widzisz błędy - sprawdź czy backend odpowiada na localhost:3000

---

**Ostatnia aktualizacja:** 30 grudnia 2025  
**Dokumentacja:** Zobacz [Dokumentacja/instrukcja obsługi](Dokumentacja/instrukcja obsługi)
