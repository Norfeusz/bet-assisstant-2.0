# 🚀 Quick Start - n8n Automation

System automatycznego importu meczów i zarządzania bazą dla Bet Assistant 2.0.

## ⚡ Szybki start

### 1. Wygeneruj API key

```powershell
# PowerShell
$bytes = New-Object byte[] 32
[Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
$apiKey = [Convert]::ToBase64String($bytes)
Write-Host "N8N_WEBHOOK_KEY=$apiKey"
```

### 2. Dodaj do `.env`

```env
N8N_WEBHOOK_KEY=<wygenerowany-klucz>
```

### 3. Restart serwera

```bash
cd server
npm run dev
```

### 4. Instaluj n8n

**Docker:**
```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  n8nio/n8n
```

**NPM:**
```bash
npm install -g n8n
n8n start
```

### 5. Importuj workflows

1. Otwórz http://localhost:5678
2. Workflows → Import from File
3. Importuj wszystkie z tego folderu:
   - `1-daily-import-matches.json`
   - `2-update-results-2h.json`
   - `3-daily-database-backup.json`
   - `4-monitoring-alerts.json`

### 6. Ustaw zmienne w n8n

Settings → Environment Variables:

```
BET_ASSISTANT_API_URL=http://localhost:3000
BET_ASSISTANT_WEBHOOK_KEY=<ten-sam-co-w-env>
NOTIFICATION_EMAIL=your@email.com
```

### 7. Aktywuj workflows

Dla każdego workflow: kliknij **Active** toggle

## ✅ Gotowe!

System automatycznie:
- 🔄 00:01 - Aktualizuje wyniki z poprzedniego dnia
- ⏰ 10:00 - Importuje mecze na następny dzień
- 💾 00:00 - Backup bazy (północ)
- 📊 Co 15 min - Monitoring

## 📖 Pełna dokumentacja

- [**README.md**](README.md) - Kompletna instrukcja użytkownika
- [**Dokumentacja/n8n-automation-tech.md**](../Dokumentacja/n8n-automation-tech.md) - Dokumentacja techniczna

## 🆘 Pomoc

**Problem z autoryzacją?**
- Sprawdź czy `N8N_WEBHOOK_KEY` jest identyczny w `.env` i n8n
- Restart serwera backend

**Workflow nie działa?**
- Sprawdź execution logs w n8n
- Sprawdź logi serwera (terminal)
- Testuj endpoint: `GET http://localhost:3000/api/webhooks/n8n/health`

## 🔗 Endpointy

Wszystkie wymagają nagłówka: `x-n8n-api-key: <key>`

- `POST /api/webhooks/n8n/import-matches` - Import meczów
- `POST /api/webhooks/n8n/update-results` - Aktualizacja wyników
- `POST /api/webhooks/n8n/backup-database` - Backup bazy
- `GET /api/webhooks/n8n/health` - Health check
- `GET /api/webhooks/n8n/status` - Status systemu

---

**Wersja:** 1.0 | **Data:** 19.02.2026
