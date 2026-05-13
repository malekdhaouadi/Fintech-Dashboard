import asyncio
from typing import Any

import pandas as pd
import yfinance as yf
from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect

router = APIRouter()

DEFAULT_STREAM_TICKERS = [
    'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'TSLA', 'AMZN', 'AMD', 'INTC', 'ORCL',
    'JPM', 'GS', 'BAC', 'V', 'MA',
    'JNJ', 'PFE', 'UNH', 'ABBV',
    'XOM', 'CVX', 'TTE.PA',
    'BTC-USD', 'ETH-USD', 'BNB-USD', 'SOL-USD', 'MATIC-USD',
    'GC=F', 'CL=F', 'SI=F',
    'EURUSD=X', 'GBPUSD=X', 'USDTND=X',
    'TLNET.TN', 'SFBT.TN', 'BIAT.TN', 'PGH.TN', 'SOTUMAG.TN',
    'MC.PA', 'LVMH', 'AIR.PA', 'BNP.PA',
    'SAP.DE', 'SIE.DE', 'BMW.DE', 'BAYN.DE',
    'SHEL.L', 'AZN.L', 'HSBA.L', 'BP.L',
    '^GSPC', '^IXIC', '^DJI', '^FCHI', '^GDAXI', '^FTSE', '^N225', '^HSI',
]


def _safe_round(value: Any, digits: int = 2):
    if value is None or pd.isna(value):
        return None
    return round(float(value), digits)


def _fast_info_value(info, key: str):
    if info is None:
        return None
    if isinstance(info, dict):
        return info.get(key)
    return getattr(info, key, None)


def _history_frame(ticker: str, period: str = '1y'):
    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(period=period, auto_adjust=False)
        if hist is None or hist.empty:
            return pd.DataFrame()
        # Flatten MultiIndex columns if present (some yfinance versions return them)
        if isinstance(hist.columns, pd.MultiIndex):
            hist.columns = hist.columns.get_level_values(0)
        if 'Close' not in hist.columns:
            return pd.DataFrame()
        return hist.dropna(subset=['Close'])
    except Exception:
        return pd.DataFrame()


def _price_payload(ticker: str):
    stock = yf.Ticker(ticker)

    last_price = None
    previous_close = None
    volume = None

    try:
        info = stock.fast_info
        last_price = _fast_info_value(info, 'last_price')
        previous_close = _fast_info_value(info, 'previous_close')
        volume = _fast_info_value(info, 'last_volume')
    except Exception:
        info = None

    if last_price is None or previous_close is None:
        hist = stock.history(period='5d', auto_adjust=False)
        if hist is not None and not hist.empty and 'Close' in hist:
            closes = hist['Close'].dropna()
            if not closes.empty:
                last_price = float(closes.iloc[-1])
                previous_close = float(closes.iloc[-2]) if len(closes) > 1 else float(closes.iloc[-1])
                if volume is None and 'Volume' in hist:
                    volume = int(hist['Volume'].fillna(0).iloc[-1])

    if last_price is None:
        raise ValueError(f'Unable to load price for {ticker}')

    previous_close = float(previous_close if previous_close is not None else last_price)
    last_price = float(last_price)
    volume = int(volume or 0)
    change = last_price - previous_close
    change_pct = (change / previous_close * 100) if previous_close else 0

    return {
        'ticker': ticker.upper(),
        'price': _safe_round(last_price),
        'change': _safe_round(change),
        'change_pct': _safe_round(change_pct),
        'volume': volume,
    }


def _rsi_series(closes: pd.Series, period: int = 14) -> pd.Series:
    delta = closes.diff()
    gains = delta.where(delta > 0, 0.0)
    losses = -delta.where(delta < 0, 0.0)

    average_gain = gains.ewm(alpha=1 / period, adjust=False, min_periods=period).mean()
    average_loss = losses.ewm(alpha=1 / period, adjust=False, min_periods=period).mean()

    rs = average_gain / average_loss.replace(0, pd.NA)
    return 100 - (100 / (1 + rs))


def _compute_indicators(hist: pd.DataFrame):
    closes = hist['Close'].astype(float).dropna()

    if closes.empty:
        return {
            'rsi': None,
            'rsi_signal': None,
            'macd_signal': None,
            'ma50': None,
            'ma200': None,
            'price_vs_ma50': None,
            'price_vs_ma200': None,
            'overall': None,
        }

    last_price = float(closes.iloc[-1])

    ma50 = closes.rolling(window=50).mean().iloc[-1] if len(closes) >= 50 else None
    ma200 = closes.rolling(window=200).mean().iloc[-1] if len(closes) >= 200 else None

    rsi_series = _rsi_series(closes, 14)
    rsi_value = rsi_series.iloc[-1] if len(rsi_series) > 0 else None
    if rsi_value is None or pd.isna(rsi_value):
        rsi_value = None
        rsi_signal = None
    elif rsi_value >= 70:
        rsi_signal = 'Overbought'
    elif rsi_value <= 30:
        rsi_signal = 'Oversold'
    else:
        rsi_signal = 'Neutral'

    ema12 = closes.ewm(span=12, adjust=False).mean()
    ema26 = closes.ewm(span=26, adjust=False).mean()
    macd_line = ema12 - ema26
    signal_line = macd_line.ewm(span=9, adjust=False).mean()
    macd_signal = None
    if len(macd_line) > 0 and len(signal_line) > 0:
        macd_signal = 'Bullish' if macd_line.iloc[-1] >= signal_line.iloc[-1] else 'Bearish'

    price_vs_ma50 = None
    if ma50 is not None and not pd.isna(ma50):
        price_vs_ma50 = 'Above' if last_price >= float(ma50) else 'Below'

    price_vs_ma200 = None
    if ma200 is not None and not pd.isna(ma200):
        price_vs_ma200 = 'Above' if last_price >= float(ma200) else 'Below'

    buy_votes = 0
    sell_votes = 0

    if rsi_signal == 'Oversold':
        buy_votes += 1
    elif rsi_signal == 'Overbought':
        sell_votes += 1

    if macd_signal == 'Bullish':
        buy_votes += 1
    elif macd_signal == 'Bearish':
        sell_votes += 1

    if price_vs_ma50 == 'Above':
        buy_votes += 1
    elif price_vs_ma50 == 'Below':
        sell_votes += 1

    if price_vs_ma200 == 'Above':
        buy_votes += 1
    elif price_vs_ma200 == 'Below':
        sell_votes += 1

    if buy_votes > sell_votes:
        overall = 'BUY'
    elif sell_votes > buy_votes:
        overall = 'SELL'
    else:
        overall = 'NEUTRAL'

    return {
        'rsi': _safe_round(rsi_value),
        'rsi_signal': rsi_signal,
        'macd_signal': macd_signal,
        'ma50': _safe_round(ma50),
        'ma200': _safe_round(ma200),
        'price_vs_ma50': price_vs_ma50,
        'price_vs_ma200': price_vs_ma200,
        'overall': overall,
    }


@router.get('/price/{ticker}')
async def get_price(ticker: str):
    try:
        return await asyncio.to_thread(_price_payload, ticker)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get('/history/{ticker}')
async def get_history(ticker: str, period: str = '1mo'):
    hist = await asyncio.to_thread(_history_frame, ticker, period)
    if hist.empty:
        return []

    rows = []
    for index, row in hist.iterrows():
        rows.append(
            {
                'date': str(index.date()),
                'open': _safe_round(row.get('Open', row.get('open'))),
                'high': _safe_round(row.get('High', row.get('high'))),
                'low': _safe_round(row.get('Low', row.get('low'))),
                'close': _safe_round(row.get('Close', row.get('close'))),
                'volume': int(row.get('Volume', row.get('volume', 0)) or 0),
            },
        )
    return rows


async def _fetch_single_price(ticker: str):
    """Fetch price for a single ticker in a thread to avoid blocking."""
    try:
        return ticker, await asyncio.to_thread(_price_payload, ticker)
    except Exception:
        return ticker, None


@router.websocket('/ws/prices')
async def websocket_prices(websocket: WebSocket):
    await websocket.accept()

    try:
        while True:
            # Fetch all prices concurrently in thread pool to avoid blocking
            # Process in batches to limit concurrency
            batch_size = 10
            payload = {}
            for i in range(0, len(DEFAULT_STREAM_TICKERS), batch_size):
                batch = DEFAULT_STREAM_TICKERS[i:i + batch_size]
                results = await asyncio.gather(
                    *[_fetch_single_price(t) for t in batch],
                    return_exceptions=True,
                )
                for result in results:
                    if isinstance(result, tuple) and result[1] is not None:
                        ticker, data = result
                        payload[ticker] = data

            if payload:
                try:
                    await websocket.send_json(payload)
                except WebSocketDisconnect:
                    break
                except Exception:
                    # If sending fails (client disconnected, network issue), stop the loop
                    break

            await asyncio.sleep(30)
    except WebSocketDisconnect:
        return
    except Exception:
        try:
            await websocket.close()
        except Exception:
            pass


@router.get('/search')
async def search_tickers(q: str = Query(..., min_length=1)):
    query = q.strip()
    if not query:
        return []

    def _do_search():
        try:
            search = yf.Search(query, max_results=10)
            return search.quotes or []
        except Exception:
            return []

    quotes = await asyncio.to_thread(_do_search)

    results = []
    for item in quotes:
        symbol = item.get('symbol')
        if not symbol:
            continue

        results.append(
            {
                'ticker': symbol,
                'name': item.get('shortname') or item.get('longname') or symbol,
                'exchange': item.get('exchange') or item.get('exchDisp') or '',
            }
        )

    return results


@router.get('/indicators/{ticker}')
async def get_indicators(ticker: str):
    hist = await asyncio.to_thread(_history_frame, ticker, '1y')
    if hist.empty:
        return {
            'ticker': ticker.upper(),
            'rsi': None,
            'rsi_signal': None,
            'macd_signal': None,
            'ma50': None,
            'ma200': None,
            'price_vs_ma50': None,
            'price_vs_ma200': None,
            'overall': None,
        }

    indicators = _compute_indicators(hist)
    return {
        'ticker': ticker.upper(),
        **indicators,
    }
