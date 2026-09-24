'use client'

import { useState } from 'react'
import { LocationIcon } from '@/components/icons'
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
  const [expandedFilter, setExpandedFilter] = useState<string | null>(null)

  const isEdited = {
    distance: filters.distance !== DEFAULT_FILTERS.distance,
    cuisines: !arraysEqual(filters.cuisines, DEFAULT_FILTERS.cuisines),
    preferLocal: filters.preferLocal !== DEFAULT_FILTERS.preferLocal,
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

  const Chip = ({
    value,
    edited,
    onClick,
    expanded,
    hasDropdown = true,
  }: {
    value: string
    edited: boolean
    onClick: () => void
    expanded?: boolean
    hasDropdown?: boolean
  }) => (
    <button
      onClick={onClick}
      className={`
        relative inline-flex items-center gap-1.5
        px-4 py-2 rounded-full
        text-base font-semibold tracking-tight
        transition-all duration-200 ease-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50
        ${edited
          ? 'bg-white text-orange-600 shadow-md shadow-orange-900/25'
          : 'bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm border border-white/15'
        }
        ${expanded
          ? 'ring-2 ring-white/50 scale-[1.02]'
          : 'hover:scale-[1.02]'
        }
        active:scale-[0.98]
      `}
    >
      {value}
      {hasDropdown && (
        <svg
          className={`w-3.5 h-3.5 opacity-50 transition-transform duration-200 ease-out ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      )}
      {edited && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-400 rounded-full border border-white" />
      )}
    </button>
  )

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
        <div className="mt-3 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 shadow-lg shadow-black/10">
          {expandedContent}
        </div>
      )}
    </div>
  )

  const PanelButton = ({
    selected,
    onClick,
    children,
    className = '',
  }: {
    selected: boolean
    onClick: () => void
    children: React.ReactNode
    className?: string
  }) => (
    <button
      onClick={onClick}
      className={`
        px-4 py-2 rounded-full text-sm font-semibold
        transition-all duration-150
        ${selected
          ? 'bg-white text-orange-600 shadow-sm'
          : 'bg-white/15 text-white hover:bg-white/25 border border-white/10'
        }
        hover:scale-[1.03] active:scale-[0.97]
        ${className}
      `}
    >
      {children}
    </button>
  )

  return (
    <div className="text-white py-2">
      <style jsx global>{`
        .slider-thumb::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          cursor: grab;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
          border: none;
        }
        .slider-thumb::-webkit-slider-thumb:active {
          cursor: grabbing;
          transform: scale(1.1);
        }
        .slider-thumb::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          cursor: grab;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
          border: none;
        }
        .slider-thumb::-moz-range-thumb:active {
          cursor: grabbing;
          transform: scale(1.1);
        }
      `}</style>
      {/* Type */}
      <FilterRow label="Find">
        <Chip
          value={filters.preferLocal ? 'local spots' : 'any restaurant'}
          edited={isEdited.preferLocal}
          onClick={() => onFiltersChange({ ...filters, preferLocal: !filters.preferLocal })}
          hasDropdown={false}
        />
      </FilterRow>

      {/* Location */}
      <FilterRow label="near">
        {!isEditingLocation ? (
          <button
            onClick={() => setIsEditingLocation(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-base font-semibold bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm border border-white/15 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <LocationIcon size={16} />
            <span className="max-w-[180px] truncate">
              {locationLoading ? 'Finding...' : (locationName || 'Current Location')}
            </span>
          </button>
        ) : (
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
            <button
              onClick={handleUseCurrentLocation}
              className="text-sm text-white/50 hover:text-white/80 mt-2 block underline underline-offset-2 transition-colors duration-150"
            >
              Use my current location
            </button>
            {locationError && <span className="text-red-300 text-sm block mt-1">{locationError}</span>}
          </div>
        )}
      </FilterRow>

      {/* Distance */}
      <FilterRow
        label="within"
        expandedContent={expandedFilter === 'distance' ? (
          <>
            <input
              type="range"
              min={0}
              max={distanceOptions.length - 1}
              step={1}
              value={getDistanceIndex(filters.distance)}
              onChange={(e) => {
                const idx = Number(e.target.value)
                onFiltersChange({ ...filters, distance: distanceOptions[idx].km })
              }}
              className="slider-thumb w-full h-2 rounded-full cursor-grab active:cursor-grabbing accent-white bg-white/40"
            />
            <div className="flex justify-between text-sm text-white/70 mt-2">
              <span>0.5 mi</span>
              <span className="font-semibold text-white">
                {distanceOptions[getDistanceIndex(filters.distance)].miles} mi ({distanceOptions[getDistanceIndex(filters.distance)].km} km)
              </span>
              <span>50 mi</span>
            </div>
          </>
        ) : undefined}
      >
        <Chip
          value={getDistanceLabel(filters.distance)}
          edited={isEdited.distance}
          onClick={() => setExpandedFilter(expandedFilter === 'distance' ? null : 'distance')}
          expanded={expandedFilter === 'distance'}
        />
      </FilterRow>

      {/* Cuisine */}
      <FilterRow
        label="cuisine"
        expandedContent={expandedFilter === 'cuisine' ? (
          <>
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
            <p className="text-sm text-white/50 mt-3 text-center">Tap multiple or none for any</p>
          </>
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
