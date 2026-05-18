import { useEffect, useMemo, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

const STORAGE_KEY = 'fintech-pulse-portfolio'
const COLORS = ['#22c55e', '#38bdf8', '#f59e0b', '#a78bfa', '#ef4444', '#14b8a6', '#84cc16']

function PortfolioTooltip({ active, payload }) {
  if (!active || !payload?.length) {
    return null
  }

  const entry = payload[0].payload
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-950/95 px-3 py-2 text-xs text-gray-200">
      <p className="font-semibold text-white">{entry.ticker}</p>
      <p className="mt-1">{formatMoney(entry.currentValue)}</p>
      <p className="text-gray-400">{entry.allocation}% allocation</p>
    </div>
  )
}

export default function PortfolioTracker({ prices, formatters, onTickersChange }) {
  const [form, setForm] = useState({ ticker: '', quantity: '', buyPrice: '' })
  const [formError, setFormError] = useState('')
  const [holdings, setHoldings] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed
      }
    } catch {}
    return []
  })
  const formatMoney = formatters?.formatPrice ?? ((value) => Number(value).toFixed(2))

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings))
    if (onTickersChange) {
      onTickersChange(holdings.map((h) => h.ticker))
    }
  }, [holdings, onTickersChange])

  const enriched = useMemo(() => {
    return holdings.map((holding) => {
      const currentPrice = Number(prices?.[holding.ticker]?.price ?? 0)
      const quantity = Number(holding.quantity)
      const buyPrice = Number(holding.buyPrice)
      const cost = quantity * buyPrice
      const currentValue = currentPrice * quantity
      const pnl = currentValue - cost
      const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0

      return {
        ...holding,
        currentPrice,
        cost,
        currentValue,
        pnl,
        pnlPct,
      }
    })
  }, [holdings, prices])

  const totalValue = enriched.reduce((sum, item) => sum + item.currentValue, 0)
  const totalCost = enriched.reduce((sum, item) => sum + item.cost, 0)
  const totalPnl = totalValue - totalCost
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0

  const pieData = enriched
    .filter((item) => item.currentValue > 0)
    .map((item) => ({
      ticker: item.ticker,
      currentValue: item.currentValue,
      allocation: totalValue > 0 ? ((item.currentValue / totalValue) * 100).toFixed(1) : '0.0',
    }))

  const addHolding = (event) => {
    event.preventDefault()
    setFormError('')

    const ticker = form.ticker.trim().toUpperCase()
    const quantity = Number(form.quantity)
    const buyPrice = Number(form.buyPrice)

    if (!ticker) {
      setFormError('Ticker is required.')
      return
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setFormError('Quantity must be greater than 0.')
      return
    }
    if (!Number.isFinite(buyPrice) || buyPrice <= 0) {
      setFormError('Buy price must be greater than 0.')
      return
    }

    setHoldings((current) => {
      const existingIndex = current.findIndex((item) => item.ticker === ticker)
      if (existingIndex === -1) {
        return [...current, { ticker, quantity, buyPrice }]
      }

      const existing = current[existingIndex]
      const mergedQuantity = Number(existing.quantity) + quantity
      const mergedCost = Number(existing.quantity) * Number(existing.buyPrice) + quantity * buyPrice
      const mergedBuyPrice = mergedCost / mergedQuantity

      const updated = [...current]
      updated[existingIndex] = {
        ticker,
        quantity: mergedQuantity,
        buyPrice: mergedBuyPrice,
      }
      return updated
    })

    setForm({ ticker: '', quantity: '', buyPrice: '' })
  }

  const removeHolding = (ticker) => {
    setHoldings((current) => current.filter((item) => item.ticker !== ticker))
  }

  return (
    <section className="rounded-3xl border border-gray-800 bg-gray-900/95 p-5 shadow-2xl shadow-black/30">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-gray-500">Portfolio</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Tracker</h3>
        </div>
        <div className="rounded-2xl border border-gray-800 bg-gray-950/70 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Total value</p>
          <p className="mt-1 text-2xl font-bold text-white">{formatMoney(totalValue)}</p>
          <p className={`text-sm font-semibold ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {totalPnl >= 0 ? '+' : '-'}{formatMoney(Math.abs(totalPnl)).replace(/^[^\d-]+/, '')} ({totalPnl >= 0 ? '+' : '-'}{Math.abs(totalPnlPct).toFixed(2)}%)
          </p>
        </div>
      </div>

      <form onSubmit={addHolding} className="mt-4 grid gap-3 lg:grid-cols-4">
        <input
          value={form.ticker}
          onChange={(event) => setForm((current) => ({ ...current, ticker: event.target.value }))}
          placeholder="Ticker"
          className="rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
        />
        <input
          value={form.quantity}
          onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
          placeholder="Quantity"
          type="number"
          min="0"
          step="any"
          className="rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
        />
        <input
          value={form.buyPrice}
          onChange={(event) => setForm((current) => ({ ...current, buyPrice: event.target.value }))}
          placeholder="Buy Price"
          type="number"
          min="0"
          step="any"
          className="rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          className="rounded-xl border border-emerald-500/20 bg-emerald-500 px-4 py-2 text-sm font-semibold text-gray-950 transition hover:bg-emerald-400"
        >
          Add Position
        </button>
      </form>
      {formError && <p className="mt-2 text-sm text-red-400">{formError}</p>}

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-2">
          {enriched.length === 0 ? (
            <div className="rounded-2xl border border-gray-800 bg-gray-950/60 p-4 text-sm text-gray-400">
              Add holdings to start tracking portfolio value and P&L.
            </div>
          ) : (
            enriched.map((item) => (
              <div key={item.ticker} className="rounded-2xl border border-gray-800 bg-gray-950/60 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-white">{item.ticker}</p>
                    <p className="text-xs text-gray-500">{item.quantity} shares at {formatMoney(item.buyPrice)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeHolding(item.ticker)}
                    className="rounded-lg border border-gray-700 px-2 py-1 text-xs text-gray-400 hover:border-red-500/30 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.26em] text-gray-500">Current value</p>
                    <p className="text-lg font-semibold text-white">{formatMoney(item.currentValue)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.26em] text-gray-500">P&L</p>
                    <p className={`text-sm font-semibold ${item.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {item.pnl >= 0 ? '+' : '-'}{formatMoney(Math.abs(item.pnl)).replace(/^[^\d-]+/, '')} ({item.pnl >= 0 ? '+' : '-'}{Math.abs(item.pnlPct).toFixed(2)}%)
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-950/50 p-3">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Allocation</p>
          <div className="mt-3 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="currentValue"
                  nameKey="ticker"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={2}
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={entry.ticker} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<PortfolioTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  )
}
