import { useState } from 'react'

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

export default function Navbar({ onAddTicker }) {
  const [value, setValue] = useState('')

  const submitTicker = () => {
    const normalized = value.trim().toUpperCase()
    if (!normalized) {
      return
    }

    onAddTicker(normalized)
    setValue('')
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      submitTicker()
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-gray-800/80 bg-gray-950/90 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 shadow-lg shadow-emerald-500/10">
            <ChartIcon />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-emerald-400/80">Dashboard</p>
            <h1 className="text-xl font-bold text-white">FinTech Pulse</h1>
          </div>
        </div>

        <div className="flex flex-1 items-center gap-3 lg:ml-auto lg:max-w-xl">
          <div className="flex flex-1 items-center gap-3 rounded-2xl border border-gray-800 bg-gray-900/90 px-4 py-3 shadow-lg shadow-black/20 focus-within:border-emerald-500/40 focus-within:ring-2 focus-within:ring-emerald-500/10">
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
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-500"
              placeholder="Add ticker, e.g. META"
              aria-label="Ticker symbol"
            />
          </div>
          <button
            type="button"
            onClick={submitTicker}
            className="rounded-2xl border border-emerald-500/20 bg-emerald-500 px-5 py-3 text-sm font-semibold text-gray-950 transition hover:bg-emerald-400"
          >
            Add
          </button>
        </div>
      </div>
    </header>
  )
}
