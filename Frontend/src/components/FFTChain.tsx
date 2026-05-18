import { useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getFftPrices } from '../services/api.js'

type FFTResponse = {
  ticker: string
  sigma: number
  spot: number
  maturity_days: number
  strikes: number[]
  call_prices: number[]
  characteristic_function: {
    u: number[]
    real: number[]
    imag: number[]
  }
}

export default function FFTChain() {
  const [ticker, setTicker] = useState('AAPL')
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<FFTResponse | null>(null)
  const [chartReady, setChartReady] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const response = (await getFftPrices({
        ticker: ticker.trim().toUpperCase(),
        T_days: days,
      })) as FFTResponse
      setData(response)
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ((err as any).response?.data?.detail as string) || 'Unable to load FFT chain'
          : 'Unable to load FFT chain'
      setError(message)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    setChartReady(true)
  }, [])

  const chainData = useMemo(() => {
    if (!data) return []
    return data.strikes.map((k, idx) => ({
      strike: Number(k.toFixed(2)),
      price: data.call_prices[idx],
    }))
  }, [data])

  const cfSnapshot = useMemo(() => {
    if (!data) return null
    const n = Math.min(6, data.characteristic_function.u.length)
    return data.characteristic_function.u.slice(0, n).map((u, idx) => {
      const real = data.characteristic_function.real[idx]
      const imag = data.characteristic_function.imag[idx]
      return `u=${u.toFixed(2)} -> ${real.toFixed(4)} + ${imag.toFixed(4)}i`
    })
  }, [data])

  return (
    <section className="rounded-3xl border border-gray-800 bg-gray-900/90 p-5 shadow-2xl shadow-black/30">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-gray-500">FFT Pricing</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Carr-Madan Option Chain</h3>
          <p className="mt-1 text-sm text-gray-400">Prices a strike strip in O(N log N) using the characteristic function.</p>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            className="w-28 rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none"
          />
          <button
            type="button"
            onClick={loadData}
            className="rounded-xl border border-emerald-500/20 bg-emerald-500 px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-emerald-400"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-gray-700 bg-gray-800/70 p-4">
        <label className="block text-xs uppercase tracking-[0.22em] text-gray-500">Maturity days: {days}</label>
        <input
          type="range"
          min={7}
          max={365}
          step={1}
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          onMouseUp={loadData}
          onTouchEnd={loadData}
          className="mt-2 w-full"
        />
      </div>

      {loading ? <div className="mt-4 rounded-xl border border-gray-700 bg-gray-800/70 px-3 py-2 text-sm text-gray-300">Running FFT...</div> : null}
      {error ? <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div> : null}

      {data ? (
        <>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-700 bg-gray-800/70 p-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-gray-500">Spot</p>
              <p className="mt-1 text-xl font-semibold text-cyan-300">${data.spot.toFixed(2)}</p>
            </div>
            <div className="rounded-2xl border border-gray-700 bg-gray-800/70 p-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-gray-500">Volatility</p>
              <p className="mt-1 text-xl font-semibold text-amber-300">{(data.sigma * 100).toFixed(2)}%</p>
            </div>
            <div className="rounded-2xl border border-gray-700 bg-gray-800/70 p-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-gray-500">Maturity</p>
              <p className="mt-1 text-xl font-semibold text-emerald-300">{data.maturity_days.toFixed(0)} d</p>
            </div>
          </div>

          <div className="mt-4 h-[400px] rounded-2xl border border-gray-700 bg-gray-950/70 p-3">
            {chartReady ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chainData} margin={{ top: 20, right: 22, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="strike" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid #374151',
                    borderRadius: '12px',
                    color: '#e5e7eb',
                  }}
                />
                <Line type="monotone" dataKey="price" stroke="#22c55e" strokeWidth={2} dot={false} name="Call price" />
                </LineChart>
              </ResponsiveContainer>
            ) : null}
          </div>

          {cfSnapshot ? (
            <div className="mt-4 rounded-2xl border border-gray-700 bg-gray-800/70 p-3 text-xs text-gray-300">
              <p className="mb-2 uppercase tracking-[0.22em] text-gray-500">Characteristic function samples</p>
              <div className="grid gap-1 md:grid-cols-2 xl:grid-cols-3">
                {cfSnapshot.map((line) => (
                  <span key={line} className="rounded-lg bg-gray-900/80 px-2 py-1">{line}</span>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
