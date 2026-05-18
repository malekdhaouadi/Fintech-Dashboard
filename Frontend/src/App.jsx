import { useEffect, useMemo, useState } from 'react'
import CandleChart from './components/CandleChart.jsx'
import CrankNicolsonVisualizer from './components/CrankNicolsonVisualizer'
import CountryMapSelector from './components/CountryMapSelector.jsx'
import EconomicCalendar from './components/EconomicCalendar.jsx'
import FFTChain from './components/FFTChain'
import MarketOverview from './components/MarketOverview.jsx'
import Navbar from './components/Navbar.jsx'
import OptionPricing from './components/OptionPricing'
import PortfolioTracker from './components/PortfolioTracker.jsx'
import PriceCard from './components/PriceCard.jsx'
import TechnicalAnalysis from './components/TechnicalAnalysis.jsx'
import VolatilitySurface3D from './components/VolatilitySurface3D'
import Watchlist from './components/Watchlist.jsx'
import { getMarketConfig, getMarketWatchlist } from './data/markets.js'
import { getMarketFormatter, formatDateTime } from './utils/formatters.js'
import { useLivePrices } from './hooks/useLivePrices.js'

const MARKET_OVERVIEW_TICKERS = ['^GSPC', '^IXIC', '^DJI', '^FCHI', '^GDAXI', 'GC=F', 'BTC-USD', 'EURUSD=X']
const TABS = [
  { id: 'market', label: 'Market Data' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'options', label: '📈 Options Pricing' },
  { id: 'pde', label: '🔢 PDE Solver (Crank-Nicolson)' },
  { id: 'surface', label: '🌋 Vol Surface' },
  { id: 'fft', label: '⚡ FFT Chain' },
]

function flattenGroups(groups = []) {
  const tickers = []
  groups.forEach((group) => {
    ;(group.tickers ?? []).forEach((ticker) => tickers.push(String(ticker).trim().toUpperCase()))
  })
  return Array.from(new Set(tickers.filter(Boolean)))
}

export default function App() {
  const [currentMarket, setCurrentMarket] = useState('global')
  const [activeTab, setActiveTab] = useState('market')
  const [customTickersByMarket, setCustomTickersByMarket] = useState({})
  const [portfolioTickers, setPortfolioTickers] = useState([])
  const [selectedTicker, setSelectedTicker] = useState('AAPL')

  const marketConfig = getMarketConfig(currentMarket)
  const marketWatchlist = getMarketWatchlist(currentMarket)
  const customTickers = customTickersByMarket[currentMarket] ?? []

  const watchlistGroups = useMemo(() => {
    const customGroup = customTickers.length > 0 ? [{ title: 'Custom', tickers: customTickers }] : []
    return [...customGroup, ...(marketWatchlist.groups ?? [])]
  }, [customTickers, marketWatchlist.groups])

  const liveTickers = useMemo(() => {
    return Array.from(new Set([...flattenGroups(watchlistGroups), ...MARKET_OVERVIEW_TICKERS, ...portfolioTickers]))
  }, [watchlistGroups, portfolioTickers])

  const { prices, loading, error, isLive, priceFlash } = useLivePrices(liveTickers)
  const formatters = useMemo(() => getMarketFormatter(marketConfig), [marketConfig])
  const selectedPrice = prices[selectedTicker]

  useEffect(() => {
    document.title = `FinPulse · ${marketConfig.label}`
  }, [marketConfig.label])

  useEffect(() => {
    const availableTickers = flattenGroups(watchlistGroups)
    if (availableTickers.length === 0) {
      return
    }

    if (!availableTickers.includes(selectedTicker)) {
      setSelectedTicker(availableTickers[0])
    }
  }, [selectedTicker, watchlistGroups])

  const handleAddTicker = (ticker) => {
    const normalized = String(ticker ?? '').trim().toUpperCase()
    if (!normalized) {
      return
    }

    setCustomTickersByMarket((current) => {
      const marketTickers = current[currentMarket] ?? []
      if (marketTickers.includes(normalized)) {
        return current
      }

      return {
        ...current,
        [currentMarket]: [...marketTickers, normalized],
      }
    })
    setSelectedTicker(normalized)
  }

  const handleMarketSelect = (marketId) => {
    setCurrentMarket(marketId)
    const nextMarket = getMarketWatchlist(marketId)
    const nextTickers = flattenGroups([...(customTickersByMarket[marketId] ? [{ title: 'Custom', tickers: customTickersByMarket[marketId] }] : []), ...(nextMarket.groups ?? [])])
    if (nextTickers.length > 0) {
      setSelectedTicker(nextTickers[0])
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 transition-colors duration-300">
      <Navbar
        onAddTicker={handleAddTicker}
        isLive={isLive}
        currentMarket={currentMarket}
        onMarketSelect={handleMarketSelect}
      />

      <div className="mx-auto w-full max-w-[1680px] px-4 pt-3">
        <div className="flex flex-wrap gap-2 rounded-2xl border border-gray-800 bg-gray-900/70 p-2">
          {TABS.map((tab) => {
            const active = tab.id === activeTab
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                  active
                    ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-200'
                    : 'border-gray-800 bg-gray-950/50 text-gray-400 hover:border-gray-700 hover:text-gray-200'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4 px-4 py-4 xl:flex-row">
        <aside className="flex w-full flex-col gap-4 xl:w-[420px] xl:flex-none">
          <CountryMapSelector selectedMarket={currentMarket} onSelectMarket={handleMarketSelect} />
          <Watchlist
            groups={watchlistGroups}
            selectedTicker={selectedTicker}
            onSelectTicker={setSelectedTicker}
            prices={prices}
            loading={loading}
            error={error}
            priceFlash={priceFlash}
            marketLabel={marketConfig.label}
            formatters={formatters}
          />
          <EconomicCalendar />
        </aside>

        <main className="flex min-w-0 flex-1 flex-col gap-4">
          {activeTab === 'market' ? <MarketOverview formatters={formatters} /> : null}

          {activeTab === 'market' ? (
            <>
              <section className="rounded-3xl border border-gray-800 bg-gray-900/80 p-5 shadow-2xl shadow-black/25 backdrop-blur-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-gray-500">Selected ticker</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <h1 className="text-4xl font-extrabold tracking-tight text-white lg:text-5xl">{selectedTicker}</h1>
                      <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300">
                        {marketConfig.label}
                      </span>
                    </div>
                    <p className="mt-2 max-w-2xl text-sm text-gray-400">
                      Live quote summary and historical view for the current market selection.
                    </p>
                  </div>

                  <div className="w-full lg:max-w-md">
                    <PriceCard
                      priceData={selectedPrice}
                      flashDirection={priceFlash[selectedTicker]}
                      formatters={formatters}
                      lastUpdated={selectedPrice?.updatedAt ?? null}
                    />
                  </div>
                </div>
              </section>

              <CandleChart ticker={selectedTicker} formatters={formatters} />
              <TechnicalAnalysis ticker={selectedTicker} formatters={formatters} />
            </>
          ) : null}

          {activeTab === 'portfolio' ? (
            <PortfolioTracker prices={prices} formatters={formatters} onTickersChange={setPortfolioTickers} />
          ) : null}

          {activeTab === 'options' ? <OptionPricing /> : null}

          {activeTab === 'pde' ? <CrankNicolsonVisualizer /> : null}

          {activeTab === 'surface' ? <VolatilitySurface3D /> : null}

          {activeTab === 'fft' ? <FFTChain /> : null}

          <div className="pb-2 text-right text-[10px] uppercase tracking-[0.3em] text-gray-600">
            Session updated {formatDateTime(new Date())}
          </div>
        </main>
      </div>
    </div>
  )
}
