'use client'

import { useMemo } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { LatLngBounds } from 'leaflet'
import { Restaurant } from '@/lib/types'
import { RestaurantMarker } from './RestaurantMarker'

// Component to handle map bounds fitting
function MapBoundsHandler({
  restaurants,
  userLocation,
}: {
  restaurants: Restaurant[]
  userLocation?: { lat: number; lng: number }
}) {
  const map = useMap()

  useMemo(() => {
    if (restaurants.length === 0 && !userLocation) return

    const points: [number, number][] = restaurants.map((r) => [r.lat, r.lng])
    if (userLocation) {
      points.push([userLocation.lat, userLocation.lng])
    }

    if (points.length === 1) {
      map.setView(points[0], 15)
    } else if (points.length > 1) {
      const bounds = new LatLngBounds(points)
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [restaurants, userLocation, map])

  return null
}

export interface RestaurantMapProps {
  restaurants: Restaurant[]
  userLocation?: { lat: number; lng: number }
  highlightedId?: string
  onMarkerClick?: (restaurantId: string) => void
  height?: string
  showRanks?: boolean
  markAllAsSaved?: boolean
  disablePopup?: boolean
  className?: string
}

export function RestaurantMap({
  restaurants,
  userLocation,
  highlightedId,
  onMarkerClick,
  height = '400px',
  showRanks = false,
  markAllAsSaved = false,
  disablePopup = false,
  className = '',
}: RestaurantMapProps) {
  // Calculate initial center
  const center = useMemo((): [number, number] => {
    if (userLocation) {
      return [userLocation.lat, userLocation.lng]
    }
    if (restaurants.length > 0) {
      const avgLat =
        restaurants.reduce((sum, r) => sum + r.lat, 0) / restaurants.length
      const avgLng =
        restaurants.reduce((sum, r) => sum + r.lng, 0) / restaurants.length
      return [avgLat, avgLng]
    }
    // Default to US center if no data
    return [39.8283, -98.5795]
  }, [restaurants, userLocation])

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', borderRadius: '1rem' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBoundsHandler
          restaurants={restaurants}
          userLocation={userLocation}
        />
        {restaurants.map((restaurant, index) => (
          <RestaurantMarker
            key={restaurant.id}
            restaurant={restaurant}
            isHighlighted={restaurant.id === highlightedId}
            isSaved={markAllAsSaved}
            rank={showRanks ? index + 1 : undefined}
            onClick={() => onMarkerClick?.(restaurant.id)}
            disablePopup={disablePopup}
          />
        ))}
      </MapContainer>
    </div>
  )
}
