@echo off
echo ========================================
echo   BET ASSISTANT 2.0 - IMPORT WORKER
echo   (Background Jobs Processor)
echo ========================================
echo.

REM Sprawdź czy jesteśmy w odpowiednim katalogu
cd /d "%~dp0.."

if not exist "package.json" (
    echo [BLAD] Nie znaleziono package.json w katalogu projektu
    pause
    exit /b 1
)

echo [INFO] Uruchamiam Import Worker...
echo [INFO] Worker bedzie sprawdzal zadania co 5 minut
echo [INFO] Logi zapisywane w folderze: logs/
echo.
echo ========================================
echo   Aby zatrzymac worker nacisnij Ctrl+C
echo ========================================
echo.

npm run server:worker
