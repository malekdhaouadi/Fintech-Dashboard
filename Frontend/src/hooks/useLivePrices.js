import { useEffect, useState } from 'react'
import { getPrice } from '../services/api.js'

const REFRESH_INTERVAL_MS = 30000

export function useLivePrices(tickers = []) {
  const [prices, setPrices] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const normalizedTickers = Array.from(
    new Set(
      tickers
        .map((ticker) => String(ticker ?? '').trim().toUpperCase())
        .filter(Boolean),
    ),
  )
  const tickerKey = normalizedTickers.join('|')

  useEffect(() => {
    if (normalizedTickers.length === 0) {
      setPrices({})
      setLoading(false)
      setError(null)
      return undefined
    }

    let active = true

    const refresh = async () => {
      setLoading(true)

      const settled = await Promise.allSettled(
        normalizedTickers.map(async (ticker) => {
          const price = await getPrice(ticker)
          return [ticker, price]
        }),
      )

      if (!active) {
        return
      }

      const nextPrices = {}
      const failedTickers = []

      settled.forEach((result, index) => {
        const ticker = normalizedTickers[index]
        if (result.status === 'fulfilled') {
          const [resolvedTicker, price] = result.value
          nextPrices[resolvedTicker] = price
          return
        }

        failedTickers.push(ticker)
      })

      setPrices((currentPrices) => {
        const mergedPrices = { ...currentPrices }

        normalizedTickers.forEach((ticker) => {
          if (Object.prototype.hasOwnProperty.call(nextPrices, ticker)) {
            mergedPrices[ticker] = nextPrices[ticker]
          }
        })

        return mergedPrices
      })

      setError(
        failedTickers.length === normalizedTickers.length
          ? 'Live prices are temporarily unavailable. Retrying automatically.'
          : null,
      )
      setLoading(false)
    }

    refresh()
    const intervalId = window.setInterval(refresh, REFRESH_INTERVAL_MS)

    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [tickerKey])

  return { prices, loading, error }
}
