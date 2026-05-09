import { useEffect, useMemo, useState } from 'react'
import { Line, LineChart, ResponsiveContainer } from 'recharts'
import { getHistory } from '../services/api.js'

const DEFAULT_GROUPS = [
  { title: 'Tech', tickers: ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA'] },
  { title: 'Finance', tickers: ['JPM', 'V', 'BRK-B'] },
  { title: 'ETFs', tickers: ['SPY', 'QQQ', 'IWM', 'GLD', 'TLT'] },
  { title: 'Crypto', tickers: ['COIN', 'MSTR'] },
  { title: 'Indices', tickers: ['^FTSE', '^N225', '^HSI'] },
]

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

function Sparkline({ points }) {
  if (!points || points.length === 0) {
    return <div className="h-12 w-24 rounded-lg bg-gray-900/40" />
  }

  const first = Number(points[0]?.close)
  const last = Number(points[points.length - 1]?.close)
  const positive = Number.isFinite(first) && Number.isFinite(last) ? last >= first : true

  return (
    <div className="flex h-12 w-24 items-center justify-center">
      <ResponsiveContainer width="100%" height="100%" minWidth={96} minHeight={48}>
        <LineChart data={points} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="close"
            stroke={positive ? '#22c55e' : '#ef4444'}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function Watchlist({
  // Backwards-compatible: accept either `groups` (preferred) or `tickers` array
  groups = DEFAULT_GROUPS,
  tickers, // optional legacy prop
  selectedTicker,
  onSelectTicker,
  prices,
  loading,
  error,
  priceFlash,
}) {
  const [sparkData, setSparkData] = useState({})

  const effectiveGroups = useMemo(() => {
    if (Array.isArray(groups) && groups.length > 0 && groups[0]?.tickers) {
      return groups
    }

    // if caller passed a simple tickers array via `tickers` prop, wrap it
    if (Array.isArray(tickers) && tickers.length > 0) {
      return [{ title: 'Watchlist', tickers: tickers }]
    }

    return DEFAULT_GROUPS
  }, [groups, tickers])

  const flattenedTickers = useMemo(() => {
    const all = []
    effectiveGroups.forEach((g) => {
      (g.tickers || []).forEach((t) => all.push(String(t).trim()))
    })
    // dedupe while preserving order
    return Array.from(new Set(all))
  }, [effectiveGroups])

  const tickerKey = useMemo(() => flattenedTickers.join('|'), [flattenedTickers])

  useEffect(() => {
    let active = true

    const loadSparklines = async () => {
      const settled = await Promise.allSettled(
        flattenedTickers.map(async (ticker) => {
          const rows = await getHistory(ticker, '5d')
          return [
            ticker,
            rows.slice(-48).map((item, index) => ({
              index,
              close: Number(item.close),
            })),
          ]
        }),
      )

      if (!active) {
        return
      }

      const next = {}
      settled.forEach((entry, index) => {
        const sourceTicker = flattenedTickers[index]
        if (entry.status === 'fulfilled') {
          const [ticker, values] = entry.value
          next[ticker] = values
          return
        }

        next[sourceTicker] = []
      })

      setSparkData(next)
    }

    loadSparklines()

    return () => {
      active = false
    }
  }, [tickerKey])

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

      <div className="flex flex-1 flex-col gap-3 overflow-auto pr-1">
        {effectiveGroups.map((group) => (
          <div key={group.title} className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-300">{group.title}</h3>
              <span className="text-xs text-gray-500">{(group.tickers || []).length}</span>
            </div>

            {(group.tickers || []).map((ticker) => {
          const price = prices[ticker]
          const positive = Number(price?.change ?? 0) >= 0
          const selected = selectedTicker === ticker
          const flash = priceFlash?.[ticker]
          const flashClass =
            flash === 'up'
              ? 'ring-1 ring-emerald-500/30'
              : flash === 'down'
                ? 'ring-1 ring-red-500/30'
                : ''
            return (
              <button
                key={ticker}
                type="button"
                onClick={() => onSelectTicker(ticker)}
                className={`group flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-gray-600 hover:bg-gray-800/90 ${flashClass} ${
                  selected
                    ? 'border-emerald-500/30 bg-emerald-500/10'
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
                  <p className="mt-1 text-xs text-gray-500">{group.title}</p>
                  <div className="mt-2">
                    <Sparkline points={sparkData[ticker]} />
                  </div>
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
        ))}
      </div>
    </section>
  )
}
