import { useEffect, useMemo, useState } from 'react'
import { Line, LineChart, ResponsiveContainer } from 'recharts'
import { getHistory } from '../services/api.js'

function MiniSparkline({ points, positive }) {
  if (!points || points.length === 0) {
    return <div className="h-8 w-20 rounded-lg bg-gray-800/50" />
  }

  return (
    <div className="flex h-8 w-20 items-center justify-center">
      <ResponsiveContainer width="100%" height="100%" minWidth={80} minHeight={32}>
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

function formatUpdatedAt(updatedAt) {
  if (!updatedAt) {
    return 'Live'
  }

  const timestamp = new Date(updatedAt)
  if (Number.isNaN(timestamp.getTime())) {
    return 'Live'
  }

  return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function resolveValue(formatters, value) {
  return formatters?.formatPrice ? formatters.formatPrice(value) : value
}

export default function Watchlist({
  groups = [],
  selectedTicker,
  onSelectTicker,
  prices = {},
  loading = false,
  error = null,
  priceFlash = {},
  marketLabel = 'Watchlist',
  formatters,
}) {
  const [viewMode, setViewMode] = useState('table')
  const [search, setSearch] = useState('')
  const [sortDirection, setSortDirection] = useState('desc')
  const [visibleCount, setVisibleCount] = useState(12)
  const [collapsedGroups, setCollapsedGroups] = useState({})
  const [sparkData, setSparkData] = useState({})

  const visibleGroups = useMemo(() => {
    if (Array.isArray(groups) && groups.length > 0) {
      return groups
    }
    return [{ title: marketLabel, tickers: [] }]
  }, [groups, marketLabel])

  const allTickers = useMemo(() => {
    const tickers = []
    visibleGroups.forEach((group) => {
      ;(group.tickers ?? []).forEach((ticker) => tickers.push(String(ticker).trim().toUpperCase()))
    })
    return Array.from(new Set(tickers.filter(Boolean)))
  }, [visibleGroups])

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    const rows = []

    visibleGroups.forEach((group) => {
      ;(group.tickers ?? []).forEach((ticker) => {
        const normalizedTicker = String(ticker).trim().toUpperCase()
        if (!normalizedTicker) {
          return
        }

        const match = !term || normalizedTicker.toLowerCase().includes(term)
        if (!match) {
          return
        }

        const price = prices[normalizedTicker]
        rows.push({
          groupTitle: group.title,
          ticker: normalizedTicker,
          price,
          changePct: Number(price?.change_pct ?? 0),
        })
      })
    })

    rows.sort((left, right) => {
      const delta = right.changePct - left.changePct
      return sortDirection === 'desc' ? delta : -delta
    })

    return rows
  }, [prices, search, sortDirection, visibleGroups])

  const visibleRows = filteredRows.slice(0, visibleCount)
  const hasMore = filteredRows.length > visibleCount

  useEffect(() => {
    let active = true

    const loadSparklines = async () => {
      const settled = await Promise.allSettled(
        allTickers.map(async (ticker) => {
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
        const ticker = allTickers[index]
        next[ticker] = entry.status === 'fulfilled' ? entry.value[1] : []
      })

      setSparkData(next)
    }

    if (allTickers.length > 0) {
      loadSparklines()
    } else {
      setSparkData({})
    }

    return () => {
      active = false
    }
  }, [allTickers])

  useEffect(() => {
    setVisibleCount(12)
  }, [search, visibleGroups])

  const toggleGroup = (groupTitle) => {
    setCollapsedGroups((current) => ({
      ...current,
      [groupTitle]: !current[groupTitle],
    }))
  }

  const renderRow = (row) => {
    const price = row.price
    const positive = Number(price?.change ?? 0) >= 0
    const selected = selectedTicker === row.ticker
    const flash = priceFlash?.[row.ticker]
    const updatedAt = formatUpdatedAt(price?.updatedAt)
    const accentClass = selected ? 'border-emerald-500/40 bg-emerald-500/8' : 'border-gray-800 bg-gray-950/60'

    return (
      <button
        key={row.ticker}
        type="button"
        onClick={() => onSelectTicker(row.ticker)}
        className={`group flex h-12 w-full items-center gap-3 rounded-2xl border px-3 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-gray-700 hover:bg-emerald-500/5 ${accentClass} ${
          flash === 'up' ? 'ring-1 ring-emerald-500/25' : flash === 'down' ? 'ring-1 ring-red-500/25' : ''
        }`}
      >
        <div className={`h-8 w-1.5 rounded-full ${selected ? 'bg-emerald-400' : 'bg-transparent'}`} />
        <div className="grid flex-1 grid-cols-[1.05fr,0.8fr,0.8fr,108px] items-center gap-3 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-white">{row.ticker}</span>
              {selected ? (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-300">
                  Active
                </span>
              ) : null}
            </div>
            <p className="truncate text-[11px] text-gray-500">{row.groupTitle}</p>
          </div>

          <div className="text-right">
            <p className="text-sm font-semibold text-white">{loading && !price ? 'Loading...' : resolveValue(formatters, price?.price)}</p>
            <p className="text-[10px] uppercase tracking-[0.25em] text-gray-500">{updatedAt}</p>
          </div>

          <div className={`text-right text-sm font-semibold ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
            {price ? `${price.change_pct >= 0 ? '+' : ''}${Number(price.change_pct ?? 0).toFixed(2)}%` : 'Live'}
          </div>

          <div className="justify-self-end">
            <MiniSparkline points={sparkData[row.ticker]} positive={positive} />
          </div>
        </div>
      </button>
    )
  }

  const renderCard = (row) => {
    const price = row.price
    const positive = Number(price?.change ?? 0) >= 0
    const selected = selectedTicker === row.ticker
    const flash = priceFlash?.[row.ticker]
    const updatedAt = formatUpdatedAt(price?.updatedAt)

    return (
      <button
        key={row.ticker}
        type="button"
        onClick={() => onSelectTicker(row.ticker)}
        className={`group flex min-h-[112px] flex-col justify-between rounded-2xl border px-4 py-3 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-gray-700 hover:bg-emerald-500/5 ${
          selected ? 'border-emerald-500/40 bg-emerald-500/8' : 'border-gray-800 bg-gray-950/60'
        } ${flash === 'up' ? 'ring-1 ring-emerald-500/25' : flash === 'down' ? 'ring-1 ring-red-500/25' : ''}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-white">{row.ticker}</span>
              {selected ? (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-300">
                  Active
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-gray-500">{row.groupTitle}</p>
          </div>
          <MiniSparkline points={sparkData[row.ticker]} positive={positive} />
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-gray-500">Price</p>
            <p className="mt-1 text-lg font-semibold text-white">{loading && !price ? 'Loading...' : resolveValue(formatters, price?.price)}</p>
            <p className="text-[10px] uppercase tracking-[0.25em] text-gray-500">{updatedAt}</p>
          </div>
          <div className={`text-right text-sm font-semibold ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
            {price ? `${price.change_pct >= 0 ? '+' : ''}${Number(price.change_pct ?? 0).toFixed(2)}%` : 'Live'}
          </div>
        </div>
      </button>
    )
  }

  const groupedVisibleRows = visibleRows.reduce((accumulator, row) => {
    if (!accumulator[row.groupTitle]) {
      accumulator[row.groupTitle] = []
    }
    accumulator[row.groupTitle].push(row)
    return accumulator
  }, {})

  return (
    <section className="flex h-full flex-col rounded-3xl border border-gray-800 bg-gray-900/95 p-4 shadow-2xl shadow-black/30 transition-all duration-300">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-gray-500">Watchlist</p>
          <h2 className="mt-2 text-xl font-semibold text-white">{marketLabel}</h2>
          <p className="mt-1 text-xs text-gray-500">Compact, filterable, and grouped by sector</p>
        </div>
        <span className="rounded-full border border-gray-700 bg-gray-950/80 px-3 py-1 text-xs text-gray-400">
          {filteredRows.length}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Filter tickers"
          className="min-w-[180px] flex-1 rounded-xl border border-gray-800 bg-gray-950/70 px-3 py-2 text-sm text-white outline-none placeholder:text-gray-600 focus:border-emerald-500/40"
        />
        <button
          type="button"
          onClick={() => setViewMode((current) => (current === 'table' ? 'card' : 'table'))}
          className="rounded-xl border border-gray-800 bg-gray-950/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-300 transition hover:border-gray-700 hover:bg-gray-900"
        >
          {viewMode === 'table' ? 'Card View' : 'Table View'}
        </button>
        <button
          type="button"
          onClick={() => setSortDirection((current) => (current === 'desc' ? 'asc' : 'desc'))}
          className="rounded-xl border border-gray-800 bg-gray-950/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-300 transition hover:border-gray-700 hover:bg-gray-900"
        >
          Sort {sortDirection === 'desc' ? 'Best' : 'Worst'}
        </button>
      </div>

      {error ? (
        <div className="mb-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {loading && allTickers.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-12 rounded-2xl bg-gray-800/40 animate-pulse" />
          ))}
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-3 overflow-auto pr-1">
        {viewMode === 'table' ? (
          <>
            <div className="grid grid-cols-[1.05fr,0.8fr,0.8fr,108px] items-center px-3 text-[10px] uppercase tracking-[0.25em] text-gray-500">
              <span>Ticker</span>
              <span className="text-right">Price</span>
              <span className="text-right">Change%</span>
              <span className="text-right">Sparkline</span>
            </div>

            {Object.entries(groupedVisibleRows).map(([groupTitle, rows]) => {
              const isCollapsed = collapsedGroups[groupTitle] ?? false

              return (
                <div key={groupTitle} className="space-y-2">
                  <button
                    type="button"
                    onClick={() => toggleGroup(groupTitle)}
                    className="flex w-full items-center justify-between rounded-xl border border-gray-800 bg-gray-950/50 px-3 py-2 text-left transition hover:border-gray-700 hover:bg-gray-900/70"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{groupTitle}</p>
                      <p className="text-[11px] text-gray-500">{rows.length} symbols</p>
                    </div>
                    <span className="text-xs uppercase tracking-[0.25em] text-gray-500">{isCollapsed ? 'Show' : 'Hide'}</span>
                  </button>

                  {!isCollapsed ? <div className="space-y-2">{rows.map(renderRow)}</div> : null}
                </div>
              )
            })}
          </>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {visibleRows.map(renderCard)}
          </div>
        )}
      </div>

      {hasMore ? (
        <button
          type="button"
          onClick={() => setVisibleCount((current) => current + 12)}
          className="mt-3 rounded-2xl border border-gray-800 bg-gray-950/80 px-4 py-3 text-sm font-semibold text-white transition hover:border-emerald-500/30 hover:bg-emerald-500/10"
        >
          Show more
        </button>
      ) : null}
    </section>
  )
}
