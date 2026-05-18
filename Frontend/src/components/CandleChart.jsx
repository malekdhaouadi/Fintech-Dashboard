import { useEffect, useMemo, useRef, useState } from 'react'
import { Bar, CartesianGrid, ComposedChart, Customized, Tooltip, XAxis, YAxis } from 'recharts'
import { getHistory } from '../services/api.js'

const PERIODS = [
  { label: '1W', value: '5d' },
  { label: '1M', value: '1mo' },
  { label: '3M', value: '3mo' },
  { label: '6M', value: '6mo' },
  { label: '1Y', value: '1y' },
]

const volumeFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  compactDisplay: 'short',
  maximumFractionDigits: 1,
})

function formatDate(value) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function CandleLayer({ data, xAxisMap, yAxisMap }) {
  const xAxis = Object.values(xAxisMap ?? {})[0]
  const yAxis = Object.values(yAxisMap ?? {})[0]

  if (!xAxis?.scale || !yAxis?.scale || !Array.isArray(data)) {
    return null
  }

  const xScale = xAxis.scale
  const yScale = yAxis.scale
  const bandwidth = typeof xScale.bandwidth === 'function' ? xScale.bandwidth() : 16
  const candleWidth = Math.max(5, bandwidth * 0.42)

  return (
    <g>
      {data.map((entry) => {
        const xPosition = xScale(entry.date)
        if (xPosition === undefined || xPosition === null) {
          return null
        }

        const centerX = xPosition + bandwidth / 2
        const openY = yScale(entry.open)
        const closeY = yScale(entry.close)
        const highY = yScale(entry.high)
        const lowY = yScale(entry.low)
        const bullish = entry.close >= entry.open
        const bodyTop = Math.min(openY, closeY)
        const bodyHeight = Math.max(Math.abs(closeY - openY), 2)
        const candleColor = bullish ? '#22c55e' : '#ef4444'

        return (
          <g key={entry.date}>
            <line
              x1={centerX}
              x2={centerX}
              y1={highY}
              y2={lowY}
              stroke={candleColor}
              strokeWidth={1.5}
              strokeLinecap="round"
              opacity={0.9}
            />
            <rect
              x={centerX - candleWidth / 2}
              y={bodyTop}
              width={candleWidth}
              height={bodyHeight}
              rx={2}
              fill={candleColor}
              opacity={0.95}
            />
          </g>
        )
      })}
    </g>
  )
}

function ChartTooltip({ active, payload, formatPrice, formatCompact }) {
  if (!active || !payload?.length) {
    return null
  }

  const entry = payload[0].payload

  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-950/95 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl">
      <p className="text-sm font-semibold text-white">{formatDate(entry.date)}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-gray-500">Open</p>
          <p className="mt-1 text-gray-100">{formatPrice(entry.open)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-gray-500">High</p>
          <p className="mt-1 text-emerald-400">{formatPrice(entry.high)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-gray-500">Low</p>
          <p className="mt-1 text-red-400">{formatPrice(entry.low)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-gray-500">Close</p>
          <p className="mt-1 text-gray-100">{formatPrice(entry.close)}</p>
        </div>
        <div className="col-span-2">
          <p className="text-xs uppercase tracking-[0.28em] text-gray-500">Volume</p>
          <p className="mt-1 text-gray-100">{formatCompact(entry.volume)}</p>
        </div>
      </div>
    </div>
  )
}

export default function CandleChart({ ticker, formatters }) {
  const [period, setPeriod] = useState('1M')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const chartBoxRef = useRef(null)
  const [chartSize, setChartSize] = useState({ width: 0, height: 440 })

  const formatPrice = formatters?.formatPrice ?? ((value) => Number(value).toFixed(2))
  const formatCompact =
    formatters?.formatCompact ?? ((value) => volumeFormatter.format(Number(value)))

  const backendPeriod = useMemo(() => {
    return PERIODS.find((item) => item.label === period)?.value ?? '1mo'
  }, [period])

  useEffect(() => {
    let active = true

    const loadHistory = async () => {
      setLoading(true)

      try {
        const rows = await getHistory(ticker, backendPeriod)
        if (!active) {
          return
        }

        setHistory(
          rows
            .slice()
            .sort((left, right) => new Date(left.date) - new Date(right.date))
            .map((row) => ({
              ...row,
              dateLabel: formatDate(row.date),
            })),
        )
        setError(null)
      } catch (requestError) {
        if (!active) {
          return
        }

        setHistory([])
        setError(
          requestError?.response?.data?.detail ?? 'Unable to load historical data for this ticker.',
        )
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    if (ticker) {
      loadHistory()
    }

    return () => {
      active = false
    }
  }, [ticker, backendPeriod])

  useEffect(() => {
    const element = chartBoxRef.current
    if (!element) {
      return undefined
    }

    const updateSize = () => {
      const rect = element.getBoundingClientRect()
      setChartSize({
        width: Math.max(0, Math.floor(rect.width)),
        height: 440,
      })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  return (
    <section className="flex min-h-[520px] flex-col rounded-3xl border border-gray-800 bg-gray-900/95 p-4 shadow-2xl shadow-black/30">
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-gray-500">Candles</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Price history</h3>
          <p className="mt-2 text-sm text-gray-400">OHLC levels with volume overlay for {ticker}</p>
        </div>

        <div className="inline-flex flex-wrap gap-2 rounded-2xl border border-gray-800 bg-gray-950/70 p-2">
          {PERIODS.map((option) => {
            const active = option.label === period

            return (
              <button
                key={option.label}
                type="button"
                onClick={() => setPeriod(option.label)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? 'bg-emerald-500 text-gray-950'
                    : 'bg-transparent text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      <div ref={chartBoxRef} className="relative flex-1 overflow-hidden rounded-2xl border border-gray-800 bg-gray-950/60 p-3">
        {error ? (
          <div className="flex h-full items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center text-sm text-red-300">
            {error}
          </div>
        ) : null}

        {!error && chartSize.width > 0 ? (
          <ComposedChart width={chartSize.width} height={chartSize.height} data={history} margin={{ top: 16, right: 20, bottom: 8, left: 8 }}>
              <CartesianGrid stroke="rgba(148, 163, 184, 0.12)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={{ stroke: 'rgba(148, 163, 184, 0.18)' }}
                tickLine={false}
                minTickGap={18}
              />
              <YAxis
                yAxisId="price"
                domain={[(dataMin) => dataMin * 0.985, (dataMax) => dataMax * 1.015]}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={{ stroke: 'rgba(148, 163, 184, 0.18)' }}
                tickLine={false}
                width={72}
                tickFormatter={(value) => formatPrice(value)}
              />
              <YAxis yAxisId="volume" hide domain={[0, 'dataMax']} />
              <Tooltip content={<ChartTooltip formatPrice={formatPrice} formatCompact={formatCompact} />} />
              <Customized component={CandleLayer} />
              <Bar
                yAxisId="volume"
                dataKey="volume"
                fill="#38bdf8"
                opacity={0.24}
                radius={[6, 6, 0, 0]}
                barSize={10}
              />
          </ComposedChart>
        ) : null}

        {loading ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-gray-950/40">
            <div className="rounded-2xl border border-gray-700 bg-gray-900/90 px-4 py-3 text-sm text-gray-300 shadow-xl shadow-black/30">
              Loading chart data...
            </div>
          </div>
        ) : null}

        {!loading && history.length === 0 && !error ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl text-sm text-gray-500">
            No history available for this period.
          </div>
        ) : null}
      </div>
    </section>
  )
}
