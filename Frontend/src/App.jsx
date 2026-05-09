import { useEffect, useState } from 'react'
import CandleChart from './components/CandleChart.jsx'
import Navbar from './components/Navbar.jsx'
import PortfolioTracker from './components/PortfolioTracker.jsx'
import PriceCard from './components/PriceCard.jsx'
import Watchlist from './components/Watchlist.jsx'
import { useLivePrices } from './hooks/useLivePrices.js'

const DEFAULT_TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'AMZN']

export default function App() {
  const [tickers, setTickers] = useState(DEFAULT_TICKERS)
  const [selectedTicker, setSelectedTicker] = useState(DEFAULT_TICKERS[0])

  const { prices, loading, error, isLive, priceFlash } = useLivePrices(tickers)
  const selectedPrice = prices[selectedTicker]

  useEffect(() => {
    if (!tickers.includes(selectedTicker)) {
      setSelectedTicker(tickers[0] ?? DEFAULT_TICKERS[0])
    }
  }, [selectedTicker, tickers])

  const handleAddTicker = (ticker) => {
    const normalized = String(ticker ?? '').trim().toUpperCase()
    if (!normalized) {
      return
    }

    setTickers((current) => (current.includes(normalized) ? current : [...current, normalized]))
    setSelectedTicker(normalized)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Navbar onAddTicker={handleAddTicker} isLive={isLive} />

      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-4 lg:min-h-[calc(100vh-88px)] lg:flex-row">
        <aside className="w-full lg:w-[280px] lg:flex-none">
          <Watchlist
            tickers={tickers}
            selectedTicker={selectedTicker}
            onSelectTicker={setSelectedTicker}
            prices={prices}
            loading={loading}
            error={error}
            priceFlash={priceFlash}
          />
        </aside>

        <main className="flex min-w-0 flex-1 flex-col gap-4">
          <section className="rounded-3xl border border-gray-800 bg-gray-900/80 p-5 shadow-2xl shadow-black/25 backdrop-blur-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-gray-500">Selected ticker</p>
                <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white lg:text-5xl">
                  {selectedTicker}
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-gray-400">
                  Live quote summary and historical candlestick view for your current selection.
                </p>
              </div>

              <div className="w-full lg:max-w-md">
                <PriceCard priceData={selectedPrice} flashDirection={priceFlash[selectedTicker]} />
              </div>
            </div>
          </section>

          <CandleChart ticker={selectedTicker} />
          <PortfolioTracker prices={prices} />
        </main>
      </div>
    </div>
  )
}
