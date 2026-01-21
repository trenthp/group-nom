'use client'

import { useState, ReactNode } from 'react'
import { LocationIcon, StarOutlineIcon } from '@/components/icons'
import { DEFAULT_FILTERS } from '@/lib/types'
import { Chip, PanelButton } from '@/components/ui'

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
  // Location can be provided as a render prop OR via legacy props
  locationSlot?: ReactNode
  // Legacy location props (deprecated - use locationSlot instead)
  locationName?: string
  onCustomLocationSubmit?: (query: string) => Promise<void>
  onUseCurrentLocation?: () => void
  locationLoading?: boolean
  locationError?: string
  // Option to hide location row entirely (for contexts where location is handled elsewhere)
  hideLocation?: boolean
}

function arraysEqual(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((val, idx) => val === sortedB[idx])
}

// Journey Mode distance zones
const journeyZones = [
  {
    id: 'walk',
    icon: '🚶',
    label: 'Stroll',
    description: 'Walking distance',
    indices: [0, 1, 2, 3], // 0.5, 1, 2, 3 mi
  },
  {
    id: 'drive',
    icon: '🚗',
    label: 'Quick Drive',
    description: 'Short drive away',
    indices: [4, 5, 6], // 5, 10, 15 mi
  },
  {
    id: 'adventure',
    icon: '🚀',
    label: 'Adventure',
    description: 'Worth the trip',
    indices: [7, 8, 9], // 25, 35, 50 mi
  },
]

function JourneyModeSelector({
  distanceOptions,
  currentDistance,
  onDistanceChange,
  getDistanceIndex,
}: {
  distanceOptions: { miles: number; km: number }[]
  currentDistance: number
  onDistanceChange: (km: number) => void
  getDistanceIndex: (km: number) => number
}) {
  const currentIdx = getDistanceIndex(currentDistance)
  const currentZone = journeyZones.find(z => z.indices.includes(currentIdx)) || journeyZones[0]

  return (
    <div className="space-y-3">
      {/* Active zone description */}
      <p className="text-center text-white/70 text-sm">{currentZone.description}</p>

      {/* Zone selector with transport icons */}
      <div className="flex justify-center items-center gap-2">
        {journeyZones.map((zone) => {
          const isActive = zone.id === currentZone.id
          const defaultIdx = zone.indices[Math.floor(zone.indices.length / 2)]

          return (
            <button
              key={zone.id}
              onClick={() => onDistanceChange(distanceOptions[defaultIdx].km)}
              className={`
                flex flex-col items-center gap-1 px-4 py-2 rounded-full
                transition-all duration-150
                ${isActive
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'bg-white/15 text-white hover:bg-white/25 border border-white/10'
                }
                hover:scale-[1.03] active:scale-[0.97]
              `}
            >
              <span className="text-lg">{zone.icon}</span>
              <span className="text-xs font-semibold">{zone.label}</span>
            </button>
          )
        })}
      </div>

      {/* Sub-options within selected zone */}
      <div className="flex justify-center gap-2">
        {currentZone.indices.map((idx) => {
          const opt = distanceOptions[idx]
          const isSelected = currentIdx === idx

          return (
            <button
              key={idx}
              onClick={() => onDistanceChange(opt.km)}
              className={`
                px-4 py-2 rounded-full text-sm font-semibold
                transition-all duration-150
                ${isSelected
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'bg-white/15 text-white hover:bg-white/25 border border-white/10'
                }
                hover:scale-[1.03] active:scale-[0.97]
              `}
            >
              {opt.miles} mi
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Rating options with labels
const ratingOptions = [
  { value: 0, label: 'Any', stars: 0, vibe: "We'll eat anywhere!" },
  { value: 3.0, label: '3+', stars: 3, vibe: 'Keep it decent' },
  { value: 4.0, label: '4+', stars: 4, vibe: 'Quality matters!' },
  { value: 4.5, label: '4.5+', stars: 5, vibe: 'Only the best!' },
]

function RatingSelector({
  currentRating,
  onRatingChange,
}: {
  currentRating: number
  onRatingChange: (rating: number) => void
}) {
  const currentOption = ratingOptions.find(o => o.value === currentRating) || ratingOptions[0]

  return (
    <div className="space-y-3">
      {/* Vibe text */}
      <p className="text-center text-white/70 text-sm">
        {currentOption.vibe}
      </p>

      {/* Rating buttons */}
      <div className="flex justify-center gap-2">
        {ratingOptions.map((opt) => {
          const isSelected = currentRating === opt.value

          return (
            <button
              key={opt.value}
              onClick={() => onRatingChange(opt.value)}
              className={`
                px-4 py-2 rounded-full text-sm font-semibold
                transition-all duration-150
                ${isSelected
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'bg-white/15 text-white hover:bg-white/25 border border-white/10'
                }
                hover:scale-[1.03] active:scale-[0.97]
              `}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function RestaurantFilters({
  filters,
  onFiltersChange,
  locationSlot,
  locationName,
  onCustomLocationSubmit,
  onUseCurrentLocation,
  locationLoading,
  locationError,
  hideLocation = false,
}: RestaurantFiltersProps) {
  const [isEditingLocation, setIsEditingLocation] = useState(false)
  const [locationInput, setLocationInput] = useState('')
  const [expandedFilter, setExpandedFilter] = useState<string | null>(null)

  const isEdited = {
    distance: filters.distance !== DEFAULT_FILTERS.distance,
    minRating: filters.minRating !== DEFAULT_FILTERS.minRating,
    maxReviews: filters.maxReviews !== DEFAULT_FILTERS.maxReviews,
    openNow: filters.openNow !== DEFAULT_FILTERS.openNow,
    priceLevel: !arraysEqual(filters.priceLevel, DEFAULT_FILTERS.priceLevel),
    cuisines: !arraysEqual(filters.cuisines, DEFAULT_FILTERS.cuisines),
    preferLocal: filters.preferLocal !== DEFAULT_FILTERS.preferLocal,
  }

  const handleLocationSubmit = async () => {
    if (locationInput.trim() && onCustomLocationSubmit) {
      await onCustomLocationSubmit(locationInput.trim())
      setLocationInput('')
      setIsEditingLocation(false)
    }
  }

  const handleUseCurrentLocation = () => {
    if (onUseCurrentLocation) {
      onUseCurrentLocation()
      setLocationInput('')
      setIsEditingLocation(false)
    }
  }

  // Distance snap points: miles with km equivalents
  const distanceOptions = [
    { miles: 0.5, km: 0.8 },
    { miles: 1, km: 1.6 },
    { miles: 2, km: 3.2 },
    { miles: 3, km: 4.8 },
    { miles: 5, km: 8 },
    { miles: 10, km: 16 },
    { miles: 15, km: 24 },
    { miles: 25, km: 40 },
    { miles: 35, km: 56 },
    { miles: 50, km: 80 },
  ]

  const getDistanceIndex = (km: number): number => {
    let closestIndex = 0
    let closestDiff = Math.abs(distanceOptions[0].km - km)
    for (let i = 1; i < distanceOptions.length; i++) {
      const diff = Math.abs(distanceOptions[i].km - km)
      if (diff < closestDiff) {
        closestDiff = diff
        closestIndex = i
      }
    }
    return closestIndex
  }

  const getDistanceLabel = (km: number) => {
    const opt = distanceOptions[getDistanceIndex(km)]
    return `${opt.miles} mi (${opt.km} km)`
  }

  const getRatingLabel = (rating: number) => {
    if (rating === 0) return 'any'
    return `${rating.toFixed(1)}+`
  }

  const getPopularityLabel = (value: number) => {
    if (value === 0) return 'any'
    if (value === 100) return 'hidden gems'
    if (value === 300) return 'lesser-known'
    if (value === 500) return 'moderate'
    if (value === 1000) return 'popular'
    return 'very popular'
  }

  const getPriceLabel = () => {
    const levels = filters.priceLevel || []
    if (levels.length === 0 || levels.length === 4) return 'any'
    return levels.map(l => '$'.repeat(l)).join(' ')
  }

  const getCuisineLabel = () => {
    const cuisines = filters.cuisines || []
    if (cuisines.length === 0) return 'any'
    if (cuisines.length === 1) return cuisines[0]
    if (cuisines.length === 2) return cuisines.join(' & ')
    return `${cuisines.length} selected`
  }

  const cuisineOptions = [
    'American', 'Italian', 'Mexican', 'Japanese', 'Chinese',
    'Indian', 'Thai', 'Korean', 'Vietnamese', 'Mediterranean',
    'French', 'Greek', 'Spanish', 'Caribbean', 'BBQ'
  ]

  const toggleCuisine = (cuisine: string) => {
    const current = filters.cuisines || []
    if (current.includes(cuisine)) {
      onFiltersChange({ ...filters, cuisines: current.filter(c => c !== cuisine) })
    } else {
      onFiltersChange({ ...filters, cuisines: [...current, cuisine] })
    }
  }

  const togglePriceLevel = (level: number) => {
    const current = filters.priceLevel || []
    if (current.includes(level)) {
      onFiltersChange({ ...filters, priceLevel: current.filter(l => l !== level) })
    } else {
      onFiltersChange({ ...filters, priceLevel: [...current, level].sort() })
    }
  }


  const FilterRow = ({
    label,
    children,
    expandedContent,
  }: {
    label: string
    children: React.ReactNode
    expandedContent?: React.ReactNode
  }) => (
    <div className="mb-5">
      <div className="flex items-center justify-center gap-4">
        <span className="w-24 text-right text-white/70 text-base font-semibold shrink-0">
          {label}
        </span>
        <div className="w-48">{children}</div>
      </div>
      {expandedContent && (
        <div className="mt-3 p-4 rounded-2xl bg-white/15 border border-white/10 shadow-lg shadow-black/10">
          {expandedContent}
        </div>
      )}
    </div>
  )


  return (
    <div className="text-white py-2">
      {/* Type */}
      <FilterRow label="Find">
        <Chip
          value={filters.preferLocal ? 'local spots' : 'any restaurant'}
          edited={filters.preferLocal}
          onClick={() => onFiltersChange({ ...filters, preferLocal: !filters.preferLocal })}
          hasDropdown={false}
        />
      </FilterRow>

      {/* Location - can be customized via locationSlot or hidden entirely */}
      {!hideLocation && (
        <FilterRow label="near">
          {locationSlot ? (
            // Use custom location component
            locationSlot
          ) : !isEditingLocation ? (
            // Legacy: built-in location display/edit
            <button
              onClick={() => setIsEditingLocation(true)}
              className={`
                inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-base font-semibold
                transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
                ${locationName
                  ? 'bg-white text-orange-600 shadow-md shadow-orange-900/25'
                  : 'bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm border border-white/15'
                }
              `}
            >
              <LocationIcon size={16} />
              <span className="max-w-[180px] truncate">
                {locationLoading ? 'Finding...' : (locationName || 'Current Location')}
              </span>
            </button>
          ) : (
            // Legacy: location editing mode
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleLocationSubmit()
                    if (e.key === 'Escape') setIsEditingLocation(false)
                  }}
                  placeholder="City or zip..."
                  className="w-44 px-4 py-2 rounded-full bg-white/95 text-gray-800 text-base font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-inner transition-all duration-150"
                  autoFocus
                />
                <button
                  onClick={handleLocationSubmit}
                  disabled={!locationInput.trim()}
                  className="text-white font-semibold text-base px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
                >
                  Go
                </button>
                <button
                  onClick={() => setIsEditingLocation(false)}
                  className="text-white/50 hover:text-white text-base transition-colors"
                >
                  Cancel
                </button>
              </div>
              {onUseCurrentLocation && (
                <button
                  onClick={handleUseCurrentLocation}
                  className="text-sm text-white/50 hover:text-white/80 mt-2 block underline underline-offset-2 transition-colors duration-150"
                >
                  Use my current location
                </button>
              )}
              {locationError && <span className="text-red-300 text-sm block mt-1">{locationError}</span>}
            </div>
          )}
        </FilterRow>
      )}

      {/* Distance - Journey Mode */}
      <FilterRow
        label="within"
        expandedContent={expandedFilter === 'distance' ? (
          <JourneyModeSelector
            distanceOptions={distanceOptions}
            currentDistance={filters.distance}
            onDistanceChange={(km) => onFiltersChange({ ...filters, distance: km })}
            getDistanceIndex={getDistanceIndex}
          />
        ) : undefined}
      >
        <Chip
          value={getDistanceLabel(filters.distance)}
          edited={true}
          onClick={() => setExpandedFilter(expandedFilter === 'distance' ? null : 'distance')}
          expanded={expandedFilter === 'distance'}
        />
      </FilterRow>

      {/* Rating */}
      <FilterRow
        label="rating"
        expandedContent={expandedFilter === 'rating' ? (
          <RatingSelector
            currentRating={filters.minRating}
            onRatingChange={(rating) => onFiltersChange({ ...filters, minRating: rating })}
          />
        ) : undefined}
      >
        <Chip
          value={getRatingLabel(filters.minRating)}
          edited={isEdited.minRating}
          onClick={() => setExpandedFilter(expandedFilter === 'rating' ? null : 'rating')}
          expanded={expandedFilter === 'rating'}
        >
          {filters.minRating > 0 && (
            <span className="flex gap-0.5">
              {Array.from({ length: Math.ceil(ratingOptions.find(o => o.value === filters.minRating)?.stars || 0) }).map((_, i) => (
                <StarOutlineIcon key={i} size={12} className="opacity-70" />
              ))}
            </span>
          )}
        </Chip>
      </FilterRow>

      {/* Popularity */}
      <FilterRow
        label="popularity"
        expandedContent={expandedFilter === 'popularity' ? (
          <div className="space-y-3">
            <p className="text-center text-white/70 text-sm">
              {filters.maxReviews === 0 && 'Any amount of reviews'}
              {filters.maxReviews === 100 && 'Under 100 reviews — undiscovered'}
              {filters.maxReviews === 300 && 'Under 300 reviews — off the beaten path'}
              {filters.maxReviews === 500 && 'Under 500 reviews — known but not crowded'}
              {filters.maxReviews === 1000 && 'Under 1,000 reviews — local favorites'}
              {filters.maxReviews === 5000 && '1,000+ reviews — crowd pleasers'}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { value: 0, label: 'Any' },
                { value: 100, label: 'Hidden gems' },
                { value: 300, label: 'Lesser-known' },
                { value: 500, label: 'Moderate' },
                { value: 1000, label: 'Popular' },
                { value: 5000, label: 'Very popular' },
              ].map(opt => (
                <PanelButton
                  key={opt.value}
                  selected={filters.maxReviews === opt.value}
                  onClick={() => onFiltersChange({ ...filters, maxReviews: opt.value })}
                >
                  {opt.label}
                </PanelButton>
              ))}
            </div>
          </div>
        ) : undefined}
      >
        <Chip
          value={getPopularityLabel(filters.maxReviews)}
          edited={isEdited.maxReviews}
          onClick={() => setExpandedFilter(expandedFilter === 'popularity' ? null : 'popularity')}
          expanded={expandedFilter === 'popularity'}
        />
      </FilterRow>

      {/* Hours */}
      <FilterRow label="hours">
        <Chip
          value={filters.openNow ? 'open now' : 'any'}
          edited={isEdited.openNow}
          onClick={() => onFiltersChange({ ...filters, openNow: !filters.openNow })}
          hasDropdown={false}
        />
      </FilterRow>

      {/* Price */}
      <FilterRow
        label="price"
        expandedContent={expandedFilter === 'price' ? (
          <div className="space-y-3">
            <p className="text-center text-white/70 text-sm">Tap multiple or none for any</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((level) => (
                <button
                  key={level}
                  onClick={() => togglePriceLevel(level)}
                  className={`
                    flex-1 py-3 rounded-xl font-bold text-base
                    transition-all duration-150
                    ${(filters.priceLevel || []).includes(level)
                      ? 'bg-white text-orange-600 shadow-sm'
                      : 'bg-white/15 text-white hover:bg-white/25 border border-white/10'
                    }
                    hover:scale-[1.03] active:scale-[0.97]
                  `}
                >
                  {'$'.repeat(level)}
                </button>
              ))}
            </div>
          </div>
        ) : undefined}
      >
        <Chip
          value={getPriceLabel()}
          edited={isEdited.priceLevel}
          onClick={() => setExpandedFilter(expandedFilter === 'price' ? null : 'price')}
          expanded={expandedFilter === 'price'}
        />
      </FilterRow>

      {/* Cuisine */}
      <FilterRow
        label="cuisine"
        expandedContent={expandedFilter === 'cuisine' ? (
          <div className="space-y-3">
            <p className="text-center text-white/70 text-sm">Tap multiple or none for any</p>
            <div className="flex flex-wrap justify-center gap-2">
              {cuisineOptions.map((cuisine) => (
                <PanelButton
                  key={cuisine}
                  selected={(filters.cuisines || []).includes(cuisine)}
                  onClick={() => toggleCuisine(cuisine)}
                >
                  {cuisine}
                </PanelButton>
              ))}
            </div>
          </div>
        ) : undefined}
      >
        <Chip
          value={getCuisineLabel()}
          edited={isEdited.cuisines}
          onClick={() => setExpandedFilter(expandedFilter === 'cuisine' ? null : 'cuisine')}
          expanded={expandedFilter === 'cuisine'}
        />
      </FilterRow>
    </div>
  )
}
