'use client'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui'

export interface MapToggleProps {
  view: 'list' | 'map'
  onViewChange: (view: 'list' | 'map') => void
  className?: string
}

export function MapToggle({ view, onViewChange, className }: MapToggleProps) {
  return (
    <ToggleGroup ariaLabel="View as list or map" className={className}>
      <ToggleGroupItem
        value="list"
        selected={view === 'list'}
        onValueSelect={() => onViewChange('list')}
      >
        <span className="flex items-center gap-2">
          <ListIcon />
          List
        </span>
      </ToggleGroupItem>
      <ToggleGroupItem
        value="map"
        selected={view === 'map'}
        onValueSelect={() => onViewChange('map')}
      >
        <span className="flex items-center gap-2">
          <MapIcon />
          Map
        </span>
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

function ListIcon() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  )
}

function MapIcon() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="1 6 8 3 16 6 23 3 23 18 16 21 8 18 1 21 1 6" />
      <line x1="8" y1="3" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="21" />
    </svg>
  )
}
