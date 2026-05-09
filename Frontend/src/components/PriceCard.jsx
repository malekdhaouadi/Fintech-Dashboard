const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

const compactFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  compactDisplay: 'short',
  maximumFractionDigits: 1,
})

function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—'
  }

  return currencyFormatter.format(Number(value))
}

function formatSignedCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—'
  }

  const absolute = currencyFormatter.format(Math.abs(Number(value)))
  return `${Number(value) >= 0 ? '+' : '-'}${absolute.replace('$', '')}`
}

function formatSignedPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—'
  }

  return `${Number(value) >= 0 ? '+' : '-'}${Math.abs(Number(value)).toFixed(2)}%`
}

function formatVolume(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—'
  }

  return compactFormatter.format(Number(value))
}

function ArrowIcon({ positive }) {
  return positive ? (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M10 4.5v11M10 4.5 5.5 9m4.5-4.5L14.5 9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ) : (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M10 15.5v-11M10 15.5 14.5 11m-4.5 4.5L5.5 11"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function PriceCard({ priceData }) {
  const ticker = priceData?.ticker ?? '—'
  const price = priceData?.price
  const change = Number(priceData?.change ?? 0)
  const changePct = Number(priceData?.change_pct ?? 0)
  const volume = priceData?.volume
  const positive = change >= 0

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-gray-800 bg-gray-900/95 p-5 shadow-2xl shadow-black/30 transition-all duration-300 hover:-translate-y-0.5 hover:border-gray-700 hover:bg-gray-900">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/8 via-transparent to-blue-500/8 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-gray-500">Current quote</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-white">
              {ticker}
            </h2>
          </div>
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium ${
              positive
                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                : 'border-red-500/20 bg-red-500/10 text-red-400'
            }`}
          >
            <ArrowIcon positive={positive} />
            <span>{formatSignedCurrency(change)}</span>
          </div>
        </div>

        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-gray-500">Price</p>
          <p className="mt-2 text-4xl font-semibold text-white">{formatCurrency(price)}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-gray-800 bg-gray-950/70 p-3">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Change %</p>
            <p className={`mt-2 text-lg font-semibold ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatSignedPercent(changePct)}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-800 bg-gray-950/70 p-3">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Volume</p>
            <p className="mt-2 text-lg font-semibold text-gray-100">{formatVolume(volume)}</p>
          </div>
        </div>
      </div>
    </article>
  )
}
