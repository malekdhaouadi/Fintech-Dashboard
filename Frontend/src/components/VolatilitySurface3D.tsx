import { useEffect, useMemo, useState } from 'react'
import { getVolatilitySurface } from '../services/api.js'

type SurfaceResponse = {
  ticker?: string
  strikes: number[]
  expiries: number[]
  raw: number[][]
  smoothed: number[][]
}

function colorForVolatility(value: number, min: number, max: number) {
  const ratio = max > min ? (value - min) / (max - min) : 0.5
  const clamped = Math.min(1, Math.max(0, ratio))
  const hue = 210 - clamped * 145
  const lightness = 18 + clamped * 28
  return `hsl(${hue} 80% ${lightness}%)`
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

  const surfaceShape = useMemo(() => {
    if (!surface || zData.length === 0) {
      return { polygons: [], gridLines: [], stats: null }
    }

    const rows = zData.length
    const cols = zData[0]?.length ?? 0
    if (rows === 0 || cols === 0) {
      return { polygons: [], gridLines: [], stats: null }
    }

    const values = zData.flat().map((value) => Number(value))
    const minVol = Math.min(...values)
    const maxVol = Math.max(...values)
    const width = 920
    const height = 540
    const originX = 120
    const originY = 70
    const xStep = 72
    const yStep = 34
    const zStep = 210

    const project = (col: number, row: number, vol: number) => {
      const x = (col / Math.max(1, cols - 1)) * (cols - 1)
      const y = (row / Math.max(1, rows - 1)) * (rows - 1)
      const px = originX + (x - y) * xStep * 0.9
      const py = originY + (x + y) * yStep - vol * zStep
      return { x: px, y: py }
    }

    const polygons = []
    for (let row = 0; row < rows - 1; row += 1) {
      for (let col = 0; col < cols - 1; col += 1) {
        const v00 = Number(zData[row][col])
        const v10 = Number(zData[row][col + 1])
        const v11 = Number(zData[row + 1][col + 1])
        const v01 = Number(zData[row + 1][col])
        const p00 = project(col, row, v00)
        const p10 = project(col + 1, row, v10)
        const p11 = project(col + 1, row + 1, v11)
        const p01 = project(col, row + 1, v01)

        polygons.push({
          key: `${row}-${col}`,
          points: `${p00.x},${p00.y} ${p10.x},${p10.y} ${p11.x},${p11.y} ${p01.x},${p01.y}`,
          fill: colorForVolatility((v00 + v10 + v11 + v01) / 4, minVol, maxVol),
          stroke: 'rgba(15, 23, 42, 0.7)',
        })
      }
    }

    const gridLines = []
    for (let row = 0; row < rows; row += 1) {
      const linePoints = []
      for (let col = 0; col < cols; col += 1) {
        const point = project(col, row, Number(zData[row][col]))
        linePoints.push(`${point.x},${point.y}`)
      }
      gridLines.push({ key: `row-${row}`, points: linePoints.join(' ') })
    }

    return {
      polygons,
      gridLines,
      stats: { minVol, maxVol, width, height },
    }
  }, [surface, zData])

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
        <div className="mt-4 overflow-hidden rounded-2xl border border-gray-700 bg-gray-950/70 p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-gray-500">Surface view</p>
              <p className="text-sm text-gray-300">
                Pseudo-3D surface rendered in SVG to avoid Plotly runtime and bundling issues.
              </p>
            </div>
            {surfaceShape.stats ? (
              <div className="rounded-xl border border-gray-700 bg-gray-900/80 px-3 py-2 text-xs text-gray-400">
                min {(surfaceShape.stats.minVol * 100).toFixed(2)}% · max {(surfaceShape.stats.maxVol * 100).toFixed(2)}%
              </div>
            ) : null}
          </div>

          <svg viewBox={`0 0 ${surfaceShape.stats?.width ?? 920} ${surfaceShape.stats?.height ?? 540}`} className="h-[520px] w-full">
            <defs>
              <linearGradient id="surfaceBg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#0b1020" />
                <stop offset="100%" stopColor="#030712" />
              </linearGradient>
            </defs>

            <rect x="0" y="0" width={surfaceShape.stats?.width ?? 920} height={surfaceShape.stats?.height ?? 540} rx="18" fill="url(#surfaceBg)" />

            <g opacity="0.35">
              {surfaceShape.gridLines.map((line) => (
                <polyline key={line.key} points={line.points} fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="1" />
              ))}
            </g>

            <g>
              {surfaceShape.polygons.map((polygon) => (
                <polygon key={polygon.key} points={polygon.points} fill={polygon.fill} stroke={polygon.stroke} strokeWidth="0.8" />
              ))}
            </g>

            <g fill="#cbd5e1" fontSize="12">
              <text x="36" y="28">Volatility</text>
              <text x="790" y="510">Strike</text>
              <text x="38" y="508">Maturity</text>
            </g>

            <g stroke="rgba(148,163,184,0.22)" strokeWidth="1">
              <line x1="70" y1="470" x2="430" y2="470" />
              <line x1="70" y1="470" x2="70" y2="90" />
              <line x1="70" y1="470" x2="190" y2="540" />
            </g>
          </svg>

          <div className="mt-3 grid gap-2 text-xs text-gray-400 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-700 bg-gray-900/80 px-3 py-2">Raw data: {surface.raw.length} expiries x {surface.strikes.length} strikes</div>
            <div className="rounded-xl border border-gray-700 bg-gray-900/80 px-3 py-2">Mode: {mode}</div>
            <div className="rounded-xl border border-gray-700 bg-gray-900/80 px-3 py-2">Heat smoothing via Gaussian diffusion</div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
