'use client'

import { useState } from 'react'
import { LocationIcon, StarIcon } from '@/components/icons'
import { DEFAULT_FILTERS } from '@/lib/types'

interface FilterValues {
  minRating: number
  openNow: boolean
  maxReviews: number
  distance: number
  priceLevel: number[]
  cuisines: string[]
  preferLocal: boolean
}

interface RestaurantFiltersProps {
  filters: FilterValues
  onFiltersChange: (filters: FilterValues) => void
  locationName?: string
  onCustomLocationSubmit: (query: string) => Promise<void>
  onUseCurrentLocation: () => void
  locationLoading?: boolean
  locationError?: string
}

// Helper to check if arrays are equal (for priceLevel and cuisines)
function arraysEqual(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((val, idx) => val === sortedB[idx])
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

  // Check if a specific filter has been edited from default
  const isEdited = {
    distance: filters.distance !== DEFAULT_FILTERS.distance,
    minRating: filters.minRating !== DEFAULT_FILTERS.minRating,
    maxReviews: filters.maxReviews !== DEFAULT_FILTERS.maxReviews,
    openNow: filters.openNow !== DEFAULT_FILTERS.openNow,
    priceLevel: !arraysEqual(filters.priceLevel, DEFAULT_FILTERS.priceLevel),
    cuisines: !arraysEqual(filters.cuisines, DEFAULT_FILTERS.cuisines),
    preferLocal: filters.preferLocal !== DEFAULT_FILTERS.preferLocal,
  }

  // Check if any filter is edited
  const hasAnyEdits = Object.values(isEdited).some(Boolean)

  // Reset a specific filter to default
  const resetFilter = (key: keyof typeof DEFAULT_FILTERS) => {
    onFiltersChange({ ...filters, [key]: DEFAULT_FILTERS[key] })
  }

  // Reset all filters to default
  const resetAllFilters = () => {
    onFiltersChange({ ...DEFAULT_FILTERS })
  }

  const getPopularityLabel = (value: number) => {
    if (value === 100) return 'Hidden Gems'
    if (value === 300) return 'Lesser-known'
    if (value === 500) return 'Moderate'
    if (value === 1000) return 'Popular'
    if (value === 5000) return 'Very Popular'
    return 'Any'
  }

  const getDistanceLabel = (km: number) => {
    const miles = (km * 0.621371).toFixed(1)
    return `${km} km (${miles} mi)`
  }

  const cuisineOptions = [
    'American', 'Italian', 'Mexican', 'Japanese', 'Chinese',
    'Indian', 'Thai', 'Korean', 'Vietnamese', 'Mediterranean',
    'French', 'Greek', 'Spanish', 'Caribbean', 'BBQ'
  ]

  const togglePriceLevel = (level: number) => {
    const current = filters.priceLevel || []
    if (current.includes(level)) {
      onFiltersChange({ ...filters, priceLevel: current.filter(l => l !== level) })
    } else {
      onFiltersChange({ ...filters, priceLevel: [...current, level].sort() })
    }
  }

  const toggleCuisine = (cuisine: string) => {
    const current = filters.cuisines || []
    if (current.includes(cuisine)) {
      onFiltersChange({ ...filters, cuisines: current.filter(c => c !== cuisine) })
    } else {
      onFiltersChange({ ...filters, cuisines: [...current, cuisine] })
    }
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

  // Reusable filter section wrapper with edited state styling
  const FilterSection = ({
    children,
    edited,
    onReset,
    className = ''
  }: {
    children: React.ReactNode
    edited: boolean
    onReset: () => void
    className?: string
  }) => (
    <div className={`relative rounded-xl p-4 transition-all ${
      edited
        ? 'bg-orange-50 ring-2 ring-orange-200'
        : 'bg-gray-50'
    } ${className}`}>
      {edited && (
        <button
          onClick={onReset}
          className="absolute top-2 right-2 text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1 transition"
          aria-label="Reset to default"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reset
        </button>
      )}
      {children}
    </div>
  )

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-gray-800">Restaurant Filters</h3>
        {hasAnyEdits && (
          <button
            onClick={resetAllFilters}
            className="text-sm text-gray-500 hover:text-orange-600 font-medium flex items-center gap-1 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset All
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Location - special case, not resettable */}
        <div className="rounded-xl p-4 bg-gray-50">
          {!isEditingLocation ? (
            <div className="flex justify-between items-center">
              <label className="text-gray-700 font-semibold">Location</label>
              <button
                onClick={() => setIsEditingLocation(true)}
                className="flex items-center gap-1 text-orange-600 font-bold hover:text-orange-700 transition"
              >
                <LocationIcon size={16} />
                {locationLoading ? 'Finding...' : (locationName || 'Current Location')}
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

        {/* Prefer Local (Chain Filter) */}
        <FilterSection edited={isEdited.preferLocal} onReset={() => resetFilter('preferLocal')}>
          <div className="flex items-center justify-between">
            <div>
              <label className="text-gray-700 font-semibold block">Prefer Local</label>
              <span className="text-xs text-gray-500">
                {filters.preferLocal ? 'Prioritizing local restaurants' : 'Including all chains'}
              </span>
            </div>
            <button
              onClick={() => onFiltersChange({ ...filters, preferLocal: !filters.preferLocal })}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                filters.preferLocal ? 'bg-orange-600' : 'bg-gray-300'
              }`}
              aria-label={filters.preferLocal ? 'Prefer local restaurants (on)' : 'Prefer local restaurants (off)'}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
                  filters.preferLocal ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          {!isEdited.preferLocal && (
            <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-gray-300"></span>
              Default
            </div>
          )}
        </FilterSection>

        {/* Distance Filter */}
        <FilterSection edited={isEdited.distance} onReset={() => resetFilter('distance')}>
          <div className="flex justify-between items-center mb-2">
            <label className="text-gray-700 font-semibold">Search Distance</label>
            <span className={`font-bold ${isEdited.distance ? 'text-orange-600' : 'text-gray-600'}`}>
              {getDistanceLabel(filters.distance)}
            </span>
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
            <span className={isEdited.distance ? '' : 'font-medium text-gray-600'}>
              {!isEdited.distance && '← Default: 5 km'}
            </span>
            <span>25 km</span>
          </div>
        </FilterSection>

        {/* Minimum Rating Filter */}
        <FilterSection edited={isEdited.minRating} onReset={() => resetFilter('minRating')}>
          <div className="flex justify-between items-center mb-2">
            <label className="text-gray-700 font-semibold">Minimum Rating</label>
            <span className={`flex items-center gap-1 font-bold ${isEdited.minRating ? 'text-orange-600' : 'text-gray-600'}`}>
              {filters.minRating === 0 ? 'Any' : (
                <>
                  {(filters.minRating || 0).toFixed(1)}+
                  <StarIcon size={14} className="text-yellow-400" />
                </>
              )}
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
            <span className={!isEdited.minRating ? 'font-medium text-gray-600' : ''}>
              Any {!isEdited.minRating && '← Default'}
            </span>
            <span>4.5★</span>
          </div>
        </FilterSection>

        {/* Popularity Filter */}
        <FilterSection edited={isEdited.maxReviews} onReset={() => resetFilter('maxReviews')}>
          <div className="flex justify-between items-center mb-2">
            <label className="text-gray-700 font-semibold">Popularity</label>
            <span className={`font-bold text-sm ${isEdited.maxReviews ? 'text-orange-600' : 'text-gray-600'}`}>
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
            <span className={!isEdited.maxReviews ? 'font-medium text-gray-600' : ''}>
              Any {!isEdited.maxReviews && '← Default'}
            </span>
            <span>Very Popular</span>
          </div>
        </FilterSection>

        {/* Open Now Toggle */}
        <FilterSection edited={isEdited.openNow} onReset={() => resetFilter('openNow')}>
          <div className="flex items-center justify-between">
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
          {!isEdited.openNow && (
            <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-gray-300"></span>
              Default: Off
            </div>
          )}
        </FilterSection>

        {/* Price Level */}
        <FilterSection edited={isEdited.priceLevel} onReset={() => resetFilter('priceLevel')}>
          <label className="text-gray-700 font-semibold block mb-3">Price Level</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((level) => (
              <button
                key={level}
                onClick={() => togglePriceLevel(level)}
                className={`flex-1 py-2 px-3 rounded-lg font-bold text-sm transition ${
                  (filters.priceLevel || []).includes(level)
                    ? 'bg-orange-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {'$'.repeat(level)}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            {(filters.priceLevel || []).length === 0
              ? (isEdited.priceLevel ? 'None selected' : 'All prices (Default)')
              : `${(filters.priceLevel || []).length} selected`}
          </p>
        </FilterSection>

        {/* Cuisine Type */}
        <FilterSection edited={isEdited.cuisines} onReset={() => resetFilter('cuisines')}>
          <label className="text-gray-700 font-semibold block mb-3">Cuisine Type</label>
          <div className="flex flex-wrap gap-2">
            {cuisineOptions.map((cuisine) => (
              <button
                key={cuisine}
                onClick={() => toggleCuisine(cuisine)}
                className={`py-1.5 px-3 rounded-full text-sm font-medium transition ${
                  (filters.cuisines || []).includes(cuisine)
                    ? 'bg-orange-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {cuisine}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            {(filters.cuisines || []).length === 0
              ? (isEdited.cuisines ? 'None selected' : 'All cuisines (Default)')
              : `${(filters.cuisines || []).length} selected`}
          </p>
        </FilterSection>
      </div>
    </div>
  )
}
