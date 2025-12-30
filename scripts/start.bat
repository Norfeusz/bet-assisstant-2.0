@echo off
echo ========================================
echo   BET ASSISTANT 2.0 - LAUNCHER
echo ========================================
echo.

REM Sprawdź czy jesteśmy w odpowiednim katalogu
if not exist "package.json" (
    echo [BLAD] Nie znaleziono package.json
    echo Upewnij sie, ze uruchamiasz ten plik z folderu projektu
    pause
    exit /b 1
)

echo [INFO] Sprawdzam czy backend jest uruchomiony...
powershell -Command "$response = try { Invoke-WebRequest -Uri 'http://localhost:3000' -TimeoutSec 2 -UseBasicParsing } catch { $null }; if ($response) { exit 0 } else { exit 1 }"

if %errorlevel% equ 0 (
    echo [OK] Backend juz dziala na localhost:3000
) else (
    echo [UWAGA] Backend nie jest uruchomiony!
    echo.
    echo Aby uruchomic backend:
    echo 1. Otwórz nowy terminal
    echo 2. Przejdz do folderu backendu
    echo 3. Uruchom: npm start
    echo.
    echo Nacisnij dowolny klawisz aby kontynuowac (uruchomi sie tylko frontend)...
    pause >nul
)

echo.
echo [INFO] Uruchamiam frontend (Vite dev server)...
echo [INFO] Aplikacja bedzie dostepna na: http://localhost:5173
echo.
echo ========================================
echo   Aby zatrzymac serwer nacisnij Ctrl+C
echo ========================================
echo.

REM Otwórz przeglądarkę po 3 sekundach (w tle)
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:5173"

REM Uruchom npm run dev
npm run dev
