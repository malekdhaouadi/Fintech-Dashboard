import { useEffect, useState } from 'react'
import { getIndicators } from '../services/api.js'

function SignalBadge({ signal }) {
  if (!signal) return <span className="text-gray-500">—</span>
  
  let colorClass = 'bg-gray-800 text-gray-400'
  if (signal === 'BUY' || signal === 'Bullish' || signal === 'Above' || signal === 'Oversold') {
    colorClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
  } else if (signal === 'SELL' || signal === 'Bearish' || signal === 'Below' || signal === 'Overbought') {
    colorClass = 'bg-red-500/20 text-red-400 border-red-500/30'
  } else if (signal === 'NEUTRAL' || signal === 'Neutral') {
    colorClass = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
  }

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${colorClass}`}>
      {signal}
    </span>
  )
}

export default function TechnicalAnalysis({ ticker, formatters }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const formatPrice = formatters?.formatPrice ?? ((value) => Number(value).toFixed(2))

  useEffect(() => {
    let active = true
    const fetchData = async () => {
      if (!ticker) return
      setLoading(true)
      setError(null)
      try {
        const res = await getIndicators(ticker)
        if (active) setData(res)
      } catch (e) {
        if (active) setError('Failed to load indicators')
      } finally {
        if (active) setLoading(false)
      }
    }
    fetchData()
    return () => { active = false }
  }, [ticker])

  if (loading) {
    return (
      <section className="rounded-3xl border border-gray-800 bg-gray-900/80 p-5 shadow-2xl shadow-black/25 backdrop-blur-sm animate-pulse">
        <div className="h-6 w-32 bg-gray-800 rounded mb-4" />
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-10 w-full bg-gray-800 rounded-lg" />)}
        </div>
      </section>
    )
  }

  if (error || !data) {
    return null
  }

  return (
    <section className="rounded-3xl border border-gray-800 bg-gray-900/80 p-5 shadow-2xl shadow-black/25 backdrop-blur-sm">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-gray-500">Technical Analysis</p>
          <h2 className="mt-2 text-lg font-bold text-white">{ticker} Indicators</h2>
        </div>
        <div className="flex flex-col items-end">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Overall Signal</p>
          <SignalBadge signal={data.overall} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between rounded-xl border border-gray-800/50 bg-gray-950/50 p-3">
          <span className="text-sm font-medium text-gray-300">RSI (14)</span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-white">{data.rsi ?? '—'}</span>
            <SignalBadge signal={data.rsi_signal} />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-gray-800/50 bg-gray-950/50 p-3">
          <span className="text-sm font-medium text-gray-300">MACD (12,26,9)</span>
          <SignalBadge signal={data.macd_signal} />
        </div>
        <div className="flex items-center justify-between rounded-xl border border-gray-800/50 bg-gray-950/50 p-3">
          <span className="text-sm font-medium text-gray-300">50-Day MA</span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-white">{data.ma50 != null ? formatPrice(data.ma50) : '—'}</span>
            <SignalBadge signal={data.price_vs_ma50} />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-gray-800/50 bg-gray-950/50 p-3">
          <span className="text-sm font-medium text-gray-300">200-Day MA</span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-white">{data.ma200 != null ? formatPrice(data.ma200) : '—'}</span>
            <SignalBadge signal={data.price_vs_ma200} />
          </div>
        </div>
        <div className="rounded-xl border border-gray-800/50 bg-gray-950/50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-300">Signal interpretation</span>
            <p className="text-xs text-gray-500">Majority vote of RSI, MACD, and moving averages</p>
          </div>
        </div>
      </div>
    </section>
  )
}
