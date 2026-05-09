import asyncio
from typing import Any

import pandas as pd
import yfinance as yf
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

router = APIRouter()
DEFAULT_TICKERS = ["AAPL", "MSFT", "GOOGL", "TSLA", "NVDA", "AMZN"]


def _safe_round(value: Any, digits: int = 2):
    if value is None or pd.isna(value):
        return None
    return round(float(value), digits)


def _price_payload(ticker: str):
    stock = yf.Ticker(ticker)
    info = stock.fast_info
    last_price = float(info.last_price)
    previous_close = float(info.previous_close)
    change = last_price - previous_close
    change_pct = (change / previous_close * 100) if previous_close else 0

    return {
        "ticker": ticker.upper(),
        "price": _safe_round(last_price),
        "change": _safe_round(change),
        "change_pct": _safe_round(change_pct),
        "volume": int(info.last_volume or 0),
    }


@router.get("/price/{ticker}")
def get_price(ticker: str):
    return _price_payload(ticker)


@router.get("/history/{ticker}")
def get_history(ticker: str, period: str = "1mo"):
    stock = yf.Ticker(ticker)
    hist = stock.history(period=period)
    return [
        {
            "date": str(index.date()),
            "open": round(row.Open, 2),
            "high": round(row.High, 2),
            "low": round(row.Low, 2),
            "close": round(row.Close, 2),
            "volume": int(row.Volume),
        }
        for index, row in hist.iterrows()
    ]


@router.websocket("/ws/prices")
async def websocket_prices(websocket: WebSocket):
    await websocket.accept()

    try:
        while True:
            data = {}
            for ticker in DEFAULT_TICKERS:
                try:
                    price = _price_payload(ticker)
                    data[ticker] = {
                        "ticker": ticker,
                        "price": price["price"],
                        "change": price["change"],
                        "change_pct": price["change_pct"],
                        "volume": price["volume"],
                    }
                except Exception:
                    continue

            if data:
                await websocket.send_json(data)
            await asyncio.sleep(30)
    except WebSocketDisconnect:
        return
    except Exception:
        await websocket.close()


@router.get("/search")
def search_tickers(q: str = Query(..., min_length=1)):
    query = q.strip()
    if not query:
        return []

    try:
        search = yf.Search(query, max_results=10)
        quotes = search.quotes or []
    except Exception:
        return []

    results = []
    for item in quotes:
        symbol = item.get("symbol")
        if not symbol:
            continue

        results.append(
            {
                "ticker": symbol,
                "name": item.get("shortname") or item.get("longname") or symbol,
                "exchange": item.get("exchange") or item.get("exchDisp") or "",
            }
        )

    return results


@router.get("/indicators/{ticker}")
def get_indicators(ticker: str):
    stock = yf.Ticker(ticker)
    hist = stock.history(period="6mo")

    if hist.empty:
        return {"ticker": ticker.upper(), "ma20": None, "ma50": None, "rsi14": None}

    closes = hist["Close"].astype(float)
    ma20 = closes.rolling(window=20).mean().iloc[-1]
    ma50 = closes.rolling(window=50).mean().iloc[-1]

    delta = closes.diff()
    gains = delta.clip(lower=0)
    losses = -delta.clip(upper=0)
    avg_gain = gains.rolling(window=14).mean()
    avg_loss = losses.rolling(window=14).mean()

    rs = avg_gain / avg_loss.replace(0, pd.NA)
    rsi14 = 100 - (100 / (1 + rs.iloc[-1]))

    return {
        "ticker": ticker.upper(),
        "ma20": _safe_round(ma20),
        "ma50": _safe_round(ma50),
        "rsi14": _safe_round(rsi14),
    }