'use client'

import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { LatLngBounds } from 'leaflet'
import { RestaurantMarker, type MapPlace } from './RestaurantMarker'

// Fit the map to its markers whenever they change
function MapBoundsHandler({
  places,
  userLocation,
}: {
  places: MapPlace[]
  userLocation?: { lat: number; lng: number }
}) {
  const map = useMap()

  useEffect(() => {
    if (places.length === 0 && !userLocation) return

    const points: [number, number][] = places.map((p) => [p.lat, p.lng])
    if (userLocation) {
      points.push([userLocation.lat, userLocation.lng])
    }

    if (points.length === 1) {
      map.setView(points[0], 15)
    } else if (points.length > 1) {
      const bounds = new LatLngBounds(points)
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [places, userLocation, map])

  return null
}

export interface RestaurantMapProps {
  places: MapPlace[]
  userLocation?: { lat: number; lng: number }
  highlightedId?: string
  onMarkerClick?: (placeId: string) => void
  /** Builds the popup "View page" link per place; omit for no detail link. */
  detailHref?: (place: MapPlace) => string
  height?: string
  showRanks?: boolean
  disablePopup?: boolean
  className?: string
}

export function RestaurantMap({
  places,
  userLocation,
  highlightedId,
  onMarkerClick,
  detailHref,
  height = '400px',
  showRanks = false,
  disablePopup = false,
  className = '',
}: RestaurantMapProps) {
  const center = useMemo((): [number, number] => {
    if (userLocation) {
      return [userLocation.lat, userLocation.lng]
    }
    if (places.length > 0) {
      const avgLat = places.reduce((sum, p) => sum + p.lat, 0) / places.length
      const avgLng = places.reduce((sum, p) => sum + p.lng, 0) / places.length
      return [avgLat, avgLng]
    }
    // Continental US fallback
    return [39.8283, -98.5795]
  }, [places, userLocation])

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', borderRadius: '0.75rem' }}
      >
        {/* OSM tiles, darkened via CSS filter (.map-tiles-dark) to match the
            Dark Ember skin. CARTO's basemaps started requiring an API key
            (Aug 2026) — this is the zero-key fallback; a keyed dark
            basemap (CARTO/Stadia) is the better answer before growth. */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="map-tiles-dark"
        />
        <MapBoundsHandler places={places} userLocation={userLocation} />
        {places.map((place, index) => (
          <RestaurantMarker
            key={place.id}
            place={place}
            isHighlighted={place.id === highlightedId}
            rank={showRanks ? index + 1 : undefined}
            onClick={() => onMarkerClick?.(place.id)}
            disablePopup={disablePopup}
            detailHref={detailHref?.(place)}
          />
        ))}
      </MapContainer>
    </div>
  )
}
