const DEFAULT_LOCALE = 'en-US'

function createNumberFormatter({ locale = DEFAULT_LOCALE, style = 'currency', currency = 'USD', maximumFractionDigits = 2, minimumFractionDigits } = {}) {
  const options = { maximumFractionDigits }
  if (typeof minimumFractionDigits === 'number') {
    options.minimumFractionDigits = minimumFractionDigits
  }
  if (style) {
    options.style = style
  }
  if (currency) {
    options.currency = currency
  }
  return new Intl.NumberFormat(locale, options)
}

export function getMarketFormatter(marketConfig) {
  if (marketConfig?.currencyMode === 'decimal') {
    const decimalFormatter = createNumberFormatter({ style: 'decimal', maximumFractionDigits: 5, minimumFractionDigits: 4 })
    const signedDecimalFormatter = createNumberFormatter({ style: 'decimal', maximumFractionDigits: 5, minimumFractionDigits: 4 })
    return {
      formatPrice: (value) => (Number.isFinite(Number(value)) ? decimalFormatter.format(Number(value)) : '—'),
      formatSignedPrice: (value) => {
        if (!Number.isFinite(Number(value))) return '—'
        const absolute = signedDecimalFormatter.format(Math.abs(Number(value)))
        return `${Number(value) >= 0 ? '+' : '-'}${absolute}`
      },
      formatPercent: (value) => (Number.isFinite(Number(value)) ? `${Number(value) >= 0 ? '+' : '-'}${Math.abs(Number(value)).toFixed(2)}%` : '—'),
      formatCompact: (value) => (Number.isFinite(Number(value)) ? createNumberFormatter({ style: 'decimal', maximumFractionDigits: 2 }).format(Number(value)) : '—'),
      currencyCode: marketConfig?.currency ?? 'USD',
    }
  }

  const currencyCode = marketConfig?.currency ?? 'USD'
  const currencyFormatter = createNumberFormatter({ currency: currencyCode, maximumFractionDigits: 2 })
  const signedCurrencyFormatter = createNumberFormatter({ currency: currencyCode, maximumFractionDigits: 2 })
  const compactFormatter = new Intl.NumberFormat(DEFAULT_LOCALE, {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  })

  return {
    formatPrice: (value) => (Number.isFinite(Number(value)) ? currencyFormatter.format(Number(value)) : '—'),
    formatSignedPrice: (value) => {
      if (!Number.isFinite(Number(value))) return '—'
      const absolute = signedCurrencyFormatter.format(Math.abs(Number(value)))
      return `${Number(value) >= 0 ? '+' : '-'}${absolute.replace(/^[^\d-]+/, '')}`
    },
    formatPercent: (value) => (Number.isFinite(Number(value)) ? `${Number(value) >= 0 ? '+' : '-'}${Math.abs(Number(value)).toFixed(2)}%` : '—'),
    formatCompact: (value) => (Number.isFinite(Number(value)) ? compactFormatter.format(Number(value)) : '—'),
    currencyCode,
  }
}

export function formatDateTime(timestamp = new Date()) {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}
