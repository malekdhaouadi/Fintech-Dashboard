import { useEffect, useRef, useState } from 'react'
import { searchTickers } from '../services/api.js'

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <path
        d="M4 19.5h16M6.5 15.5l3.2-4.1 3.1 2.6 4.7-6.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9.7" cy="11.4" r="1.2" fill="currentColor" />
      <circle cx="12.8" cy="14" r="1.2" fill="currentColor" />
      <circle cx="17.5" cy="7.5" r="1.2" fill="currentColor" />
    </svg>
  )
}

export default function Navbar({ onAddTicker, isLive }) {
  const [value, setValue] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeoutRef = useRef(null)
  const containerRef = useRef(null)

  const fetchSuggestions = async (query) => {
    if (!query.trim()) {
      setSuggestions([])
      return
    }

    setIsSearching(true)
    try {
      const results = await searchTickers(query)
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

    if (query.length > 0) {
      searchTimeoutRef.current = window.setTimeout(() => {
        fetchSuggestions(query)
      }, 300)
    } else {
      setSuggestions([])
      setIsOpen(false)
    }
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

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleSubmit()
    }
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen])

  return (
    <header className="sticky top-0 z-30 border-b border-gray-800/80 bg-gray-950/90 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 shadow-lg shadow-emerald-500/10">
            <ChartIcon />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <p className="text-xs uppercase tracking-[0.4em] text-emerald-400/80">Dashboard</p>
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
            <h1 className="text-xl font-bold text-white">FinTech Pulse</h1>
          </div>
        </div>

        <div className="flex flex-1 items-center gap-3 lg:ml-auto lg:max-w-xl" ref={containerRef}>
          <div className="relative flex-1">
            <div className="flex items-center gap-3 rounded-2xl border border-gray-800 bg-gray-900/90 px-4 py-3 shadow-lg shadow-black/20 focus-within:border-emerald-500/40 focus-within:ring-2 focus-within:ring-emerald-500/10">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 shrink-0 text-gray-500"
                fill="none"
                aria-hidden="true"
              >
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
                onKeyDown={handleKeyDown}
                onFocus={() => value.length > 0 && setIsOpen(true)}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-500"
                placeholder="Search stocks (e.g. AAPL, Meta...)"
                aria-label="Search ticker symbol"
              />
              {isSearching && (
                <span className="text-xs text-gray-500">
                  <svg
                    className="inline h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" strokeWidth="2" opacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
              )}
            </div>

            {isOpen && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-2 rounded-2xl border border-gray-800 bg-gray-900/95 shadow-2xl shadow-black/50 backdrop-blur-sm">
                {suggestions.map((item) => (
                  <button
                    key={`${item.ticker}-${item.exchange}`}
                    type="button"
                    onClick={() => selectSuggestion(item)}
                    className="flex w-full items-start gap-3 border-b border-gray-800/50 px-4 py-3 text-left transition hover:bg-gray-800/50 last:border-b-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">{item.ticker}</p>
                      <p className="truncate text-xs text-gray-400">{item.name}</p>
                      <p className="text-[10px] uppercase tracking-[0.1em] text-gray-500">{item.exchange}</p>
                    </div>
                    <svg
                      className="h-5 w-5 shrink-0 text-gray-600"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path d="m12 5 7 7m0 0-7 7m7-7H5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                ))}
              </div>
            )}
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
