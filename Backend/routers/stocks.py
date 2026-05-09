from fastapi import APIRouter
import yfinance as yf

router = APIRouter()

@router.get("/price/{ticker}")
def get_price(ticker: str):
    stock = yf.Ticker(ticker)
    info = stock.fast_info
    return {
        "ticker": ticker.upper(),
        "price": round(info.last_price, 2),
        "change": round(info.last_price - info.previous_close, 2),
        "change_pct": round((info.last_price - info.previous_close) / info.previous_close * 100, 2),
        "volume": info.last_volume,
    }

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