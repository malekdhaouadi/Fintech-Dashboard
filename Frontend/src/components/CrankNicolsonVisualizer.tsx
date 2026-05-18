import { useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getOptionPrice, solveCrankNicolson } from '../services/api.js'

type OptionType = 'call' | 'put'

type OptionPriceData = {
  hist_vol: number
}

type CNResponse = {
  S: number[]
  V_numerical: number[]
  V_exact: number[]
  max_error: number
  mean_error: number
  dS: number
  dt: number
}

export default function CrankNicolsonVisualizer() {
  const [ticker, setTicker] = useState('AAPL')
  const [strike, setStrike] = useState(180)
  const [days, setDays] = useState(30)
  const [optionType, setOptionType] = useState<OptionType>('call')

  const [sMax, setSMax] = useState(350)
  const [nx, setNx] = useState(120)
  const [nt, setNt] = useState(220)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sigma, setSigma] = useState<number | null>(null)
  const [cn, setCn] = useState<CNResponse | null>(null)
  const [chartReady, setChartReady] = useState(false)

  const chartData = useMemo(() => {
    if (!cn) return []
    return cn.S.map((s, index) => ({
      spot: Number(s.toFixed(4)),
      exact: cn.V_exact[index],
      numerical: cn.V_numerical[index],
      absError: Math.abs(cn.V_exact[index] - cn.V_numerical[index]),
    }))
  }, [cn])

  const runModel = async () => {
    setLoading(true)
    setError('')
    try {
      const priceResp = (await getOptionPrice({
        ticker: ticker.trim().toUpperCase(),
        K: strike,
        T_days: days,
        option_type: optionType,
      })) as OptionPriceData

      const vol = Math.max(priceResp.hist_vol ?? 0.2, 0.01)
      setSigma(vol)

      const cnResp = (await solveCrankNicolson({
        K: strike,
        T_days: days,
        r: 0.03,
        sigma: vol,
        S_max: sMax,
        nx,
        nt,
        option_type: optionType,
      })) as CNResponse

      setCn(cnResp)
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ((err as any).response?.data?.detail as string) || 'Unable to solve PDE'
          : 'Unable to solve PDE'
      setError(message)
      setCn(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setChartReady(true)
  }, [])

  return (
    <section className="rounded-3xl border border-gray-800 bg-gray-900/90 p-5 shadow-2xl shadow-black/30">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-gray-500">PDE Solver</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Crank-Nicolson vs Exact</h3>
          <p className="mt-1 text-sm text-gray-400">Unconditionally stable finite-difference scheme for Black-Scholes PDE.</p>
        </div>
        <button
          type="button"
          onClick={runModel}
          className="rounded-xl border border-emerald-500/20 bg-emerald-500 px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-emerald-400"
        >
          Run Solver
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <label className="text-xs text-gray-300">
          <span className="mb-1 block uppercase tracking-[0.22em] text-gray-500">Ticker</span>
          <input
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none"
          />
        </label>
        <label className="text-xs text-gray-300">
          <span className="mb-1 block uppercase tracking-[0.22em] text-gray-500">Strike</span>
          <input
            type="number"
            value={strike}
            onChange={(e) => setStrike(Number(e.target.value))}
            className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none"
          />
        </label>
        <label className="text-xs text-gray-300">
          <span className="mb-1 block uppercase tracking-[0.22em] text-gray-500">Days</span>
          <input
            type="number"
            min={1}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none"
          />
        </label>
        <label className="text-xs text-gray-300">
          <span className="mb-1 block uppercase tracking-[0.22em] text-gray-500">Type</span>
          <select
            value={optionType}
            onChange={(e) => setOptionType(e.target.value as OptionType)}
            className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none"
          >
            <option value="call">Call</option>
            <option value="put">Put</option>
          </select>
        </label>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <label className="rounded-2xl border border-gray-700 bg-gray-800/70 p-3 text-xs text-gray-300">
          <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-gray-500">
            <span>S_max</span>
            <span>{sMax}</span>
          </div>
          <input type="range" min={100} max={1200} step={10} value={sMax} onChange={(e) => setSMax(Number(e.target.value))} className="w-full" />
        </label>

        <label className="rounded-2xl border border-gray-700 bg-gray-800/70 p-3 text-xs text-gray-300">
          <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-gray-500">
            <span>nx (grid points)</span>
            <span>{nx}</span>
          </div>
          <input type="range" min={40} max={500} step={10} value={nx} onChange={(e) => setNx(Number(e.target.value))} className="w-full" />
        </label>

        <label className="rounded-2xl border border-gray-700 bg-gray-800/70 p-3 text-xs text-gray-300">
          <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-gray-500">
            <span>nt (time steps)</span>
            <span>{nt}</span>
          </div>
          <input type="range" min={40} max={900} step={20} value={nt} onChange={(e) => setNt(Number(e.target.value))} className="w-full" />
        </label>
      </div>

      {loading ? <div className="mt-4 rounded-xl border border-gray-700 bg-gray-800/70 px-3 py-2 text-sm text-gray-300">Solving PDE grid...</div> : null}
      {error ? <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div> : null}

      {cn ? (
        <>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-gray-700 bg-gray-800/70 p-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-gray-500">Sigma used</p>
              <p className="mt-1 text-lg font-semibold text-cyan-300">{((sigma ?? 0) * 100).toFixed(2)}%</p>
            </div>
            <div className="rounded-2xl border border-gray-700 bg-gray-800/70 p-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-gray-500">Max error</p>
              <p className="mt-1 text-lg font-semibold text-rose-300">{cn.max_error.toFixed(6)}</p>
            </div>
            <div className="rounded-2xl border border-gray-700 bg-gray-800/70 p-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-gray-500">Mean error</p>
              <p className="mt-1 text-lg font-semibold text-amber-300">{cn.mean_error.toFixed(6)}</p>
            </div>
            <div className="rounded-2xl border border-gray-700 bg-gray-800/70 p-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-gray-500">Grid step (dS/dt)</p>
              <p className="mt-1 text-lg font-semibold text-indigo-300">{cn.dS.toFixed(3)} / {cn.dt.toExponential(2)}</p>
            </div>
          </div>

          <div className="mt-4 h-[420px] rounded-2xl border border-gray-700 bg-gray-950/70 p-3">
            {chartReady ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 20, right: 24, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="spot" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid #374151',
                    borderRadius: '12px',
                    color: '#e5e7eb',
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="exact" stroke="#22c55e" strokeWidth={2} dot={false} name="Exact Black-Scholes" />
                <Line type="monotone" dataKey="numerical" stroke="#60a5fa" strokeWidth={2} dot={false} name="Crank-Nicolson" />
                <Line type="monotone" dataKey="absError" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="|Error|" />
                </LineChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  )
}
