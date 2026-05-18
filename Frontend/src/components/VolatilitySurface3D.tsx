import { useEffect, useMemo, useState } from 'react'
import Plot from 'react-plotly.js'
import { getVolatilitySurface } from '../services/api.js'

type SurfaceResponse = {
  ticker?: string
  strikes: number[]
  expiries: number[]
  raw: number[][]
  smoothed: number[][]
}

export default function VolatilitySurface3D() {
  const [ticker, setTicker] = useState('AAPL')
  const [mode, setMode] = useState<'raw' | 'smoothed'>('smoothed')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [surface, setSurface] = useState<SurfaceResponse | null>(null)

  const loadSurface = async () => {
    setLoading(true)
    setError('')
    try {
      const data = (await getVolatilitySurface(ticker.trim().toUpperCase())) as SurfaceResponse
      setSurface(data)
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ((err as any).response?.data?.detail as string) || 'Unable to load volatility surface'
          : 'Unable to load volatility surface'
      setError(message)
      setSurface(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSurface()
  }, [])

  const zData = useMemo(() => {
    if (!surface) return []
    return mode === 'raw' ? surface.raw : surface.smoothed
  }, [mode, surface])

  return (
    <section className="rounded-3xl border border-gray-800 bg-gray-900/90 p-5 shadow-2xl shadow-black/30">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-gray-500">Volatility Surface</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Heat Equation Smoothing</h3>
          <p className="mt-1 text-sm text-gray-400">Gaussian diffusion smooths smile noise while preserving the term-structure shape.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            className="w-32 rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none"
            placeholder="Ticker"
          />
          <button
            type="button"
            onClick={loadSurface}
            className="rounded-xl border border-emerald-500/20 bg-emerald-500 px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-emerald-400"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setMode('raw')}
          className={`rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${mode === 'raw' ? 'border-blue-400/40 bg-blue-500/20 text-blue-200' : 'border-gray-700 bg-gray-800 text-gray-300'}`}
        >
          Raw Surface
        </button>
        <button
          type="button"
          onClick={() => setMode('smoothed')}
          className={`rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${mode === 'smoothed' ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-200' : 'border-gray-700 bg-gray-800 text-gray-300'}`}
        >
          Heat-Smoothed Surface
        </button>
      </div>

      {loading ? <div className="mt-4 rounded-xl border border-gray-700 bg-gray-800/70 px-3 py-2 text-sm text-gray-300">Loading 3D surface...</div> : null}
      {error ? <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div> : null}

      {surface ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-gray-700 bg-gray-950/70 p-2">
          <Plot
            data={[
              {
                type: 'surface',
                x: surface.strikes,
                y: surface.expiries,
                z: zData,
                colorscale: [
                  [0, '#0b1020'],
                  [0.25, '#1d4ed8'],
                  [0.5, '#0ea5e9'],
                  [0.75, '#22c55e'],
                  [1, '#f59e0b'],
                ],
              },
            ]}
            layout={{
              paper_bgcolor: '#030712',
              plot_bgcolor: '#030712',
              font: { color: '#cbd5e1' },
              margin: { l: 0, r: 0, t: 20, b: 0 },
              scene: {
                xaxis: { title: 'Strike', color: '#94a3b8' },
                yaxis: { title: 'Maturity (days)', color: '#94a3b8' },
                zaxis: { title: 'Volatility', color: '#94a3b8' },
              },
            }}
            style={{ width: '100%', height: '520px' }}
            config={{ displaylogo: false, responsive: true }}
          />
        </div>
      ) : null}
    </section>
  )
}
