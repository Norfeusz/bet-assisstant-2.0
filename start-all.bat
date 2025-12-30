@echo off
echo ========================================
echo   BET ASSISTANT 2.0 - FULL LAUNCHER
echo   (Backend + Frontend)
echo ========================================
echo.

REM Sprawdź czy jesteśmy w odpowiednim katalogu
if not exist "package.json" (
    echo [BLAD] Nie znaleziono package.json w biezacym katalogu
    pause
    exit /b 1
)

echo [INFO] Sprawdzam czy backend jest uruchomiony...
powershell -Command "$response = try { Invoke-WebRequest -Uri 'http://localhost:3000' -TimeoutSec 2 -UseBasicParsing } catch { $null }; if ($response) { exit 0 } else { exit 1 }"

if %errorlevel% equ 0 (
    echo [OK] Backend juz dziala na localhost:3000
    echo.
) else (
    echo [INFO] Szukam folderu backendu...
    
    REM Sprawdź czy istnieje server/ w bieżącym folderze
    if exist "server\league-config-server.ts" (
        echo [OK] Znaleziono backend w projekcie: server/
        echo.
        echo [INFO] Uruchamiam backend w nowym oknie...
        start "Backend Server (localhost:3000)" cmd /k "echo [BACKEND] Uruchamiam serwer... && npm run server"
        
        REM Poczekaj 5 sekund na start backendu
        echo [INFO] Czekam 5 sekund na start backendu...
        timeout /t 5 /nobreak >nul
    ) else if exist "stary\server\league-config-server.ts" (
        echo [OK] Znaleziono backend w: stary/
        echo.
        echo [INFO] Uruchamiam backend w nowym oknie...
        start "Backend Server (localhost:3000)" cmd /k "cd /d "stary" && echo [BACKEND] Uruchamiam serwer... && npm run dev"
        
        REM Poczekaj 5 sekund na start backendu
        echo [INFO] Czekam 5 sekund na start backendu...
        timeout /t 5 /nobreak >nul
    ) else (
        echo [UWAGA] Nie znaleziono folderu backendu!
        echo Lokalizacje sprawdzone:
        echo   - server\league-config-server.ts
        echo   - stary\server\league-config-server.ts
        echo.
        echo Uruchom backend recznie:
        echo   npm run server
        echo.
        pause
    )
)

echo.
echo [INFO] Uruchamiam import worker w nowym oknie...
start "Import Worker" cmd /k "echo [WORKER] Uruchamiam import worker... && npm run server:worker"

echo [INFO] Czekam 2 sekundy przed uruchomieniem frontendu...
timeout /t 2 /nobreak >nul

echo.
echo [INFO] Uruchamiam frontend (Vite dev server)...
echo [INFO] Aplikacja bedzie dostepna na: http://localhost:5173
echo.
echo ========================================
echo   URUCHOMIONE PROCESY:
echo   - Backend Server (localhost:3000)
echo   - Import Worker (background jobs)
echo   - Frontend (localhost:5173)
echo ========================================
echo.
echo   Aby zatrzymac frontend nacisnij Ctrl+C
echo   Backend i Worker zamknij osobno
echo ========================================
echo.

REM Otwórz przeglądarkę po 3 sekundach (w tle)
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:5173"

REM Uruchom npm run dev
npm run dev
