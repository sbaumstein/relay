'use client'

import { useEffect, useRef } from 'react'

interface MapListing {
  id: string
  class_name: string
  studio_name: string
  address: string
  price_cents: number
}

interface MapViewProps {
  listings: MapListing[]
}

// Dummy NYC coordinates per studio — replaced with geocoding when Google Maps API is added
const NYC_STUDIO_COORDS: Record<string, [number, number]> = {
  'SoulCycle':       [40.7614, -73.9776],
  'Barry\'s':        [40.7580, -73.9855],
  'Equinox':         [40.7549, -73.9840],
  'Peloton':         [40.7230, -74.0020],
  'Rumble':          [40.7390, -73.9950],
  'Y7 Studio':       [40.7420, -73.9900],
  'Tone House':      [40.7350, -73.9920],
  'Mile High Run':   [40.7280, -73.9980],
  'Solidcore':       [40.7500, -73.9780],
  'Row House':       [40.7460, -74.0010],
  'modelFIT':        [40.7600, -73.9700],
  'Dogpound':        [40.7660, -73.9640],
  'Forma Pilates':   [40.7680, -73.9610],
  'Body By Simone':  [40.7720, -73.9580],
  'KORE':            [40.7440, -73.9880],
}

function getCoords(studioName: string): [number, number] {
  for (const [name, coords] of Object.entries(NYC_STUDIO_COORDS)) {
    if (studioName.toLowerCase().includes(name.toLowerCase())) return coords
  }
  const seed = studioName.charCodeAt(0) + (studioName.charCodeAt(1) ?? 0)
  return [40.73 + (seed % 10) * 0.008, -74.01 + (seed % 7) * 0.009]
}

type LeafletMap = import('leaflet').Map
type LeafletLayer = import('leaflet').LayerGroup

export function MapView({ listings }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<LeafletMap | null>(null)
  const markerLayerRef = useRef<LeafletLayer | null>(null)
  const leafletReadyRef = useRef(false)

  // Initialize map once
  useEffect(() => {
    if (mapInstanceRef.current) return

    const ensureLeaflet = (cb: () => void) => {
      const win = window as unknown as { L?: typeof import('leaflet') }
      if (win.L) { cb(); return }

      const existing = document.querySelector('script[data-leaflet]')
      if (!existing) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)

        const script = document.createElement('script')
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        script.setAttribute('data-leaflet', '')
        script.onload = () => cb()
        document.head.appendChild(script)
      } else {
        existing.addEventListener('load', () => cb())
      }
    }

    ensureLeaflet(() => {
      if (!mapRef.current || mapInstanceRef.current) return
      const L = (window as unknown as { L: typeof import('leaflet') }).L

      const map = L.map(mapRef.current, {
        center: [40.748, -73.985],
        zoom: 13,
        zoomControl: false,
      })

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_matter/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CARTO',
        maxZoom: 19,
      }).addTo(map)

      L.control.zoom({ position: 'bottomright' }).addTo(map)

      const layer = L.layerGroup().addTo(map)
      mapInstanceRef.current = map
      markerLayerRef.current = layer
      leafletReadyRef.current = true

      // Draw markers with whatever listings are available now
      drawMarkers(L, layer, listings)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-draw markers whenever listings change
  useEffect(() => {
    const win = window as unknown as { L?: typeof import('leaflet') }
    if (!win.L || !markerLayerRef.current) return
    const L = win.L
    drawMarkers(L, markerLayerRef.current, listings)
  }, [listings])

  return (
    <div className="relative h-full">
      <div ref={mapRef} className="w-full h-full" />
      <div className="absolute top-3 left-3 z-[1000] text-xs text-white/50 bg-black/70 px-2 py-1 backdrop-blur-sm pointer-events-none">
        {listings.length} spot{listings.length !== 1 ? 's' : ''}
      </div>
      <style>{`
        .relay-popup .leaflet-popup-content-wrapper {
          background: #1a1a1a;
          color: white;
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 2px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.6);
          padding: 8px 12px;
        }
        .relay-popup .leaflet-popup-content { margin: 0; }
        .relay-popup .leaflet-popup-tip { background: #1a1a1a; }
      `}</style>
    </div>
  )
}

function drawMarkers(
  L: typeof import('leaflet'),
  layer: import('leaflet').LayerGroup,
  listings: MapListing[],
) {
  layer.clearLayers()

  const icon = L.divIcon({
    className: '',
    html: `<div style="width:10px;height:10px;background:white;border-radius:50%;border:2px solid rgba(255,255,255,0.4);box-shadow:0 0 8px rgba(255,255,255,0.5)"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  })

  listings.forEach((listing) => {
    const coords = getCoords(listing.studio_name)
    const price = listing.price_cents > 0 ? `$${(listing.price_cents / 100).toFixed(0)}` : 'Free'
    L.marker(coords, { icon })
      .addTo(layer)
      .bindPopup(
        `<div style="font-family:sans-serif;min-width:140px">
          <div style="color:#888;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">${listing.studio_name}</div>
          <div style="color:white;font-weight:600;font-size:12px;margin-bottom:2px">${listing.class_name}</div>
          <div style="color:#bbb;font-size:11px">${price}</div>
        </div>`,
        { closeButton: false, className: 'relay-popup' },
      )
  })
}
