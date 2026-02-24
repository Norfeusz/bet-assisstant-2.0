@echo off
echo ========================================
echo   BET ASSISTANT 2.0 - IMPORT WORKER
echo   (Background Jobs Processor)
echo ========================================
echo.
echo [INFO] Import Worker jest WYLACZONY lokalnie
echo [INFO] Worker dziala na Render przez PM2
echo.
echo ========================================
echo   Worker zdalny (Render):
echo   https://bet-assistant-backend.onrender.com
echo.
echo   Check status:
echo   GET /api/webhooks/n8n/import-jobs/status
echo ========================================
echo.
echo Aby uruchomic workera lokalnie (development):
echo   npm run server:worker
echo.
pause
exit /b 0
