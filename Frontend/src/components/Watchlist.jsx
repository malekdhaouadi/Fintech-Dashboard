import { useLivePrices } from '../hooks/useLivePrices.js'

const DEFAULT_TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'AMZN']

const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

function formatPrice(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—'
  }

  return moneyFormatter.format(Number(value))
}

function formatDelta(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—'
  }

  const numeric = Number(value)
  return `${numeric >= 0 ? '+' : '-'}${moneyFormatter.format(Math.abs(numeric)).replace('$', '')}`
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—'
  }

  const numeric = Number(value)
  return `${numeric >= 0 ? '+' : '-'}${Math.abs(numeric).toFixed(2)}%`
}

function MiniArrow({ positive }) {
  return positive ? (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M10 4.5v11M10 4.5 5.75 8.75M10 4.5l4.25 4.25"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ) : (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M10 15.5v-11M10 15.5 5.75 11.25M10 15.5l4.25-4.25"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function Watchlist({
  tickers = DEFAULT_TICKERS,
  selectedTicker,
  onSelectTicker,
}) {
  const { prices, loading, error } = useLivePrices(tickers)

  return (
    <section className="flex h-full flex-col rounded-3xl border border-gray-800 bg-gray-900/95 p-4 shadow-2xl shadow-black/30">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-gray-500">Watchlist</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Market movers</h2>
        </div>
        <span className="rounded-full border border-gray-700 bg-gray-950/80 px-3 py-1 text-xs text-gray-400">
          {tickers.length}
        </span>
      </div>

      {error ? (
        <div className="mb-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-2 overflow-auto pr-1">
        {tickers.map((ticker) => {
          const price = prices[ticker]
          const positive = Number(price?.change ?? 0) >= 0
          const selected = selectedTicker === ticker

          return (
            <button
              key={ticker}
              type="button"
              onClick={() => onSelectTicker(ticker)}
              className={`group flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-600 hover:bg-gray-800/90 ${
                selected
                  ? 'border-emerald-500/30 bg-emerald-500/10 ring-1 ring-emerald-500/20'
                  : 'border-gray-800 bg-gray-950/60'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold tracking-wide text-white">{ticker}</span>
                  {selected ? (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-300">
                      Active
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-gray-500">US equity</p>
              </div>

              <div className="text-right">
                <p className="text-base font-semibold text-white">
                  {loading && !price ? 'Loading...' : formatPrice(price?.price)}
                </p>
                <div
                  className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${
                    positive ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {price ? <MiniArrow positive={positive} /> : null}
                  <span>
                    {price ? `${formatDelta(price.change)} (${formatPercent(price.change_pct)})` : 'Live'}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
