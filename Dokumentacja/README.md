# Bet Assistant 2.0

Nowa wersja systemu zarządzania danymi meczów piłkarskich, przepisana w React + TypeScript + Vite.

## 🚀 Quick Start

### Instalacja

```bash
npm install
```

### Uruchomienie w trybie deweloperskim

```bash
npm run dev
```

Aplikacja będzie dostępna na: http://localhost:5173

### Build produkcyjny

```bash
npm run build
npm run preview
```

## 📁 Struktura Projektu

```
src/
├── api/          # API client i zapytania
├── components/   # Komponenty wielokrotnego użytku
├── hooks/        # Custom React hooks
├── pages/        # Strony główne
├── store/        # Zustand state management
├── styles/       # Globalne style CSS
├── types/        # TypeScript interfaces
├── utils/        # Funkcje pomocnicze
├── App.tsx       # Główny komponent
└── main.tsx      # Entry point

server/
├── routes/       # API endpoints
├── src/
│   ├── db/       # Database utilities
│   ├── services/ # Business logic
│   └── utils/    # Helper functions
└── league-config-server.ts  # Main server

files/            # Pliki danych (CSV, JSON)
config/           # Konfiguracje aplikacji
data/             # Dane runtime (state, cache)
prisma/           # Database schema & migrations

⚠️ stary/         # TYLKO REFERENCJA - do usunięcia po migracji
```

## ⚠️ WAŻNE ZASADY ROZWOJU

### Folder "stary" - DO USUNIĘCIA

**NIGDY nie odwołuj się do folderu `stary/` w nowym kodzie!**

- Folder `stary/` zawiera **tylko starą wersję aplikacji do referencji**
- Zostanie **całkowicie usunięty** po zakończeniu migracji
- Wszystkie potrzebne pliki **muszą być skopiowane** do właściwych lokalizacji
- Przykłady prawidłowych lokalizacji:
  - `files/Lista rozgrywek.csv` (było: `stary/public/Lista rozgrywek.csv`)
  - `config/*.json` (konfiguracje)
  - `data/*.json` (dane aplikacji)

**Przykład - ZAKAZANE:**
```typescript
❌ import something from '../stary/...'
❌ const path = './stary/public/file.csv'
```

**Przykład - POPRAWNE:**
```typescript
✅ const path = path.join(process.cwd(), 'files', 'Lista rozgrywek.csv')
✅ import config from '../config/settings.json'
```

## 🔧 Technologie

- **React 18** - Biblioteka UI
- **TypeScript** - Typowanie
- **Vite** - Build tool & dev server
- **React Router** - Routing
- **TanStack Query** - API state management
- **Zustand** - Global state
- **CSS Modules** - Stylowanie

## 🔗 Backend

Aplikacja łączy się z istniejącym backendem Express na porcie 3000.
Proxy jest skonfigurowane w `vite.config.ts`.

## 📝 Migracja ze starego projektu

Projekt jest w trakcie stopniowej migracji funkcjonalności ze starej wersji vanilla JS.

## 🎯 Zakładki

1. **Import** - Zarządzanie importem danych lig
2. **Baza Danych** - Przeglądanie i filtrowanie meczów
3. **Wyszukiwarka Typów** - Znajdowanie okazji do typowania
4. **Strefa Typera** - Zarządzanie typami i kuponami
5. **Analityka** - Statystyki i analizy
