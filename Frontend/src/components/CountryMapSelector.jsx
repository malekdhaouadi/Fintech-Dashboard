import { useEffect, useRef, useState } from 'react'
import * as maptilersdk from '@maptiler/sdk'
import '@maptiler/sdk/dist/maptiler-sdk.css'
import { MARKET_OPTIONS } from '../data/markets.js'

maptilersdk.config.apiKey = import.meta.env.VITE_MAPTILER_API_KEY;

function EmbeddedMap({ marketId }) {
  const mapContainer = useRef(null)
  const map = useRef(null)

  useEffect(() => {
    if (map.current) return
    
    map.current = new maptilersdk.Map({
      container: mapContainer.current,
      style: maptilersdk.MapStyle.DATAVIZ.DARK,
      center: [0, 20],
      zoom: 1,
      navigationControl: false,
      geolocateControl: false,
    })
  }, [])

  useEffect(() => {
    if (!map.current) return
    const centers = {
      global: { center: [0, 20], zoom: 1 },
      us: { center: [-95, 38], zoom: 3 },
      tunisia: { center: [9.5, 33.8], zoom: 5 },
      france: { center: [2.2, 46.2], zoom: 4 },
      germany: { center: [10.4, 51.1], zoom: 4 },
      uk: { center: [-3.4, 55.3], zoom: 4 },
      crypto: { center: [0, 20], zoom: 1 },
      forex: { center: [0, 20], zoom: 1 },
      commodities: { center: [0, 20], zoom: 1 },
    }
    
    const config = centers[marketId] || centers.global
    map.current.flyTo(config)
  }, [marketId])

  return (
    <div className="h-full w-full relative">
      <div ref={mapContainer} className="absolute inset-0" />
    </div>
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
