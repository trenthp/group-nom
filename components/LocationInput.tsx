'use client'

import { useState } from 'react'
import { LocationIcon, MapIcon } from '@/components/icons'

interface LocationInputProps {
  onLocationChange: (location: { lat: number; lng: number } | null, address?: string) => void
}

export default function LocationInput({ onLocationChange }: LocationInputProps) {
  const [useCurrentLocation, setUseCurrentLocation] = useState(true)
  const [locationInput, setLocationInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUseCurrentLocation = async () => {
    setLoading(true)
    setError(null)

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject)
      })

      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      }

      onLocationChange(location, 'Your current location')
      setLoading(false)
    } catch (err) {
      console.error('Error getting location:', err)
      setError('Unable to get your location. Please enter an address or zipcode.')
      setLoading(false)
      onLocationChange(null)
    }
  }

  const handleGeocodeAddress = async () => {
    if (!locationInput.trim()) {
      setError('Please enter a zipcode or address')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: locationInput }),
      })

      const data = await response.json()

      if (!response.ok || !data.location) {
        throw new Error(data.error || 'Location not found')
      }

      onLocationChange(data.location, data.formattedAddress)
      setLoading(false)
    } catch (err: any) {
      console.error('Error geocoding:', err)

      // Check if it's a 503 (API not enabled)
      if (err.message?.includes('Geocoding API not enabled')) {
        setError('Address lookup is temporarily unavailable. Please use "Current Location" instead.')
      } else {
        setError('Unable to find that location. Please try a different address or use "Current Location".')
      }

      setLoading(false)
      onLocationChange(null)
    }
  }

  return (
    <div className="bg-white bg-opacity-10 backdrop-blur rounded-xl p-4 mb-4">
      <h3 className="text-white font-semibold mb-3">Search Location</h3>

      {/* Toggle */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => {
            setUseCurrentLocation(true)
            setError(null)
            handleUseCurrentLocation()
          }}
          className={`flex-1 py-2 px-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
            useCurrentLocation
              ? 'bg-white text-orange-600'
              : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
          }`}
        >
          <LocationIcon size={16} />
          Current Location
        </button>
        <button
          onClick={() => {
            setUseCurrentLocation(false)
            setError(null)
          }}
          className={`flex-1 py-2 px-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
            !useCurrentLocation
              ? 'bg-white text-orange-600'
              : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
          }`}
        >
          <MapIcon size={16} />
          Enter Location
        </button>
      </div>

      {/* Address Input */}
      {!useCurrentLocation && (
        <div className="space-y-2">
          <input
            type="text"
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGeocodeAddress()}
            placeholder="Enter zipcode or address..."
            className="w-full px-4 py-2 rounded-lg bg-white bg-opacity-20 text-white placeholder-white placeholder-opacity-60 border border-white border-opacity-30 focus:outline-none focus:border-opacity-60"
          />
          <button
            onClick={handleGeocodeAddress}
            disabled={loading}
            className="w-full bg-white text-orange-600 font-semibold py-2 rounded-lg hover:bg-orange-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Searching...' : 'Find Restaurants'}
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-2 text-red-200 text-sm bg-red-500 bg-opacity-30 px-3 py-2 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && useCurrentLocation && (
        <div className="text-white text-sm text-center py-2">
          Getting your location...
        </div>
      )}
    </div>
  )
}
