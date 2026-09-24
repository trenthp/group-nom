'use client'

import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, Polygon, CircleMarker, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import { cellToBoundary } from 'h3-js'
import { RestaurantMarker } from './RestaurantMarker'
import type { BBox, DiscoverViewport } from '@/lib/discover'

/**
 * The map as we have it. Zoomed out: H3 hexes shaded by how many places
 * they hold, tinted ember by how many are loved. Zoomed in: dim dots for
 * unlit places, ember markers for loved ones. Client-only (Leaflet).
 */

export interface DiscoverMapProps {
  center: { lat: number; lng: number }
  zoom?: number
  data: DiscoverViewport | null
  userLocation?: { lat: number; lng: number }
  highlightedId?: string
  onViewportChange: (bbox: BBox, zoom: number) => void
  onPlaceClick: (placeId: string) => void
  /** Optional: fly to a new center when the parent changes it (e.g. manual location) */
  flyTo?: { lat: number; lng: number; key: number }
  className?: string
}

const EMBER = '#EA4D19'

function ViewportReporter({ onViewportChange }: { onViewportChange: DiscoverMapProps['onViewportChange'] }) {
  const map = useMap()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const report = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const b = map.getBounds()
      onViewportChange(
        { minLng: b.getWest(), minLat: b.getSouth(), maxLng: b.getEast(), maxLat: b.getNorth() },
        map.getZoom()
      )
    }, 250)
  }

  useMapEvents({ moveend: report })

  // First report once the map has a size
  useEffect(() => {
    report()
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}

function FlyTo({ target }: { target?: DiscoverMapProps['flyTo'] }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 15))
  }, [target, map])
  return null
}

function HexLayer({ data }: { data: Extract<DiscoverViewport, { mode: 'hexes' }> }) {
  const map = useMap()
  const maxTotal = useMemo(() => Math.max(1, ...data.hexes.map(h => h.total)), [data])

  return (
    <>
      {data.hexes.map((hex) => {
        const boundary = cellToBoundary(hex.h3) as [number, number][]
        const density = Math.log1p(hex.total) / Math.log1p(maxTotal) // 0..1
        const lovedShare = hex.total > 0 ? hex.loved / hex.total : 0
        const lit = hex.loved > 0
        const fillColor = lit ? EMBER : '#ffffff'
        const fillOpacity = lit ? 0.18 + Math.min(0.5, lovedShare * 2 + hex.loved * 0.04) : 0.04 + density * 0.16
        return (
          <Polygon
            key={hex.h3}
            positions={boundary}
            pathOptions={{
              color: lit ? EMBER : 'rgba(255,255,255,0.18)',
              weight: lit ? 1.5 : 0.8,
              fillColor,
              fillOpacity,
            }}
            eventHandlers={{
              click: () => map.flyTo([hex.lat, hex.lng], Math.min(map.getZoom() + 2, 16)),
            }}
          >
            {lit && data.resolution >= 6 && (
              <Tooltip permanent direction="center" className="hex-label" opacity={1}>
                {`❤️ ${hex.loved}`}
              </Tooltip>
            )}
          </Polygon>
        )
      })}
    </>
  )
}

function PointLayer({
  data,
  highlightedId,
  onPlaceClick,
}: {
  data: Extract<DiscoverViewport, { mode: 'points' }>
  highlightedId?: string
  onPlaceClick: (id: string) => void
}) {
  return (
    <>
      {data.places.map((place) =>
        place.nominationCount > 0 ? (
          <RestaurantMarker
            key={place.id}
            place={place}
            isHighlighted={place.id === highlightedId}
            disablePopup
            onClick={() => onPlaceClick(place.id)}
          />
        ) : (
          <CircleMarker
            key={place.id}
            center={[place.lat, place.lng]}
            radius={place.id === highlightedId ? 8 : 5}
            // A wide, near-invisible stroke: SVG hit-tests the stroke too,
            // so a thumb can land on a 5px dot
            pathOptions={{
              color: place.id === highlightedId ? EMBER : '#ffffff',
              weight: 14,
              opacity: place.id === highlightedId ? 0.35 : 0.06,
              fillColor: '#ffffff',
              fillOpacity: place.id === highlightedId ? 0.9 : 0.5,
            }}
            eventHandlers={{ click: () => onPlaceClick(place.id) }}
          />
        )
      )}
    </>
  )
}

export function DiscoverMap({
  center,
  zoom = 15,
  data,
  userLocation,
  highlightedId,
  onViewportChange,
  onPlaceClick,
  flyTo,
  className = '',
}: DiscoverMapProps) {
  return (
    <div className={`h-full w-full ${className}`}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="map-tiles-dark"
        />
        <ViewportReporter onViewportChange={onViewportChange} />
        <FlyTo target={flyTo} />

        {userLocation && (
          <CircleMarker
            center={[userLocation.lat, userLocation.lng]}
            radius={7}
            pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#3b82f6', fillOpacity: 1 }}
            interactive={false}
          />
        )}

        {data?.mode === 'hexes' && <HexLayer data={data} />}
        {data?.mode === 'points' && (
          <PointLayer data={data} highlightedId={highlightedId} onPlaceClick={onPlaceClick} />
        )}
      </MapContainer>
    </div>
  )
}
