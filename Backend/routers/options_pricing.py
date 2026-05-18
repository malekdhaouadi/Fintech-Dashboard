"""
Options Pricing & EDP (Équations aux Dérivées Partielles) Module
================================================================

This module implements the core financial EDP concepts:

1. Black-Scholes (closed-form PDE solution)
   - The BS formula is the analytical solution to the BS PDE:
       ∂V/∂t + ½σ²S²∂²V/∂S² + rS∂V/∂S - rV = 0
   - Via the change of variables u = e^(αx+βt)V it reduces to the heat equation.

2. Greeks – sensitivities (∂V/∂param) of the option price.

3. Implied Volatility – inverse problem: given market price, find σ via Newton-Raphson.

4. Crank-Nicolson FD Scheme (unconditionally stable)
   - Averages explicit and implicit Euler for the BS PDE.
   - Solves the tridiagonal system AV^{n+1} = BV^n at each time step.
   - Boundary conditions: call → V(0)=0, V(S_max)=S_max−Ke^{−r(T−t)}

5. Heat Equation Smoothing for Volatility Surface
   - The heat equation u_t = u_xx has Gaussian as fundamental solution.
   - Gaussian filter ≡ convolving with G(x,t)=1/(2√πt) e^{−x²/4t}.
   - Used to smooth the raw volatility smile/surface.

6. FFT Option Pricing (Carr-Madan 1999)
   - Log-characteristic function of log-normal: φ(u) = exp(iu(ln S + (r−½σ²)T) − ½σ²u²T)
   - Prices across all strikes in O(N log N) via the DFT.
"""

import asyncio
from typing import List, Literal

import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from scipy.ndimage import gaussian_filter
from scipy.stats import norm

router = APIRouter(prefix="/api/options", tags=["options"])


# ---------------------------------------------------------------------------
# Pydantic request / response models
# ---------------------------------------------------------------------------

class ImpliedVolRequest(BaseModel):
    market_price: float = Field(..., gt=0, description="Observed market price of the option")
    S: float = Field(..., gt=0, description="Current spot price")
    K: float = Field(..., gt=0, description="Strike price")
    T_days: int = Field(..., gt=0, description="Time to maturity in calendar days")
    r: float = Field(0.03, description="Risk-free rate (annualised)")
    option_type: Literal["call", "put"] = "call"


class CrankNicolsonRequest(BaseModel):
    K: float = Field(..., gt=0, description="Strike price")
    T_days: int = Field(..., gt=0, description="Time to maturity in calendar days")
    r: float = Field(0.03, description="Risk-free rate")
    sigma: float = Field(..., gt=0, le=5, description="Volatility (annualised, e.g. 0.20)")
    S_max: float = Field(500.0, gt=0, description="Maximum stock price for the grid")
    nx: int = Field(100, ge=10, le=500, description="Number of spatial grid points")
    nt: int = Field(100, ge=10, le=1000, description="Number of time steps")
    option_type: Literal["call", "put"] = "call"


# ---------------------------------------------------------------------------
# 1. BLACK-SCHOLES  (solution exacte de l'EDP)
# ---------------------------------------------------------------------------

def _d1_d2(S: float, K: float, T: float, r: float, sigma: float):
    """Compute d1 and d2 used throughout Black-Scholes formulas."""
    d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)
    return d1, d2


def black_scholes(S: float, K: float, T: float, r: float, sigma: float,
                  option_type: str = "call") -> float:
    """
    Prix théorique d'une option européenne — formule fermée de Black-Scholes.

    C = S·N(d1) − K·e^{−rT}·N(d2)   (call)
    P = K·e^{−rT}·N(−d2) − S·N(−d1) (put)
    """
    if T <= 0:
        # At expiry: return intrinsic value
        if option_type == "call":
            return max(S - K, 0.0)
        return max(K - S, 0.0)

    d1, d2 = _d1_d2(S, K, T, r, sigma)

    if option_type == "call":
        return float(S * norm.cdf(d1) - K * np.exp(-r * T) * norm.cdf(d2))
    # put
    return float(K * np.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1))


# ---------------------------------------------------------------------------
# 2. GREEKS  (sensibilités — dérivées partielles)
# ---------------------------------------------------------------------------

def greeks(S: float, K: float, T: float, r: float, sigma: float,
           option_type: str = "call") -> dict:
    """
    Analytical Greeks derived from the Black-Scholes formula.

    Delta  Δ = ∂V/∂S          — sensitivity to spot price
    Gamma  Γ = ∂²V/∂S²        — convexity / rate of change of delta
    Vega   ν = ∂V/∂σ           — sensitivity to volatility
    Theta  Θ = ∂V/∂t (per day) — time decay
    Rho    ρ = ∂V/∂r           — sensitivity to interest rate
    """
    if T <= 0:
        return {"delta": 0.0, "gamma": 0.0, "vega": 0.0, "theta": 0.0, "rho": 0.0}

    d1, d2 = _d1_d2(S, K, T, r, sigma)
    pdf_d1 = norm.pdf(d1)
    sqrt_T = np.sqrt(T)
    disc = np.exp(-r * T)

    # Shared terms
    gamma = float(pdf_d1 / (S * sigma * sqrt_T))
    vega = float(S * pdf_d1 * sqrt_T)  # per unit σ

    if option_type == "call":
        delta = float(norm.cdf(d1))
        theta = float(
            -(S * pdf_d1 * sigma) / (2 * sqrt_T)
            - r * K * disc * norm.cdf(d2)
        ) / 365  # convert to per-day
        rho = float(K * T * disc * norm.cdf(d2))
    else:
        delta = float(norm.cdf(d1) - 1)
        theta = float(
            -(S * pdf_d1 * sigma) / (2 * sqrt_T)
            + r * K * disc * norm.cdf(-d2)
        ) / 365
        rho = float(-K * T * disc * norm.cdf(-d2))

    return {
        "delta": round(delta, 6),
        "gamma": round(gamma, 6),
        "vega": round(vega / 100, 6),   # standardised: vega per 1% vol move
        "theta": round(theta, 6),
        "rho": round(rho / 100, 6),     # standardised: rho per 1% rate move
    }


# ---------------------------------------------------------------------------
# 3. VOLATILITÉ IMPLICITE  (Newton-Raphson — résolution inverse de l'EDP)
# ---------------------------------------------------------------------------

def implied_volatility(market_price: float, S: float, K: float, T: float,
                       r: float, option_type: str = "call") -> float:
    """
    Newton-Raphson iteration to find σ such that BS(σ) = market_price.

    The update rule is:  σ_{n+1} = σ_n − (BS(σ_n) − P_mkt) / Vega(σ_n)

    Converges quadratically near the true solution.
    Returns NaN if no convergence (deep ITM/OTM or bad input).
    """
    sigma = 0.25  # reasonable initial guess

    for _ in range(200):
        price = black_scholes(S, K, T, r, sigma, option_type)
        d1, _ = _d1_d2(S, K, T, r, sigma)
        vega_val = S * norm.pdf(d1) * np.sqrt(T)

        diff = price - market_price
        if abs(diff) < 1e-8:
            return round(float(sigma), 6)
        if abs(vega_val) < 1e-10:
            break
        sigma -= diff / vega_val

        # Keep sigma in (0, 5] to avoid explosion
        sigma = max(min(sigma, 5.0), 1e-6)

    return float("nan")


# ---------------------------------------------------------------------------
# 4. CRANK-NICOLSON  (résolution EDP par différences finies)
# ---------------------------------------------------------------------------

def crank_nicolson_option(
    K: float, T: float, r: float, sigma: float,
    S_max: float = 500.0, nx: int = 100, nt: int = 100,
    option_type: str = "call",
) -> dict:
    """
    Solves the Black-Scholes PDE numerically using the Crank-Nicolson scheme.

    The Crank-Nicolson method is the arithmetic average of explicit (Forward Euler)
    and implicit (Backward Euler) schemes:

        (I − ½Δt·L)·V^{n+1} = (I + ½Δt·L)·V^n

    where L is the spatial discretisation operator of the BS PDE.

    This gives an unconditionally stable, second-order accurate scheme in both
    space (O(ΔS²)) and time (O(Δt²)).

    Boundary conditions:
      - Call: V(0,t) = 0,   V(S_max,t) = S_max − K·e^{−r(T−t)}
      - Put:  V(0,t) = K·e^{−r(T−t)},  V(S_max,t) = 0
    """
    dS = S_max / nx
    dt = T / nt

    S_grid = np.linspace(0.0, S_max, nx + 1)  # shape (nx+1,)
    i = np.arange(nx + 1)

    # Terminal payoff (final condition at t=T)
    V = np.maximum(S_grid - K, 0.0) if option_type == "call" else np.maximum(K - S_grid, 0.0)

    # Crank-Nicolson coefficients for interior nodes (i = 1…nx-1)
    # They come from discretising: ½σ²i²(V_{i+1}−2V_i+V_{i-1})/ΔS² + ri(V_{i+1}−V_{i-1})/(2ΔS) − rV_i
    alpha = 0.25 * dt * (sigma ** 2 * i ** 2 - r * i)          # sub-diagonal coeff
    beta_diag = -0.5 * dt * (sigma ** 2 * i ** 2 + r)           # main diagonal coeff
    gamma_arr = 0.25 * dt * (sigma ** 2 * i ** 2 + r * i)       # super-diagonal coeff

    # Interior indices 1…nx-1
    interior = slice(1, nx)
    a = -alpha[1:nx]      # shape (nx-1,)
    b = 1 - beta_diag[1:nx]
    c = -gamma_arr[1:nx]

    # LHS (implicit) tridiagonal:  A·V^{n+1} = rhs
    # RHS (explicit):               B·V^n
    # We store A as three diagonals; invert via Thomas algorithm.

    # Build RHS matrix coefficients
    a_rhs = alpha[1:nx]
    b_rhs = 1 + beta_diag[1:nx]
    c_rhs = gamma_arr[1:nx]

    # Time-march backwards from T to 0
    for n_step in range(nt):
        tau = (n_step + 1) * dt  # time elapsed since terminal (= T − t)

        # Boundary values at current time level
        if option_type == "call":
            V0 = 0.0
            V_last = S_max - K * np.exp(-r * tau)
        else:
            V0 = K * np.exp(-r * tau)
            V_last = 0.0

        # Build RHS vector
        Vint = V[1:nx]
        rhs = a_rhs * np.roll(Vint, 1) + b_rhs * Vint + c_rhs * np.roll(Vint, -1)
        # Fix boundary contributions
        rhs[0] = rhs[0] - a_rhs[0] * V[0] + alpha[1] * V0 + a_rhs[0] * V[0]
        # More explicit: manually handle first and last interior nodes
        rhs2 = np.zeros(nx - 1)
        for j in range(nx - 1):
            idx = j + 1
            left = V[idx - 1] if idx - 1 >= 0 else V0
            right = V[idx + 1] if idx + 1 <= nx else V_last
            rhs2[j] = a_rhs[idx - 1] * left + b_rhs[idx - 1] * V[idx] + c_rhs[idx - 1] * right

        # Adjust for BCs in LHS
        rhs2[0] -= a[0] * V0
        rhs2[-1] -= c[-1] * V_last

        # Solve tridiagonal system using Thomas (TDMA) algorithm — O(n)
        V_new = _thomas_solve(a.copy(), b.copy(), c.copy(), rhs2)

        V[0] = V0
        V[1:nx] = V_new
        V[nx] = V_last

    return {
        "S": [round(float(x), 4) for x in S_grid],
        "V_numerical": [round(float(x), 6) for x in V],
        "V_exact": [
            round(black_scholes(float(s), K, T, r, sigma, option_type), 6)
            for s in S_grid
        ],
    }


def _thomas_solve(a: np.ndarray, b: np.ndarray, c: np.ndarray,
                  d: np.ndarray) -> np.ndarray:
    """
    Thomas algorithm (tridiagonal matrix algorithm).
    Solves: a[i]x[i-1] + b[i]x[i] + c[i]x[i+1] = d[i]
    in O(n) — exploits the banded structure of the Crank-Nicolson matrix.
    """
    n = len(d)
    c_prime = np.zeros(n)
    d_prime = np.zeros(n)
    x = np.zeros(n)

    c_prime[0] = c[0] / b[0]
    d_prime[0] = d[0] / b[0]

    for i in range(1, n):
        denom = b[i] - a[i] * c_prime[i - 1]
        c_prime[i] = c[i] / denom if i < n - 1 else 0.0
        d_prime[i] = (d[i] - a[i] * d_prime[i - 1]) / denom

    x[-1] = d_prime[-1]
    for i in range(n - 2, -1, -1):
        x[i] = d_prime[i] - c_prime[i] * x[i + 1]

    return x


# ---------------------------------------------------------------------------
# 5. SURFACE DE VOLATILITÉ  (équation de la chaleur pour le lissage)
# ---------------------------------------------------------------------------

def volatility_surface_smoothed(
    strikes: List[float],
    expiries: List[float],
    raw_vols: List[List[float]],
    sigma_heat: float = 1.0,
) -> dict:
    """
    Smooth the raw volatility surface via Gaussian convolution.

    The heat equation  u_t = u_xx  has the Gaussian kernel as its fundamental
    solution:  G(x,t) = 1/(2√πt) · e^{−x²/4t}

    Applying a Gaussian filter to the raw surface is therefore equivalent to
    evolving it forward in "diffusion time" — smoothing out spiky smiles
    while preserving the overall shape.

    Parameters
    ----------
    strikes  : list of strike prices
    expiries : list of time-to-maturity values (in days)
    raw_vols : 2-D list [expiry index][strike index] of raw implied vols
    sigma_heat : Gaussian kernel standard deviation (controls smoothing amount)
    """
    surface = np.array(raw_vols, dtype=float)   # shape: (n_expiries, n_strikes)
    smoothed = gaussian_filter(surface, sigma=sigma_heat)

    return {
        "strikes": strikes,
        "expiries": expiries,
        "raw": surface.tolist(),
        "smoothed": smoothed.tolist(),
    }


# ---------------------------------------------------------------------------
# 6. FFT OPTION PRICING  (Carr-Madan 1999)
# ---------------------------------------------------------------------------

def fft_option_prices(
    S: float, K_center: float, T: float, r: float, sigma: float,
    N: int = 4096, eta: float = 0.25, alpha: float = 1.5,
) -> dict:
    """
    Carr-Madan FFT method for European call option prices across a range of strikes.

    The method prices O(N) strikes in O(N log N) by computing the DFT of a
    modified payoff in the log-strike domain.

    Key idea:
      - Characteristic function of log-price under BS:
            φ(u) = exp(iu·(ln S + (r − ½σ²)T) − ½σ²u²T)
      - The dampened call price in Fourier space:
            ψ(u) = e^{−rT}·φ(u − i(α+1)) / (α² + α − u² + iu(2α+1))
      - Recover prices via inverse DFT (= FFT)

    Returns prices for a range of strikes around K_center (±20% of spot).
    """
    # Grid setup in log-strike space
    lam = 2 * np.pi / (N * eta)   # log-strike spacing
    k_0 = np.log(K_center) - N * lam / 2   # starting log-strike

    j = np.arange(N)
    u = j * eta                             # frequency grid
    k_grid = k_0 + j * lam                 # log-strike grid
    K_grid = np.exp(k_grid)

    # Characteristic function of log-price under GBM / Black-Scholes
    def char_func(u_val: np.ndarray) -> np.ndarray:
        return np.exp(
            1j * u_val * (np.log(S) + (r - 0.5 * sigma ** 2) * T)
            - 0.5 * sigma ** 2 * u_val ** 2 * T
        )

    # Modified integrand — dampening factor e^{αk} removes singularity
    phi_u = char_func(u - 1j * (alpha + 1))
    denom = alpha ** 2 + alpha - u ** 2 + 1j * u * (2 * alpha + 1)
    psi = np.exp(-r * T) * phi_u / denom

    # Simpson weights for numerical integration
    weights = eta * (3 + (-1) ** j - (j == 0).astype(float)) / 3
    weights[0] = eta / 3

    # DFT via FFT
    integrand = psi * weights * np.exp(-1j * k_0 * u)
    fft_result = np.fft.fft(integrand)

    # Recover call prices
    call_prices = (np.exp(-alpha * k_grid) / np.pi * np.real(fft_result)).clip(min=0)

    # Filter to ±25% of spot to keep results meaningful
    mask = (K_grid >= 0.75 * S) & (K_grid <= 1.25 * S)
    K_filtered = K_grid[mask]
    C_filtered = call_prices[mask]

    return {
        "strikes": [round(float(k), 2) for k in K_filtered],
        "call_prices": [round(float(c), 4) for c in C_filtered],
        "spot": round(float(S), 2),
        "maturity_days": round(T * 365),
    }


# ---------------------------------------------------------------------------
# Helper: fetch spot price + historical vol from yfinance
# ---------------------------------------------------------------------------

def _fetch_spot_and_vol(ticker: str) -> tuple[float, float]:
    """Fetch latest spot price and 30-day historical vol from yfinance."""
    try:
        import yfinance as yf
        stock = yf.Ticker(ticker)

        # Spot price
        info = stock.fast_info
        spot = None
        for attr in ("last_price", "regularMarketPrice", "previousClose"):
            try:
                v = getattr(info, attr, None)
                if v is not None:
                    spot = float(v)
                    break
            except Exception:
                continue

        if spot is None or spot <= 0:
            hist_sp = stock.history(period="5d", auto_adjust=False)
            if hist_sp is not None and not hist_sp.empty and "Close" in hist_sp:
                spot = float(hist_sp["Close"].dropna().iloc[-1])

        if spot is None or spot <= 0:
            raise ValueError(f"Cannot find spot price for {ticker}")

        # Historical volatility (60-day window, annualised)
        hist = stock.history(period="60d", auto_adjust=False)
        if hist is not None and not hist.empty and "Close" in hist:
            closes = hist["Close"].dropna().astype(float)
            log_returns = np.log(closes / closes.shift(1)).dropna()
            sigma = float(log_returns.std() * np.sqrt(252)) if len(log_returns) > 1 else 0.25
        else:
            sigma = 0.25  # fallback

        return spot, max(sigma, 0.01)

    except Exception as exc:
        raise ValueError(str(exc))


# ---------------------------------------------------------------------------
# REST API ENDPOINTS
# ---------------------------------------------------------------------------

@router.get("/price")
async def get_option_price(
    ticker: str,
    K: float,
    T_days: int = 30,
    r: float = 0.03,
    option_type: str = "call",
):
    """
    Black-Scholes theoretical price + Greeks.

    Fetches the current spot price and historical volatility from yfinance,
    then returns the closed-form option price and all sensitivities.
    """
    try:
        spot, sigma = await asyncio.to_thread(_fetch_spot_and_vol, ticker.upper())
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    T = T_days / 365.0

    price = black_scholes(spot, K, T, r, sigma, option_type)
    greek_values = greeks(spot, K, T, r, sigma, option_type)

    return {
        "ticker": ticker.upper(),
        "spot": round(spot, 4),
        "strike": K,
        "maturity_days": T_days,
        "risk_free_rate": r,
        "hist_vol": round(sigma, 6),
        "option_type": option_type,
        "theoretical_price": round(price, 4),
        "greeks": greek_values,
    }


@router.post("/implied-vol")
async def get_implied_vol(req: ImpliedVolRequest):
    """
    Implied volatility via Newton-Raphson.

    Finds σ such that BS(S, K, T, r, σ) = market_price.
    """
    T = req.T_days / 365.0
    sigma = await asyncio.to_thread(
        implied_volatility, req.market_price, req.S, req.K, T, req.r, req.option_type
    )
    if sigma != sigma:  # NaN check
        raise HTTPException(
            status_code=422,
            detail="Newton-Raphson did not converge. Check inputs (price, S, K, T).",
        )
    return {
        "implied_vol": sigma,
        "implied_vol_pct": round(sigma * 100, 4),
        "bs_check": round(black_scholes(req.S, req.K, T, req.r, sigma, req.option_type), 6),
    }


@router.post("/crank-nicolson")
async def get_crank_nicolson(req: CrankNicolsonRequest):
    """
    Crank-Nicolson finite difference solution of the Black-Scholes PDE.

    Returns both the numerical CN solution and the exact BS price on the
    same S-grid so the client can visualise and compare.
    """
    T = req.T_days / 365.0
    try:
        result = await asyncio.to_thread(
            crank_nicolson_option,
            req.K, T, req.r, req.sigma,
            req.S_max, req.nx, req.nt, req.option_type,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    # Compute max absolute error (excluding boundary singularity at S=0)
    exact = np.array(result["V_exact"])
    num = np.array(result["V_numerical"])
    err = np.abs(exact - num)
    result["max_error"] = round(float(err[1:].max()), 6)
    result["mean_error"] = round(float(err[1:].mean()), 6)
    return result


@router.get("/surface")
async def get_volatility_surface(ticker: str = "AAPL"):
    """
    Volatility surface: raw smile data + heat-equation smoothed surface.

    The raw surface uses a typical market smile pattern with term structure.
    For a production system you would fit this from live options chain data.
    """
    try:
        spot, _ = await asyncio.to_thread(_fetch_spot_and_vol, ticker.upper())
    except ValueError:
        spot = 150.0  # fallback

    # Build smile surface (% moneyness strikes centred on spot)
    strike_moneyness = [0.80, 0.85, 0.90, 0.95, 1.00, 1.05, 1.10, 1.15, 1.20]
    strikes = [round(spot * m, 2) for m in strike_moneyness]
    expiries_days = [30, 60, 90, 120, 180, 252, 365]

    # Realistic smile: high vol at wings (volatility skew), term structure decaying
    def smile_vol(moneyness: float, T_days: int) -> float:
        atm_vol = 0.20 - 0.02 * (T_days / 365)     # term structure (ATM vol decreases)
        skew = 0.15 * (1 - moneyness) ** 2           # symmetric smile / skew
        return round(max(atm_vol + skew, 0.05), 4)

    raw_vols = [
        [smile_vol(m, exp) for m in strike_moneyness]
        for exp in expiries_days
    ]

    smoothed_result = volatility_surface_smoothed(strikes, expiries_days, raw_vols, sigma_heat=0.8)
    return smoothed_result


@router.get("/fft-prices")
async def get_fft_prices(
    ticker: str,
    T_days: int = 30,
    r: float = 0.03,
    N: int = 2048,
):
    """
    Carr-Madan FFT option pricing across a range of strikes around the current spot.

    Returns O(N) strike-price pairs in O(N log N) time — highly efficient
    for pricing an entire options chain simultaneously.
    """
    try:
        spot, sigma = await asyncio.to_thread(_fetch_spot_and_vol, ticker.upper())
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    T = T_days / 365.0
    try:
        result = await asyncio.to_thread(fft_option_prices, spot, spot, T, r, sigma, N)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    result["sigma"] = round(sigma, 6)
    result["ticker"] = ticker.upper()
    return result
