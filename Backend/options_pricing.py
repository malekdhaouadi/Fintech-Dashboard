"""
Options Pricing + Financial PDE module.

EDP notes:
- Black-Scholes PDE can be transformed into the heat equation by a change of variables.
- Crank-Nicolson is the average of explicit/implicit schemes, second-order accurate and unconditionally stable.
- Heat equation smoothing corresponds to Gaussian diffusion on a volatility surface.
- Carr-Madan FFT prices many strikes in O(N log N) using the characteristic function.
- Boundary conditions for a call option: V(0,t)=0 and V(infinity,t)=S-K*exp(-r*(T-t)).
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta
from typing import Literal

import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from scipy.ndimage import gaussian_filter
from scipy.stats import norm

router = APIRouter(prefix="/api/options", tags=["options"])


class ImpliedVolRequest(BaseModel):
    market_price: float = Field(..., gt=0)
    S: float = Field(..., gt=0)
    K: float = Field(..., gt=0)
    T_days: int = Field(..., gt=0)
    r: float = Field(0.03)
    option_type: Literal["call", "put"] = "call"


class CrankNicolsonRequest(BaseModel):
    K: float = Field(..., gt=0)
    T_days: int = Field(..., gt=0)
    r: float = Field(0.03)
    sigma: float = Field(..., gt=0, le=5)
    S_max: float = Field(500.0, gt=0)
    nx: int = Field(120, ge=20, le=600)
    nt: int = Field(200, ge=20, le=2000)
    option_type: Literal["call", "put"] = "call"


def _validate_option_type(option_type: str) -> str:
    lowered = option_type.lower().strip()
    if lowered not in {"call", "put"}:
        raise ValueError("option_type must be either 'call' or 'put'")
    return lowered


def _safe_T(T: float) -> float:
    return max(float(T), 1e-8)


def _d1_d2(S: float, K: float, T: float, r: float, sigma: float) -> tuple[float, float]:
    T = _safe_T(T)
    sigma = max(float(sigma), 1e-8)
    d1 = (np.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)
    return float(d1), float(d2)


def black_scholes(
    S: float,
    K: float,
    T: float,
    r: float,
    sigma: float,
    option_type: str = "call",
) -> float:
    option_type = _validate_option_type(option_type)
    if T <= 0:
        return float(max(S - K, 0.0) if option_type == "call" else max(K - S, 0.0))

    d1, d2 = _d1_d2(S, K, T, r, sigma)
    if option_type == "call":
        return float(S * norm.cdf(d1) - K * np.exp(-r * T) * norm.cdf(d2))
    return float(K * np.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1))


def greeks(
    S: float,
    K: float,
    T: float,
    r: float,
    sigma: float,
    option_type: str = "call",
) -> dict[str, float]:
    option_type = _validate_option_type(option_type)
    if T <= 0:
        return {"delta": 0.0, "gamma": 0.0, "vega": 0.0, "theta": 0.0, "rho": 0.0}

    d1, d2 = _d1_d2(S, K, T, r, sigma)
    pdf_d1 = norm.pdf(d1)
    sqrt_T = np.sqrt(T)
    discount = np.exp(-r * T)

    gamma = float(pdf_d1 / (S * sigma * sqrt_T))
    vega = float(S * pdf_d1 * sqrt_T) / 100.0

    if option_type == "call":
        delta = float(norm.cdf(d1))
        theta = float((-(S * pdf_d1 * sigma) / (2 * sqrt_T) - r * K * discount * norm.cdf(d2)) / 365.0)
        rho = float(K * T * discount * norm.cdf(d2)) / 100.0
    else:
        delta = float(norm.cdf(d1) - 1.0)
        theta = float((-(S * pdf_d1 * sigma) / (2 * sqrt_T) + r * K * discount * norm.cdf(-d2)) / 365.0)
        rho = float(-K * T * discount * norm.cdf(-d2)) / 100.0

    return {
        "delta": round(delta, 6),
        "gamma": round(gamma, 6),
        "vega": round(vega, 6),
        "theta": round(theta, 6),
        "rho": round(rho, 6),
    }


def implied_volatility(
    market_price: float,
    S: float,
    K: float,
    T: float,
    r: float,
    option_type: str = "call",
    max_iter: int = 100,
    tol: float = 1e-8,
) -> float:
    option_type = _validate_option_type(option_type)
    T = _safe_T(T)
    sigma = 0.25

    for _ in range(max_iter):
        price = black_scholes(S, K, T, r, sigma, option_type)
        d1, _ = _d1_d2(S, K, T, r, sigma)
        vega = float(S * norm.pdf(d1) * np.sqrt(T))

        diff = price - market_price
        if abs(diff) < tol:
            return float(round(sigma, 8))
        if abs(vega) < 1e-12:
            break

        sigma -= diff / vega
        sigma = max(min(sigma, 5.0), 1e-6)

    return float("nan")


def _thomas_solve(a: np.ndarray, b: np.ndarray, c: np.ndarray, d: np.ndarray) -> np.ndarray:
    """Solve a tridiagonal linear system in O(n)."""
    n = len(d)
    if n == 1:
        return np.array([d[0] / b[0]], dtype=float)

    cp = np.zeros(n, dtype=float)
    dp = np.zeros(n, dtype=float)
    x = np.zeros(n, dtype=float)

    cp[0] = c[0] / b[0]
    dp[0] = d[0] / b[0]

    for i in range(1, n):
        denom = b[i] - a[i] * cp[i - 1]
        cp[i] = c[i] / denom if i < n - 1 else 0.0
        dp[i] = (d[i] - a[i] * dp[i - 1]) / denom

    x[-1] = dp[-1]
    for i in range(n - 2, -1, -1):
        x[i] = dp[i] - cp[i] * x[i + 1]

    return x


def crank_nicolson_option(
    K: float,
    T: float,
    r: float,
    sigma: float,
    option_type: str = "call",
    S_max: float = 500.0,
    nx: int = 120,
    nt: int = 200,
) -> dict[str, list[float] | float]:
    """
    Solve the Black-Scholes PDE on a uniform S-grid with Crank-Nicolson.

    Boundary conditions:
    - call: V(0,t)=0, V(S_max,t)=S_max-K*exp(-r*(T-t))
    - put:  V(0,t)=K*exp(-r*(T-t)), V(S_max,t)=0
    """
    option_type = _validate_option_type(option_type)
    T = _safe_T(T)

    dS = S_max / nx
    dt = T / nt
    S = np.linspace(0.0, S_max, nx + 1)

    if option_type == "call":
        V = np.maximum(S - K, 0.0)
    else:
        V = np.maximum(K - S, 0.0)

    i = np.arange(1, nx)
    alpha = 0.25 * dt * (sigma**2 * i**2 - r * i)
    beta = -0.5 * dt * (sigma**2 * i**2 + r)
    gamma = 0.25 * dt * (sigma**2 * i**2 + r * i)

    a_lhs = -alpha
    b_lhs = 1.0 - beta
    c_lhs = -gamma

    a_rhs = alpha
    b_rhs = 1.0 + beta
    c_rhs = gamma

    for n in range(nt):
        tau = (n + 1) * dt
        if option_type == "call":
            left_bc = 0.0
            right_bc = S_max - K * np.exp(-r * tau)
        else:
            left_bc = K * np.exp(-r * tau)
            right_bc = 0.0

        rhs = np.zeros(nx - 1, dtype=float)

        rhs[0] = b_rhs[0] * V[1] + c_rhs[0] * V[2] + a_rhs[0] * left_bc
        for j in range(1, nx - 2):
            rhs[j] = a_rhs[j] * V[j] + b_rhs[j] * V[j + 1] + c_rhs[j] * V[j + 2]
        rhs[-1] = a_rhs[-1] * V[nx - 2] + b_rhs[-1] * V[nx - 1] + c_rhs[-1] * right_bc

        rhs[0] -= a_lhs[0] * left_bc
        rhs[-1] -= c_lhs[-1] * right_bc

        interior = _thomas_solve(a_lhs.copy(), b_lhs.copy(), c_lhs.copy(), rhs)

        V[0] = left_bc
        V[1:nx] = interior
        V[nx] = right_bc

    exact = np.array([black_scholes(float(s), K, T, r, sigma, option_type) for s in S], dtype=float)
    error = np.abs(exact - V)

    return {
        "S": [round(float(x), 6) for x in S],
        "V_numerical": [round(float(x), 6) for x in V],
        "V_exact": [round(float(x), 6) for x in exact],
        "max_error": round(float(np.max(error[1:])), 8),
        "mean_error": round(float(np.mean(error[1:])), 8),
        "dS": round(float(dS), 8),
        "dt": round(float(dt), 10),
    }


def smooth_volatility_surface(
    strikes: list[float],
    expiries: list[float],
    raw_vol_matrix: list[list[float]],
    sigma_heat: float = 1.0,
) -> dict[str, list[float] | list[list[float]]]:
    """
    Heat-equation smoothing using Gaussian diffusion.

    The Gaussian kernel is the fundamental solution of u_t = u_xx,
    so filtering the smile/surface with gaussian_filter is equivalent
    to a diffusion step in synthetic time.
    """
    surface = np.array(raw_vol_matrix, dtype=float)
    if surface.shape != (len(expiries), len(strikes)):
        raise ValueError("raw_vol_matrix shape must be [len(expiries)][len(strikes)]")

    smoothed = gaussian_filter(surface, sigma=sigma_heat)

    return {
        "strikes": strikes,
        "expiries": expiries,
        "raw": surface.tolist(),
        "smoothed": smoothed.tolist(),
    }


def _bs_char_func(u: np.ndarray, S: float, T: float, r: float, sigma: float) -> np.ndarray:
    mu = np.log(S) + (r - 0.5 * sigma**2) * T
    return np.exp(1j * u * mu - 0.5 * sigma**2 * u**2 * T)


def fft_option_prices(
    S: float,
    T: float,
    r: float,
    sigma: float,
    N: int = 2048,
    eta: float = 0.25,
    alpha: float = 1.5,
) -> dict[str, list[float] | dict[str, list[float]] | float]:
    """
    Carr-Madan FFT pricing for a strip of call strikes in O(N log N).
    """
    N = int(2 ** np.ceil(np.log2(max(256, N))))
    T = _safe_T(T)

    lambd = 2.0 * np.pi / (N * eta)
    b = 0.5 * N * lambd

    j = np.arange(N)
    u = j * eta
    k = -b + j * lambd
    strikes = np.exp(k)

    shifted_u = u - 1j * (alpha + 1.0)
    phi = _bs_char_func(shifted_u, S, T, r, sigma)
    numerator = np.exp(-r * T) * phi
    denominator = alpha**2 + alpha - u**2 + 1j * (2.0 * alpha + 1.0) * u
    psi = numerator / denominator

    weights = np.ones(N)
    weights[0] = 1.0
    weights[1::2] = 4.0
    weights[2::2] = 2.0
    weights = weights * eta / 3.0

    x = np.exp(1j * b * u) * psi * weights
    fft_values = np.fft.fft(x)

    calls = np.exp(-alpha * k) * np.real(fft_values) / np.pi
    calls = np.maximum(calls, 0.0)

    mask = (strikes >= 0.8 * S) & (strikes <= 1.2 * S)

    cf_u = np.linspace(0.0, 25.0, 80)
    cf_vals = _bs_char_func(cf_u, S, T, r, sigma)

    return {
        "spot": round(float(S), 6),
        "maturity_days": round(float(T * 365.0), 4),
        "strikes": [round(float(v), 6) for v in strikes[mask]],
        "call_prices": [round(float(v), 6) for v in calls[mask]],
        "characteristic_function": {
            "u": [round(float(v), 6) for v in cf_u],
            "real": [round(float(v), 6) for v in np.real(cf_vals)],
            "imag": [round(float(v), 6) for v in np.imag(cf_vals)],
        },
    }


def _fetch_spot_and_hist_vol(ticker: str) -> tuple[float, float]:
    import yfinance as yf

    stock = yf.Ticker(ticker)
    hist = stock.history(period="6mo", auto_adjust=False)

    if hist is None or hist.empty or "Close" not in hist:
        raise ValueError(f"No market data found for {ticker}")

    closes = hist["Close"].dropna().astype(float)
    if closes.empty:
        raise ValueError(f"No close prices found for {ticker}")

    spot = float(closes.iloc[-1])
    returns = np.log(closes / closes.shift(1)).dropna()
    sigma_hist = float(returns.tail(60).std() * np.sqrt(252)) if len(returns) > 2 else 0.25
    sigma_hist = max(sigma_hist, 0.01)

    return spot, sigma_hist


def _fetch_market_option_price(ticker: str, K: float, T_days: int, option_type: str) -> tuple[float | None, str | None]:
    import pandas as pd
    import yfinance as yf

    option_type = _validate_option_type(option_type)
    stock = yf.Ticker(ticker)
    expiries = list(stock.options or [])
    if not expiries:
        return None, None

    target_date = datetime.utcnow().date() + timedelta(days=T_days)
    expiry_dates = sorted(datetime.strptime(d, "%Y-%m-%d").date() for d in expiries)

    selected_date = None
    for d in expiry_dates:
        if d >= target_date:
            selected_date = d
            break
    if selected_date is None:
        selected_date = expiry_dates[-1]

    expiry_str = selected_date.strftime("%Y-%m-%d")
    chain = stock.option_chain(expiry_str)
    frame: pd.DataFrame = chain.calls if option_type == "call" else chain.puts

    if frame.empty:
        return None, expiry_str

    nearest_idx = (frame["strike"].astype(float) - float(K)).abs().idxmin()
    row = frame.loc[nearest_idx]

    bid = float(row.get("bid", 0.0) or 0.0)
    ask = float(row.get("ask", 0.0) or 0.0)
    last = float(row.get("lastPrice", 0.0) or 0.0)

    if bid > 0 and ask > 0:
        market_price = (bid + ask) / 2.0
    elif last > 0:
        market_price = last
    elif ask > 0:
        market_price = ask
    elif bid > 0:
        market_price = bid
    else:
        market_price = None

    return market_price, expiry_str


@router.get("/price")
async def get_option_price(
    ticker: str,
    K: float,
    T_days: int = 30,
    r: float = 0.03,
    option_type: Literal["call", "put"] = "call",
):
    option_type = _validate_option_type(option_type)

    try:
        spot, sigma_hist = await asyncio.to_thread(_fetch_spot_and_hist_vol, ticker.upper())
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    T = T_days / 365.0
    theoretical_price = black_scholes(spot, K, T, r, sigma_hist, option_type)

    market_option_price = None
    option_expiry = None
    implied_vol = None

    try:
        market_option_price, option_expiry = await asyncio.to_thread(
            _fetch_market_option_price,
            ticker.upper(),
            K,
            T_days,
            option_type,
        )
    except Exception:
        market_option_price = None
        option_expiry = None

    if market_option_price is not None:
        iv = implied_volatility(market_option_price, spot, K, T, r, option_type)
        if not np.isnan(iv):
            implied_vol = float(iv)

    sigma_for_greeks = implied_vol if implied_vol is not None else sigma_hist
    return {
        "ticker": ticker.upper(),
        "spot": round(float(spot), 6),
        "strike": round(float(K), 6),
        "maturity_days": int(T_days),
        "risk_free_rate": round(float(r), 6),
        "option_type": option_type,
        "theoretical_price": round(float(theoretical_price), 6),
        "hist_vol": round(float(sigma_hist), 6),
        "implied_vol": round(float(implied_vol), 6) if implied_vol is not None else None,
        "market_option_price": round(float(market_option_price), 6) if market_option_price is not None else None,
        "market_option_expiry": option_expiry,
        "greeks": greeks(spot, K, T, r, sigma_for_greeks, option_type),
    }


@router.post("/implied-vol")
async def get_implied_vol(payload: ImpliedVolRequest):
    T = payload.T_days / 365.0
    iv = implied_volatility(
        market_price=payload.market_price,
        S=payload.S,
        K=payload.K,
        T=T,
        r=payload.r,
        option_type=payload.option_type,
    )

    if np.isnan(iv):
        raise HTTPException(status_code=422, detail="Newton-Raphson did not converge")

    return {
        "implied_vol": round(float(iv), 8),
        "implied_vol_pct": round(float(iv) * 100.0, 6),
        "bs_price_check": round(
            black_scholes(payload.S, payload.K, T, payload.r, iv, payload.option_type),
            6,
        ),
    }


@router.post("/crank-nicolson")
async def solve_crank_nicolson(payload: CrankNicolsonRequest):
    T = payload.T_days / 365.0
    try:
        return crank_nicolson_option(
            K=payload.K,
            T=T,
            r=payload.r,
            sigma=payload.sigma,
            option_type=payload.option_type,
            S_max=payload.S_max,
            nx=payload.nx,
            nt=payload.nt,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/surface")
async def get_volatility_surface(ticker: str = "AAPL"):
    try:
        spot, _ = await asyncio.to_thread(_fetch_spot_and_hist_vol, ticker.upper())
    except Exception:
        spot = 100.0

    strikes = [round(spot * m, 4) for m in [0.8, 0.85, 0.9, 0.95, 1.0, 1.05, 1.1, 1.15, 1.2]]
    expiries = [30.0, 60.0, 90.0, 120.0, 180.0, 270.0, 365.0]

    raw = []
    for t in expiries:
        row = []
        for strike in strikes:
            m = strike / spot
            atm = 0.22 - 0.05 * (t / 365.0)
            smile = 0.32 * (m - 1.0) ** 2
            skew = 0.08 * max(1.0 - m, 0.0)
            row.append(round(float(max(atm + smile + skew, 0.08)), 6))
        raw.append(row)

    surface = smooth_volatility_surface(strikes, expiries, raw, sigma_heat=1.1)
    surface["ticker"] = ticker.upper()
    return surface


@router.get("/fft-prices")
async def get_fft_prices(
    ticker: str,
    T_days: int = 30,
    r: float = 0.03,
    N: int = 2048,
):
    try:
        spot, sigma_hist = await asyncio.to_thread(_fetch_spot_and_hist_vol, ticker.upper())
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    T = T_days / 365.0

    try:
        result = fft_option_prices(S=spot, T=T, r=r, sigma=sigma_hist, N=N)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    result["ticker"] = ticker.upper()
    result["sigma"] = round(float(sigma_hist), 8)
    return result
