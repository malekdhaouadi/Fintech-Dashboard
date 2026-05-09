# FinTech Dashboard — DashboardFintech

Professional, responsive fintech dashboard built with a modern React + Vite frontend and a FastAPI backend. Designed for local development and quick iteration, the project provides live market prices, historical charts, sparklines, portfolio tracking, and technical indicators.

## Features
- Real-time price streaming via WebSocket
- Historical OHLCV candlestick charts (Recharts)
- Watchlist with mini sparklines
- Portfolio tracker with P&L and allocation pie chart
- Autocomplete ticker search backed by backend search endpoint
- Technical indicators endpoint (MA20, MA50, RSI14)

## Architecture & Tech Stack
- Frontend: React 18, TypeScript, Vite, Tailwind CSS, Recharts
- Backend: FastAPI, Uvicorn, yfinance, pandas
- Communication: REST API + WebSocket (ws://localhost:8000/api/ws/prices)

## Quick Start (Development)
Prerequisites:
- Node.js (≥16) and npm/yarn
- Python (≥3.10) and pip

1) Backend

Windows PowerShell example:

```powershell
cd Backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: `http://localhost:8000`

2) Frontend

```bash
cd Frontend
npm install
npm run dev
```

Frontend dev server default: `http://localhost:5173`

## Important Endpoints
- GET /api/price/{ticker} — current quote
- GET /api/history/{ticker}?period=1mo — OHLCV history
- GET /api/search?q={query} — autocomplete search results
- GET /api/indicators/{ticker} — MA20, MA50, RSI14
- WebSocket `/api/ws/prices` — broadcasts live prices

Use the frontend environment variable `VITE_API_URL` to override the backend base URL.

## Development Notes
- Portfolio data is persisted client-side in `localStorage` under the key `fintech-pulse-portfolio`.
- The frontend uses a `useLivePrices` hook to manage WebSocket connections with auto-reconnect and flash animations for price movement.
- Recharts `ResponsiveContainer` components require measurable parent dimensions; when adding components, keep parent sizes or minWidth/minHeight in mind.

## Tests & Build
- Frontend build: `npm run build` (produces `dist/`)
- Backend: use uvicorn with `--reload` for development

## Contribution
Contributions, issues, and feature requests are welcome. Please open an issue describing the change and a brief PR when ready.

**Author:** Malek Dhaouadi
**Contact:** malek.dhaouadi@esprit.tn
