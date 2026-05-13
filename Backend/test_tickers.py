import yfinance as yf

tickers = ['SFBT.TN', 'BIAT.TN', 'PGH.TN', 'AAPL', 'BTC-USD']
for t in tickers:
    try:
        stock = yf.Ticker(t)
        hist = stock.history(period='5d', auto_adjust=False)
        print(f'{t}: empty={hist.empty}, rows={len(hist)}')
    except Exception as e:
        print(f'{t}: ERROR - {e}')
