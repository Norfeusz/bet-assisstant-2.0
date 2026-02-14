# Bet Assistant 2.0 - Complete Launcher
# Uruchamia wszystkie komponenty aplikacji

$ErrorActionPreference = "Stop"

# Kolory dla outputu
$esc = [char]27
$green = "$esc[92m"
$yellow = "$esc[93m"
$blue = "$esc[94m"
$reset = "$esc[0m"

Write-Host "${blue}========================================${reset}"
Write-Host "${green}  BET ASSISTANT 2.0${reset}"
Write-Host "${blue}========================================${reset}"
Write-Host ""

# Znajdź właściwą ścieżkę do projektu
$projectPath = "D:\narzędzia\Bet Assistant 2.0"
if (-not (Test-Path $projectPath)) {
    $actual = Get-Item "D:\*" | Where-Object { $_.Name -match "narz.*dzia" } | Select-Object -Last 1
    $projectPath = Join-Path $actual.FullName "Bet Assistant 2.0"
}

Write-Host "${yellow}📁 Katalog projektu:${reset} $projectPath"
Set-Location $projectPath

# Sprawdź czy node_modules istnieją
if (-not (Test-Path "node_modules")) {
    Write-Host "${yellow}⚠️  Instaluję zależności...${reset}"
    npm install
}

Write-Host ""
Write-Host "${green}🚀 Uruchamiam komponenty...${reset}"
Write-Host ""

# Uruchom wszystkie komponenty w osobnych oknach

# 1. Backend Server (League Config)
Write-Host "${blue}[1/3]${reset} Uruchamiam Backend Server..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectPath'; npm run server" -WindowStyle Normal

Start-Sleep -Seconds 2

# 2. Import Worker
Write-Host "${blue}[2/3]${reset} Uruchamiam Import Worker..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectPath'; npm run server:worker" -WindowStyle Normal

Start-Sleep -Seconds 2

# 3. Frontend (Vite)
Write-Host "${blue}[3/3]${reset} Uruchamiam Frontend..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectPath'; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 3

# Otwórz przeglądarkę
Write-Host ""
Write-Host "${green}✅ Wszystkie komponenty uruchomione!${reset}"
Write-Host ""
Write-Host "${yellow}🌐 Otwieranie aplikacji w przeglądarce...${reset}"
Start-Sleep -Seconds 2
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "${blue}========================================${reset}"
Write-Host "${green}  Aplikacja gotowa do użycia!${reset}"
Write-Host "${blue}========================================${reset}"
Write-Host ""
Write-Host "Aby zamknąć wszystkie komponenty, zamknij wszystkie okna PowerShell"
Write-Host ""
Write-Host "Naciśnij dowolny klawisz aby zamknąć to okno..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
