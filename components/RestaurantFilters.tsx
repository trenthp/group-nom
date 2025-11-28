'use client'

import { useState } from 'react'

interface RestaurantFiltersProps {
  filters: {
    minRating: number
    openNow: boolean
    maxReviews: number
    distance: number
  }
  onFiltersChange: (filters: {
    minRating: number
    openNow: boolean
    maxReviews: number
    distance: number
  }) => void
  locationName?: string
  onCustomLocationSubmit: (query: string) => Promise<void>
  onUseCurrentLocation: () => void
  locationLoading?: boolean
  locationError?: string
}

export default function RestaurantFilters({
  filters,
  onFiltersChange,
  locationName,
  onCustomLocationSubmit,
  onUseCurrentLocation,
  locationLoading,
  locationError,
}: RestaurantFiltersProps) {
  const [isEditingLocation, setIsEditingLocation] = useState(false)
  const [locationInput, setLocationInput] = useState('')

  const getPopularityLabel = (value: number) => {
    if (value === 100) return 'Hidden Gems (<100 reviews)'
    if (value === 300) return 'Lesser-known (<300 reviews)'
    if (value === 500) return 'Moderate (<500 reviews)'
    if (value === 1000) return 'Popular (1000+ reviews)'
    if (value === 5000) return 'Very Popular (5000+ reviews)'
    return 'All Popularity Levels'
  }

  const getDistanceLabel = (km: number) => {
    const miles = (km * 0.621371).toFixed(1)
    return `${km} km (${miles} mi)`
  }

  const handleLocationSubmit = async () => {
    if (locationInput.trim()) {
      await onCustomLocationSubmit(locationInput.trim())
      setLocationInput('')
      setIsEditingLocation(false)
    }
  }

  const handleUseCurrentLocation = () => {
    onUseCurrentLocation()
    setLocationInput('')
    setIsEditingLocation(false)
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-6">
      <h3 className="text-2xl font-bold text-gray-800 mb-6">Restaurant Filters</h3>

      <div className="space-y-6">
        {/* Location */}
        <div>
          {!isEditingLocation ? (
            <div className="flex justify-between items-center">
              <label className="text-gray-700 font-semibold">Location</label>
              <button
                onClick={() => setIsEditingLocation(true)}
                className="text-orange-600 font-bold hover:text-orange-700 transition"
              >
                📍 {locationLoading ? 'Finding...' : (locationName || 'Current Location')}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-gray-700 font-semibold">Location</label>
                <button
                  onClick={() => setIsEditingLocation(false)}
                  className="text-gray-400 hover:text-gray-600 text-sm"
                >
                  Cancel
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLocationSubmit()}
                  placeholder="Enter zip code or city..."
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-800"
                  disabled={locationLoading}
                  autoFocus
                />
                <button
                  onClick={handleLocationSubmit}
                  disabled={locationLoading || !locationInput.trim()}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {locationLoading ? '...' : 'Go'}
                </button>
              </div>
              <button
                onClick={handleUseCurrentLocation}
                disabled={locationLoading}
                className="w-full py-2 text-sm text-orange-600 hover:text-orange-700 font-medium disabled:opacity-50"
              >
                Use current location
              </button>
              {locationError && (
                <p className="text-red-500 text-sm">{locationError}</p>
              )}
            </div>
          )}
        </div>

        {/* Distance Filter */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-gray-700 font-semibold">Search Distance</label>
            <span className="text-orange-600 font-bold">{getDistanceLabel(filters.distance)}</span>
          </div>
          <input
            type="range"
            min="1"
            max="25"
            step="1"
            value={filters.distance}
            onChange={(e) =>
              onFiltersChange({ ...filters, distance: parseInt(e.target.value) })
            }
            className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1 km</span>
            <span>25 km</span>
          </div>
        </div>

        {/* Minimum Rating Filter */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-gray-700 font-semibold">Minimum Rating</label>
            <span className="text-orange-600 font-bold">
              {filters.minRating === 0 ? 'Any' : `${(filters.minRating || 0).toFixed(1)}+ ⭐`}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="4.5"
            step="0.5"
            value={filters.minRating}
            onChange={(e) =>
              onFiltersChange({ ...filters, minRating: parseFloat(e.target.value) })
            }
            className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Any</span>
            <span>4.5★</span>
          </div>
        </div>

        {/* Popularity Filter */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-gray-700 font-semibold">Popularity</label>
            <span className="text-orange-600 font-bold text-sm">
              {getPopularityLabel(filters.maxReviews)}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="5"
            step="1"
            value={
              filters.maxReviews === 0 ? 0 :
              filters.maxReviews === 100 ? 1 :
              filters.maxReviews === 300 ? 2 :
              filters.maxReviews === 500 ? 3 :
              filters.maxReviews === 1000 ? 4 : 5
            }
            onChange={(e) => {
              const sliderValue = parseInt(e.target.value)
              const reviewValues = [0, 100, 300, 500, 1000, 5000]
              onFiltersChange({ ...filters, maxReviews: reviewValues[sliderValue] })
            }}
            className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>All</span>
            <span>Very Popular</span>
          </div>
        </div>

        {/* Open Now Toggle */}
        <div className="flex items-center justify-between pt-2">
          <label className="text-gray-700 font-semibold">Open Now</label>
          <button
            onClick={() =>
              onFiltersChange({ ...filters, openNow: !filters.openNow })
            }
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
              filters.openNow ? 'bg-orange-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
                filters.openNow ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  )
}
