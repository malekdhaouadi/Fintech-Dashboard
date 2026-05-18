import { useEffect, useMemo, useRef, useState } from 'react'
import { MARKET_OPTIONS } from '../data/markets.js'
import { searchTickers } from '../services/api.js'

function MarketIcon({ icon }) {
  const common = 'h-4 w-4 shrink-0 text-emerald-300'
  switch (icon) {
    case 'globe':
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M3.8 12h16.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M12 3.5c2.5 2.3 4 5.3 4 8.5s-1.5 6.2-4 8.5c-2.5-2.3-4-5.3-4-8.5s1.5-6.2 4-8.5Z" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      )
    case 'star':
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
          <path d="M12 3.8 14.8 9l5.7.8-4.2 4 1 5.6L12 16.8 6.7 19.4l1-5.6-4.2-4 5.7-.8L12 3.8Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        </svg>
      )
    case 'location':
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
          <path d="M12 21s6-5.2 6-10.2A6 6 0 0 0 6 10.8C6 15.8 12 21 12 21Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <circle cx="12" cy="10.6" r="2.1" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      )
    case 'layers':
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
          <path d="m12 4 8 4-8 4-8-4 8-4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="m4 12 8 4 8-4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="m4 16 8 4 8-4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      )
    case 'shield':
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
          <path d="M12 3.5 19 6v5.2c0 4.8-3.2 7.9-7 9.3-3.8-1.4-7-4.5-7-9.3V6l7-2.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      )
    case 'arch':
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
          <path d="M6 19V10a6 6 0 0 1 12 0v9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M6 19h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
    case 'rocket':
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
          <path d="M14.8 3.8c2.5.2 4.2 1.8 5.4 4.3-1.7 1.3-3.6 2.1-5.5 2.4l-1.8-1.8c.3-1.9 1.1-3.8 1.9-4.9Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M10.5 9.8 6 14.3l3.7 3.7 4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="m7.2 16.1-2.4 2.4 1.7.6.6 1.7 2.4-2.4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      )
    case 'coin':
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
          <ellipse cx="12" cy="12" rx="7.5" ry="8" stroke="currentColor" strokeWidth="1.8" />
          <path d="M9.6 10.2c0-1.2 1.1-2.2 2.4-2.2s2.4 1 2.4 2.2S13.3 12 12 12s-2.4.9-2.4 2.1 1.1 2.2 2.4 2.2 2.4-1 2.4-2.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
    case 'swap':
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
          <path d="M7 7h12M15 4l4 3-4 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M17 17H5m4 3-4-3 4-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'industry':
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
          <path d="M4 19V9l5 3V9l5 3V7l6 3v9H4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      )
    default:
      return null
  }
}

export default function Navbar({ onAddTicker, isLive, currentMarket, onMarketSelect }) {
  const [value, setValue] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [marketMenuOpen, setMarketMenuOpen] = useState(false)
  const searchTimeoutRef = useRef(null)
  const containerRef = useRef(null)
  const marketRef = useRef(null)

  const selectedMarketObj = useMemo(
    () => MARKET_OPTIONS.find((market) => market.id === currentMarket) ?? MARKET_OPTIONS[0],
    [currentMarket],
  )
  const searchPlaceholder = selectedMarketObj.searchPlaceholder ?? 'Search stocks, ETFs, crypto, forex...'
  const searchCopy = selectedMarketObj.searchCopy ?? 'Search stocks, ETFs, crypto, forex...'
  const headerTitle = selectedMarketObj.shortLabel ?? `${selectedMarketObj.label} Market Pulse`

  const fetchSuggestions = async (query) => {
    const trimmed = query.trim()
    if (!trimmed) {
      setSuggestions([])
      return
    }

    setIsSearching(true)
    try {
      const results = await searchTickers(trimmed)
      setSuggestions(results.slice(0, 8))
      setIsOpen(true)
    } catch {
      setSuggestions([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleInputChange = (event) => {
    const query = event.target.value
    setValue(query)

    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current)
    }

    if (query.trim().length > 0) {
      searchTimeoutRef.current = window.setTimeout(() => {
        fetchSuggestions(query)
      }, 300)
      return
    }

    setSuggestions([])
    setIsOpen(false)
  }

  const selectSuggestion = (item) => {
    onAddTicker(item.ticker)
    setValue('')
    setSuggestions([])
    setIsOpen(false)
  }

  const handleSubmit = () => {
    if (value.trim()) {
      onAddTicker(value.trim().toUpperCase())
      setValue('')
      setSuggestions([])
      setIsOpen(false)
    }
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
      if (marketRef.current && !marketRef.current.contains(event.target)) {
        setMarketMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <header className="sticky top-0 z-30 border-b border-gray-800/80 bg-gray-950/90 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4 px-4 py-4 xl:flex-row xl:items-center">
        <div className="flex items-center justify-between gap-4 xl:shrink-0">
          <div className="flex items-center gap-3">
            <img
              src="/logofinpulse.png"
              alt="FinPulse logo"
              className="h-12 w-12 rounded-2xl border border-gray-800 bg-gray-900 object-cover shadow-lg shadow-black/20"
            />
            <div>
              <div className="flex items-center gap-3">
                <p className="text-xs uppercase tracking-[0.4em] text-emerald-400/80">FinPulse</p>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                    isLive
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-gray-700 bg-gray-900 text-gray-400'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isLive ? 'bg-emerald-400 shadow-[0_0_10px_rgba(34,197,94,0.8)]' : 'bg-gray-500'
                    }`}
                  />
                  {isLive ? 'LIVE' : 'OFFLINE'}
                </span>
              </div>
              <h1 className="text-xl font-bold text-white">{headerTitle}</h1>
              <p className="mt-1 max-w-xl text-xs text-gray-500">{searchCopy}</p>
            </div>
          </div>

          <div className="relative xl:ml-2" ref={marketRef}>
            <button
              type="button"
              onClick={() => setMarketMenuOpen((current) => !current)}
              className="flex items-center gap-2 rounded-2xl border border-gray-800 bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
            >
              <MarketIcon icon={selectedMarketObj.icon} />
              <span>{selectedMarketObj.label}</span>
              <svg className="ml-2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {marketMenuOpen ? (
              <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 py-1 shadow-2xl shadow-black/40">
                {MARKET_OPTIONS.map((market) => (
                  <button
                    key={market.id}
                    type="button"
                    onClick={() => {
                      onMarketSelect(market.id)
                      setMarketMenuOpen(false)
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-gray-800 ${
                      currentMarket === market.id ? 'bg-gray-800 text-white' : 'text-gray-300'
                    }`}
                  >
                      <MarketIcon icon={market.icon} />
                    <span>{market.label}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-1 items-center gap-3 xl:ml-auto xl:max-w-3xl" ref={containerRef}>
          <div className="relative flex-1">
            <div className="flex items-center gap-3 rounded-2xl border border-gray-800 bg-gray-900/90 px-4 py-3 shadow-lg shadow-black/20 focus-within:border-emerald-500/40 focus-within:ring-2 focus-within:ring-emerald-500/10">
              <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-gray-500" fill="none" aria-hidden="true">
                <path
                  d="m21 21-4.35-4.35M10.75 18.5a7.75 7.75 0 1 1 0-15.5 7.75 7.75 0 0 1 0 15.5Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              <input
                value={value}
                onChange={handleInputChange}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    handleSubmit()
                  }
                }}
                onFocus={() => value.length > 0 && setIsOpen(true)}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-500"
                placeholder={searchPlaceholder}
                aria-label="Search ticker symbol"
              />
              {isSearching ? (
                <span className="text-xs text-gray-500">
                  <svg className="inline h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" strokeWidth="2" opacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
              ) : null}
            </div>

            {isOpen && suggestions.length > 0 ? (
              <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-2xl border border-gray-800 bg-gray-900/95 shadow-2xl shadow-black/50 backdrop-blur-sm">
                {suggestions.map((item) => (
                  <button
                    key={`${item.ticker}-${item.exchange}`}
                    type="button"
                    onClick={() => selectSuggestion(item)}
                    className="flex w-full items-start gap-3 border-b border-gray-800/50 px-4 py-3 text-left transition hover:bg-gray-800/50 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white">{item.ticker}</p>
                      <p className="truncate text-xs text-gray-400">{item.name}</p>
                      <p className="text-[10px] uppercase tracking-[0.1em] text-gray-500">{item.exchange}</p>
                    </div>
                    <svg className="h-5 w-5 shrink-0 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                      <path d="m12 5 7 7m0 0-7 7m7-7H5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-2xl border border-emerald-500/20 bg-emerald-500 px-5 py-3 text-sm font-semibold text-gray-950 transition hover:bg-emerald-400"
          >
            Add
          </button>
        </div>
      </div>
    </header>
  )
}
