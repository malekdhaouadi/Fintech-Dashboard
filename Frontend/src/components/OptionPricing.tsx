import { useEffect, useMemo, useState } from 'react'
import { calculateImpliedVol, getOptionPrice } from '../services/api.js'

type OptionType = 'call' | 'put'

type Greeks = {
  delta: number
  gamma: number
  vega: number
  theta: number
  rho: number
}

type OptionPriceResponse = {
  ticker: string
  spot: number
  strike: number
  maturity_days: number
  risk_free_rate: number
  option_type: OptionType
  theoretical_price: number
  hist_vol: number
  implied_vol: number | null
  market_option_price: number | null
  market_option_expiry: string | null
  greeks: Greeks
}

type ImpliedVolResponse = {
  implied_vol: number
  implied_vol_pct: number
  bs_price_check: number
}

const greekPalette: Record<keyof Greeks, string> = {
  delta: 'text-cyan-300',
  gamma: 'text-emerald-300',
  vega: 'text-amber-300',
  theta: 'text-rose-300',
  rho: 'text-indigo-300',
}

function metricCard(label: string, value: string, accent = 'text-white') {
  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-800/80 p-3">
      <p className="text-[10px] uppercase tracking-[0.25em] text-gray-500">{label}</p>
      <p className={`mt-2 text-xl font-semibold ${accent}`}>{value}</p>
    </div>
  )
}

export default function OptionPricing() {
  const [ticker, setTicker] = useState('AAPL')
  const [strike, setStrike] = useState(180)
  const [days, setDays] = useState(30)
  const [optionType, setOptionType] = useState<OptionType>('call')
  const [manualMarketPrice, setManualMarketPrice] = useState<number | ''>('')

  const [data, setData] = useState<OptionPriceResponse | null>(null)
  const [manualIv, setManualIv] = useState<ImpliedVolResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ivLoading, setIvLoading] = useState(false)

  const loadPricing = async () => {
    setLoading(true)
    setError('')
    try {
      const payload = (await getOptionPrice({
        ticker: ticker.trim().toUpperCase(),
        K: strike,
        T_days: days,
        option_type: optionType,
      })) as OptionPriceResponse
      setData(payload)
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ((err as any).response?.data?.detail as string) || 'Unable to load option price'
          : 'Unable to load option price'
      setError(message)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  const computeManualIv = async () => {
    if (!data || manualMarketPrice === '' || Number(manualMarketPrice) <= 0) {
      return
    }

    setIvLoading(true)
    setError('')
    try {
      const response = (await calculateImpliedVol({
        market_price: Number(manualMarketPrice),
        S: data.spot,
        K: data.strike,
        T_days: data.maturity_days,
        r: data.risk_free_rate,
        option_type: data.option_type,
      })) as ImpliedVolResponse
      setManualIv(response)
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ((err as any).response?.data?.detail as string) || 'Unable to compute implied volatility'
          : 'Unable to compute implied volatility'
      setError(message)
      setManualIv(null)
    } finally {
      setIvLoading(false)
    }
  }

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (ticker.trim()) {
        loadPricing()
      }
    }, 350)

    return () => window.clearTimeout(handle)
    // Recalculate in real-time when ticker or key params change.
  }, [ticker, strike, days, optionType])

  const displayedIv = useMemo(() => {
    if (manualIv) return manualIv.implied_vol
    return data?.implied_vol ?? null
  }, [data?.implied_vol, manualIv])

  return (
    <section className="rounded-3xl border border-gray-800 bg-gray-900/90 p-5 shadow-2xl shadow-black/30">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-gray-500">Options Pricing</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Black-Scholes + Greeks</h3>
          <p className="mt-1 text-sm text-gray-400">Closed-form price, analytical sensitivities, and implied volatility inversion.</p>
        </div>
        <button
          type="button"
          onClick={loadPricing}
          className="rounded-xl border border-emerald-500/20 bg-emerald-500 px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-emerald-400"
        >
          Refresh
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <label className="text-xs text-gray-300">
          <span className="mb-1 block uppercase tracking-[0.22em] text-gray-500">Ticker</span>
          <input
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/40"
          />
        </label>

        <label className="text-xs text-gray-300">
          <span className="mb-1 block uppercase tracking-[0.22em] text-gray-500">Strike</span>
          <input
            type="number"
            value={strike}
            onChange={(e) => setStrike(Number(e.target.value))}
            className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/40"
          />
        </label>

        <label className="text-xs text-gray-300">
          <span className="mb-1 block uppercase tracking-[0.22em] text-gray-500">Maturity (days)</span>
          <input
            type="number"
            value={days}
            min={1}
            onChange={(e) => setDays(Number(e.target.value))}
            className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/40"
          />
        </label>

        <label className="text-xs text-gray-300">
          <span className="mb-1 block uppercase tracking-[0.22em] text-gray-500">Option type</span>
          <select
            value={optionType}
            onChange={(e) => setOptionType(e.target.value as OptionType)}
            className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/40"
          >
            <option value="call">Call</option>
            <option value="put">Put</option>
          </select>
        </label>
      </div>

      {loading ? <div className="mt-4 rounded-xl border border-gray-700 bg-gray-800/70 px-3 py-2 text-sm text-gray-300">Loading option model...</div> : null}
      {error ? <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div> : null}

      {data ? (
        <>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {metricCard('Spot', `$${data.spot.toFixed(2)}`)}
            {metricCard('Theoretical Price', `$${data.theoretical_price.toFixed(4)}`, 'text-emerald-300')}
            {metricCard('Historical Vol', `${(data.hist_vol * 100).toFixed(2)}%`, 'text-cyan-300')}
            {metricCard(
              'Implied Vol',
              displayedIv !== null ? `${(displayedIv * 100).toFixed(2)}%` : 'N/A',
              displayedIv !== null ? 'text-amber-300' : 'text-gray-400',
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-gray-700 bg-gray-800/70 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold uppercase tracking-[0.25em] text-gray-400">Greeks</h4>
              {data.market_option_price ? (
                <span className="text-xs text-gray-400">Market option: ${data.market_option_price.toFixed(3)} ({data.market_option_expiry || 'nearest'})</span>
              ) : (
                <span className="text-xs text-gray-500">No market option quote found for this strike/expiry</span>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {(Object.keys(data.greeks) as (keyof Greeks)[]).map((key) => (
                <div key={key} className="rounded-xl border border-gray-700 bg-gray-900/80 p-3 text-center">
                  <p className="text-xs uppercase tracking-[0.22em] text-gray-500">{key}</p>
                  <p className={`mt-1 text-lg font-semibold ${greekPalette[key]}`}>{data.greeks[key].toFixed(4)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-gray-700 bg-gray-800/70 p-4">
            <h4 className="text-sm font-semibold uppercase tracking-[0.25em] text-gray-400">Manual Implied Volatility</h4>
            <p className="mt-1 text-xs text-gray-500">Use Newton-Raphson inversion from a custom market option price.</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input
                type="number"
                min={0}
                step="0.0001"
                value={manualMarketPrice}
                onChange={(e) => setManualMarketPrice(e.target.value ? Number(e.target.value) : '')}
                placeholder="Market option price"
                className="w-56 rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/40"
              />
              <button
                type="button"
                onClick={computeManualIv}
                disabled={manualMarketPrice === '' || ivLoading}
                className="rounded-xl border border-blue-500/20 bg-blue-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {ivLoading ? 'Computing...' : 'Compute IV'}
              </button>
              {manualIv ? (
                <span className="text-sm text-amber-300">
                  IV = {manualIv.implied_vol_pct.toFixed(3)}% (BS check ${manualIv.bs_price_check.toFixed(4)})
                </span>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </section>
  )
}
