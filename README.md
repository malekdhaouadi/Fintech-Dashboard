# FinPulse

Professional, responsive global markets dashboard built with a modern React + Vite frontend and a FastAPI backend. Designed for local development and quick iteration, the project provides live market prices, historical charts, market overviews, sparklines, portfolio tracking, and technical indicators across US, Tunisia, Europe, UK, crypto, forex, and commodities.

This project now includes a full Options Pricing and Financial PDE module covering Black-Scholes analytics, Greeks, implied volatility inversion, Crank-Nicolson PDE solving, heat-equation volatility-surface smoothing, and Carr-Madan FFT option-chain pricing.

## Features
- Real-time price streaming via WebSocket
- Global market selector with regional watchlists
- Map-backed country selector for the watchlist sidebar
- Market overview cards for major indices, crypto, and FX
- Historical OHLCV candlestick charts (Recharts)
- Watchlist with mini sparklines
- Portfolio tracker with P&L and allocation pie chart
- Autocomplete ticker search backed by backend search endpoint
- Technical indicators endpoint (MA20, MA50, RSI14)

### Options and PDE Features
- Black-Scholes closed-form pricing for European call/put options
- Analytical Greeks: Delta, Gamma, Vega, Theta, Rho
- Implied volatility (Newton-Raphson inversion)
- Crank-Nicolson finite-difference Black-Scholes PDE solver
- Boundary conditions for calls and puts at S=0 and S=S_max
- Volatility smile/surface smoothing via Gaussian diffusion (heat equation)
- Carr-Madan FFT option pricing (O(N log N)) across strike ranges
- Dedicated frontend tabs:
	- Market Data
	- Portfolio
	- Options Pricing
	- PDE Solver (Crank-Nicolson)
	- Vol Surface
	- FFT Chain

## Architecture & Tech Stack
- Frontend: React, TypeScript + JSX, Vite, Tailwind CSS, Recharts, Plotly
- Backend: FastAPI, Uvicorn, yfinance, pandas, numpy, scipy, scikit-learn
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

Map preview configuration:
- Create `Frontend/.env.local`
- Add `VITE_MAPTILER_API_KEY=<your key>`
- The file is ignored by git so the key stays local

## New Options API Endpoints

Base prefix: `/api/options`

### 1) GET `/api/options/price`
Returns Black-Scholes theoretical price and Greeks using live spot/historical vol from yfinance.

Query params:
- `ticker` (string)
- `K` (float): strike
- `T_days` (int, default 30): maturity in days
- `r` (float, default 0.03): risk-free rate
- `option_type` (`call` | `put`)

Example:
```bash
curl "http://127.0.0.1:8000/api/options/price?ticker=AAPL&K=190&T_days=30&option_type=call"
```

### 2) POST `/api/options/implied-vol`
Inverse Black-Scholes solver using Newton-Raphson.

Body:
```json
{
	"market_price": 8.5,
	"S": 190,
	"K": 190,
	"T_days": 30,
	"r": 0.03,
	"option_type": "call"
}
```

### 3) POST `/api/options/crank-nicolson`
Numerical PDE solver for Black-Scholes with tridiagonal system.

Body:
```json
{
	"K": 190,
	"T_days": 30,
	"r": 0.03,
	"sigma": 0.25,
	"S_max": 450,
	"nx": 120,
	"nt": 220,
	"option_type": "call"
}
```

Response includes:
- `S` grid
- `V_numerical` (Crank-Nicolson solution)
- `V_exact` (Black-Scholes analytical reference)
- `max_error`, `mean_error`

### 4) GET `/api/options/surface`
Returns raw and heat-smoothed volatility surfaces.

Query params:
- `ticker` (default `AAPL`)

Example:
```bash
curl "http://127.0.0.1:8000/api/options/surface?ticker=AAPL"
```

### 5) GET `/api/options/fft-prices`
Carr-Madan FFT pricing for an option chain around spot.

Query params:
- `ticker` (string)
- `T_days` (int, default 30)
- `r` (float, default 0.03)
- `N` (int, default 2048)

Example:
```bash
curl "http://127.0.0.1:8000/api/options/fft-prices?ticker=AAPL&T_days=45"
```

## Frontend Options Modules

Implemented components:
- `Frontend/src/components/OptionPricing.tsx`
	- Inputs: ticker, strike, maturity, option type
	- Displays: spot, theoretical price, implied volatility, Greeks
- `Frontend/src/components/CrankNicolsonVisualizer.tsx`
	- Compares exact Black-Scholes vs Crank-Nicolson
	- Controls: `S_max`, `nx`, `nt`
- `Frontend/src/components/VolatilitySurface3D.tsx`
	- 3D surface plot (raw vs smoothed) using Plotly
- `Frontend/src/components/FFTChain.tsx`
	- Option chain line chart with maturity slider

All are integrated via dashboard tabs in `Frontend/src/App.jsx`.

## Important Endpoints
- GET /api/price/{ticker} — current quote
- GET /api/history/{ticker}?period=1mo — OHLCV history
- GET /api/search?q={query} — autocomplete search results
- GET /api/indicators/{ticker} — MA20, MA50, RSI14
- WebSocket `/api/ws/prices` — broadcasts live prices
- GET /api/options/price — options price + Greeks
- POST /api/options/implied-vol — implied volatility solver
- POST /api/options/crank-nicolson — PDE numeric solution
- GET /api/options/surface — raw + smoothed vol surface
- GET /api/options/fft-prices — FFT option chain

Use the frontend environment variable `VITE_API_URL` to override the backend base URL.

## Development Notes
- Portfolio data is persisted client-side in `localStorage` under the key `fintech-pulse-portfolio`.
- The frontend uses a `useLivePrices` hook to manage WebSocket connections with auto-reconnect and flash animations for price movement.
- Recharts `ResponsiveContainer` components require measurable parent dimensions; when adding components, keep parent sizes or minWidth/minHeight in mind.

### Financial PDE Notes Included in Code
- Heat equation smoothing: diffusion process on the volatility surface.
- Black-Scholes PDE can be transformed into a heat-equation form via variable changes.
- Crank-Nicolson is explicit/implicit averaging, unconditionally stable.
- FFT method provides O(N log N) strike-chain pricing.
- Boundary conditions implemented for call/put at `S=0` and `S=S_max`.

### Course Concepts vs Dashboard Implementation

| Financial EDP concept | Implemented in dashboard |
|---|---|
| Black-Scholes closed-form formula | Theoretical call/put pricing |
| Greeks (Delta, Gamma, Vega, Theta, Rho) | Sensitivity grid in Options Pricing tab |
| Implied volatility inversion | Newton-Raphson implied-vol endpoint + UI computation |
| Crank-Nicolson finite differences | PDE Solver tab with numerical vs exact comparison |
| Heat equation | Volatility surface smoothing (Gaussian diffusion) |
| Boundary conditions | Call/put PDE boundary handling at `S=0` and `S=S_max` |

## Tests & Build
- Frontend build: `npm run build` (produces `dist/`)
- Backend: use uvicorn with `--reload` for development

### Functional API Check (Sample)
Example PowerShell checks run during validation:
- `Invoke-RestMethod http://127.0.0.1:8000/api/options/price?...`
- `Invoke-RestMethod -Method Post http://127.0.0.1:8000/api/options/implied-vol ...`
- `Invoke-RestMethod -Method Post http://127.0.0.1:8000/api/options/crank-nicolson ...`
- `Invoke-RestMethod http://127.0.0.1:8000/api/options/surface?...`
- `Invoke-RestMethod http://127.0.0.1:8000/api/options/fft-prices?...`

## Dependencies

Backend (`Backend/requirements.txt`):
- `fastapi`
- `uvicorn`
- `yfinance`
- `pandas`
- `numpy`
- `scipy`
- `scikit-learn`

Frontend (`Frontend/package.json`):
- `react`
- `axios`
- `recharts`
- `plotly.js`
- `react-plotly.js`
- `tailwindcss`

## Contribution
Contributions, issues, and feature requests are welcome. Please open an issue describing the change and a brief PR when ready.

**Author:** Malek Dhaouadi
**Contact:** malek.dhaouadi@esprit.tn
