import { useEffect, useState } from 'react'
import { Line, LineChart, ResponsiveContainer } from 'recharts'
import { getPrice, getHistory } from '../services/api.js'

const OVERVIEW_INDICES = [
  { symbol: '^GSPC', name: 'S&P 500' },
  { symbol: '^IXIC', name: 'NASDAQ' },
  { symbol: '^DJI', name: 'DOW' },
  { symbol: '^FCHI', name: 'CAC 40' },
  { symbol: '^GDAXI', name: 'DAX' },
  { symbol: 'GC=F', name: 'Gold' },
  { symbol: 'BTC-USD', name: 'Bitcoin' },
  { symbol: 'EURUSD=X', name: 'EUR/USD' },
]

function MiniSparkline({ points, positive }) {
  if (!points || points.length === 0) {
    return <div className="h-8 w-16 rounded bg-gray-800/50" />
  }
  return (
    <div className="flex h-8 w-16 items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="close"
            stroke={positive ? '#22c55e' : '#ef4444'}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function MarketOverview({ formatters }) {
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const formatPrice = formatters?.formatPrice ?? ((value) => Number(value).toFixed(2))
  const formatPercent = formatters?.formatPercent ?? ((value) => `${Number(value).toFixed(2)}%`)

  const fetchData = async () => {
    try {
      const results = await Promise.all(
        OVERVIEW_INDICES.map(async (item) => {
          try {
            const [priceData, historyData] = await Promise.all([
              getPrice(item.symbol),
              getHistory(item.symbol, '5d'),
            ])
            const points = historyData.slice(-20).map((row, index) => ({
              index,
              close: Number(row.close),
            }))
            return {
              ...item,
              price: priceData.price,
              change: priceData.change,
              change_pct: priceData.change_pct,
              points,
            }
          } catch (e) {
            return { ...item, error: true }
          }
        })
      )

      const nextData = {}
      results.forEach((res) => {
        if (!res.error) {
          nextData[res.symbol] = res
        }
      })
      setData(nextData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000) // 60s
    return () => clearInterval(interval)
  }, [])

  if (loading && Object.keys(data).length === 0) {
    return (
      <div className="flex gap-4 overflow-hidden py-2 opacity-50">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 w-48 shrink-0 rounded-2xl bg-gray-800/50 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 pt-2 scrollbar-hide">
      {OVERVIEW_INDICES.map((item) => {
        const itemData = data[item.symbol]
        if (!itemData) return null

        const positive = Number(itemData.change) >= 0

        return (
          <div
            key={item.symbol}
            className="flex min-w-[220px] shrink-0 items-center justify-between rounded-2xl border border-gray-800 bg-gray-900/60 p-3 shadow-lg backdrop-blur-sm transition-transform hover:-translate-y-1 hover:border-gray-700"
          >
            <div>
              <p className="text-xs font-semibold text-gray-400">{item.name}</p>
              <p className="text-sm font-bold text-white">{formatPrice(itemData.price)}</p>
              <p className={`text-xs font-medium ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatPercent(itemData.change_pct)}
              </p>
            </div>
            <MiniSparkline points={itemData.points} positive={positive} />
          </div>
        )
      })}
    </div>
  )
}
