import { useEffect, useMemo, useRef, useState } from 'react'
import { wsBaseURL } from '../services/api.js'

const RECONNECT_DELAY_MS = 3000
const FLASH_RESET_DELAY_MS = 900

export function useLivePrices(tickers = []) {
  const [prices, setPrices] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isLive, setIsLive] = useState(false)
  const [priceFlash, setPriceFlash] = useState({})

  const wsRef = useRef(null)
  const reconnectRef = useRef(null)

  const normalizedTickers = useMemo(
    () =>
      Array.from(
        new Set(
          tickers
            .map((ticker) => String(ticker ?? '').trim().toUpperCase())
            .filter(Boolean),
        ),
      ),
    [tickers],
  )
  const tickerSet = useMemo(() => new Set(normalizedTickers), [normalizedTickers])
  const tickerKey = normalizedTickers.join('|')

  useEffect(() => {
    if (normalizedTickers.length === 0) {
      setPrices({})
      setLoading(false)
      setError(null)
      setIsLive(false)
      return undefined
    }

    let active = true

    const clearReconnectTimer = () => {
      if (reconnectRef.current) {
        window.clearTimeout(reconnectRef.current)
        reconnectRef.current = null
      }
    }

    const connect = () => {
      clearReconnectTimer()
      try {
        const url = `${wsBaseURL}/api/ws/prices`
        console.log('[WebSocket] Connecting to:', url)
        const socket = new WebSocket(url)
        wsRef.current = socket

        socket.onopen = () => {
        if (!active) {
          return
        }

        setIsLive(true)
        setError(null)
      }

      socket.onmessage = (event) => {
        if (!active) {
          return
        }

        try {
          const payload = JSON.parse(event.data)

          setPrices((currentPrices) => {
            const merged = { ...currentPrices }
            const flash = {}

            Object.entries(payload).forEach(([ticker, nextValue]) => {
              if (!tickerSet.has(ticker)) {
                return
              }

              const previous = currentPrices[ticker]
              const previousPrice = Number(previous?.price)
              const nextPrice = Number(nextValue?.price)

              if (Number.isFinite(previousPrice) && Number.isFinite(nextPrice) && nextPrice !== previousPrice) {
                flash[ticker] = nextPrice > previousPrice ? 'up' : 'down'
              }

              merged[ticker] = {
                ...nextValue,
                ticker,
              }
            })

            if (Object.keys(flash).length > 0) {
              setPriceFlash((existing) => ({ ...existing, ...flash }))
              window.setTimeout(() => {
                setPriceFlash((existing) => {
                  const nextFlash = { ...existing }
                  Object.keys(flash).forEach((ticker) => {
                    delete nextFlash[ticker]
                  })
                  return nextFlash
                })
              }, FLASH_RESET_DELAY_MS)
            }

            return merged
          })

          setLoading(false)
          setError(null)
        } catch {
          setError('Live stream data could not be parsed.')
        }
      }

      socket.onclose = () => {
        if (!active) {
          return
        }

        setIsLive(false)
        setError('Live prices are temporarily unavailable. Retrying automatically.')
        reconnectRef.current = window.setTimeout(connect, RECONNECT_DELAY_MS)
      }

      socket.onerror = (err) => {
        if (!active) {
          return
        }

        console.error('[WebSocket] Connection error:', err)
        setIsLive(false)
        setError('Live prices are temporarily unavailable. Retrying automatically.')
      }
      } catch (err) {
        console.error('[WebSocket] Failed to create WebSocket:', err)
        setError('Unable to establish live connection.')
        reconnectRef.current = window.setTimeout(connect, RECONNECT_DELAY_MS)
      }
    }

    connect()

    return () => {
      active = false
      clearReconnectTimer()

      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [tickerKey, wsBaseURL])

  return { prices, loading, error, isLive, priceFlash }
}
