import { useState } from 'react'
import { MARKET_OPTIONS } from '../data/markets.js'

/* ---------- lightweight SVG map ---------- */
/* Simplified outlines (Natural‑Earth‑style) – enough to recognise continents + key regions. */
const REGION_PATHS = {
  northAmerica:
    'M55 65 L67 58 76 60 90 55 110 52 125 55 135 65 140 78 145 90 142 100 135 110 125 115 110 112 100 105 92 98 80 100 68 95 58 85 52 75Z',
  southAmerica:
    'M110 135 L118 128 125 132 130 145 132 160 128 175 122 185 115 190 108 185 105 172 102 158 105 145Z',
  europe:
    'M205 52 L218 48 228 50 235 55 232 62 225 68 218 72 210 70 205 65 202 58Z',
  africa:
    'M195 85 L210 80 225 82 235 90 238 105 235 120 228 135 218 142 205 140 195 132 190 118 188 105 190 92Z',
  middleEast:
    'M242 72 L255 68 265 72 268 82 262 90 252 92 245 88 240 80Z',
  asia:
    'M248 42 L268 35 295 38 320 42 340 50 350 62 345 75 335 85 318 88 298 82 278 75 262 68 252 58Z',
  oceania:
    'M325 130 L340 125 355 128 360 138 352 148 340 150 330 145 325 138Z',
  tunisia: 'M212 72 L215 70 218 72 216 76 213 75Z',
  uk: 'M200 48 L204 46 207 48 206 52 202 51Z',
  japan: 'M348 55 L352 52 355 55 353 60 349 58Z',
}

/* Which regions to highlight for each market id */
const MARKET_HIGHLIGHTS = {
  global: Object.keys(REGION_PATHS),
  us: ['northAmerica'],
  tunisia: ['tunisia', 'africa'],
  france: ['europe'],
  germany: ['europe'],
  uk: ['uk', 'europe'],
  crypto: Object.keys(REGION_PATHS),
  forex: Object.keys(REGION_PATHS),
  commodities: Object.keys(REGION_PATHS),
}

/* Pin positions (approximate SVG coordinates) per market */
const MARKET_PINS = {
  global: null,
  us: { x: 95, y: 78 },
  tunisia: { x: 214, y: 73 },
  france: { x: 212, y: 60 },
  germany: { x: 218, y: 56 },
  uk: { x: 203, y: 49 },
  crypto: null,
  forex: null,
  commodities: null,
}

function EmbeddedMap({ marketId }) {
  const highlights = MARKET_HIGHLIGHTS[marketId] ?? []
  const pin = MARKET_PINS[marketId]

  return (
    <svg
      viewBox="0 0 400 200"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      style={{ filter: 'drop-shadow(0 0 18px rgba(16, 185, 129, 0.08))' }}
    >
      {/* Ocean gradient */}
      <defs>
        <radialGradient id="ocean" cx="50%" cy="45%" r="65%">
          <stop offset="0%" stopColor="#0f1a2e" />
          <stop offset="100%" stopColor="#050d1a" />
        </radialGradient>
        <radialGradient id="pin-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </radialGradient>
        {/* Grid pattern */}
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(148,163,184,0.04)" strokeWidth="0.5" />
        </pattern>
      </defs>

      <rect width="400" height="200" fill="url(#ocean)" />
      <rect width="400" height="200" fill="url(#grid)" />

      {/* Latitude lines */}
      {[50, 100, 150].map((y) => (
        <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="rgba(148,163,184,0.06)" strokeWidth="0.5" strokeDasharray="4 6" />
      ))}
      {/* Longitude lines */}
      {[100, 200, 300].map((x) => (
        <line key={x} x1={x} y1="0" x2={x} y2="200" stroke="rgba(148,163,184,0.06)" strokeWidth="0.5" strokeDasharray="4 6" />
      ))}

      {/* Region outlines */}
      {Object.entries(REGION_PATHS).map(([regionId, d]) => {
        const isHighlighted = highlights.includes(regionId)
        return (
          <path
            key={regionId}
            d={d}
            fill={isHighlighted ? 'rgba(16, 185, 129, 0.18)' : 'rgba(148, 163, 184, 0.07)'}
            stroke={isHighlighted ? 'rgba(16, 185, 129, 0.55)' : 'rgba(148, 163, 184, 0.12)'}
            strokeWidth={isHighlighted ? 1 : 0.5}
            style={{
              transition: 'fill 0.5s ease, stroke 0.5s ease',
            }}
          />
        )
      })}

      {/* Pin marker */}
      {pin && (
        <g>
          <circle cx={pin.x} cy={pin.y} r="14" fill="url(#pin-glow)">
            <animate attributeName="r" values="12;18;12" dur="2.5s" repeatCount="indefinite" />
          </circle>
          <circle cx={pin.x} cy={pin.y} r="4" fill="#10b981" stroke="#064e3b" strokeWidth="1.5">
            <animate attributeName="r" values="3.5;5;3.5" dur="2.5s" repeatCount="indefinite" />
          </circle>
        </g>
      )}
    </svg>
  )
}

export default function CountryMapSelector({ selectedMarket, onSelectMarket }) {
  const [isOpen, setIsOpen] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)

  const activeMarket = MARKET_OPTIONS.find((market) => market.id === selectedMarket) ?? MARKET_OPTIONS[0]

  if (!isOpen) {
    return (
      <div className="rounded-2xl border border-gray-800 bg-gray-900/95 p-2 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-300">Map selector</span>
            <strong className="text-sm text-white">{activeMarket.label}</strong>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="rounded bg-emerald-600/10 px-3 py-1 text-xs text-emerald-300"
            >
              Open
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {isExpanded && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
          <div className="w-full max-w-5xl rounded-3xl border border-gray-800 bg-gray-900/98 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-gray-500">Map selector</p>
                <h3 className="mt-1 text-lg font-semibold text-white">{activeMarket.label}</h3>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="rounded-md bg-gray-800 px-3 py-1 text-sm text-gray-300"
                >
                  Minimize
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-md bg-red-700/10 px-3 py-1 text-sm text-red-300"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="h-[80vh] bg-gray-950 relative">
              <EmbeddedMap marketId={selectedMarket ?? 'global'} />
            </div>
          </div>
        </div>
      )}

      <section className={`overflow-hidden rounded-3xl border border-gray-800 bg-gray-900/95 shadow-2xl shadow-black/30 ${isExpanded ? 'hidden' : ''}`}>
        <div className="border-b border-gray-800 px-4 py-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-gray-500">Map selector</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Pick a country or market</h3>
              <p className="mt-1 text-sm text-gray-400">Choose the region you want to track on the watchlist.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
                {activeMarket.flag} {activeMarket.label}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsExpanded(true)}
                  className="rounded-md bg-gray-800 px-3 py-1 text-sm text-gray-300"
                >
                  Enlarge
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-md bg-red-700/10 px-3 py-1 text-sm text-red-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="relative h-40 overflow-hidden bg-gray-950">
          <EmbeddedMap marketId={selectedMarket ?? 'global'} />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/20 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2">
            {MARKET_OPTIONS.map((market) => (
              <button
                key={market.id}
                type="button"
                onClick={() => onSelectMarket(market.id)}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] backdrop-blur transition hover:-translate-y-0.5 ${
                  selectedMarket === market.id
                    ? 'border-emerald-400/30 bg-emerald-500 text-gray-950'
                    : 'border-gray-700 bg-gray-950/75 text-gray-300 hover:border-gray-600 hover:bg-gray-900'
                }`}
              >
                {market.flag} {market.id === 'global' ? 'Global' : market.label}
              </button>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
