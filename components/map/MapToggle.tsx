'use client'

import { cn } from '@/lib/utils'

export interface MapToggleProps {
  view: 'list' | 'map'
  onViewChange: (view: 'list' | 'map') => void
  variant?: 'light' | 'dark'
  className?: string
}

export function MapToggle({ view, onViewChange, variant = 'light', className }: MapToggleProps) {
  const isDark = variant === 'dark'

  return (
    <div
      className={cn(
        'inline-flex gap-1 p-1 rounded-full border',
        isDark
          ? 'bg-[#333333] border-white/10'
          : 'bg-white/20 backdrop-blur-sm border-white/10',
        className
      )}
      role="radiogroup"
      aria-label="View toggle"
    >
      <button
        role="radio"
        aria-checked={view === 'list'}
        onClick={() => onViewChange('list')}
        className={cn(
          'px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200',
          view === 'list'
            ? isDark
              ? 'bg-[#EA4D19] text-white shadow-sm'
              : 'bg-white text-orange-600 shadow-sm'
            : isDark
              ? 'text-white/60 hover:text-white hover:bg-white/5'
              : 'text-white hover:bg-white/10'
        )}
      >
        <span className="flex items-center gap-2">
          <ListIcon />
          List
        </span>
      </button>
      <button
        role="radio"
        aria-checked={view === 'map'}
        onClick={() => onViewChange('map')}
        className={cn(
          'px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200',
          view === 'map'
            ? isDark
              ? 'bg-[#EA4D19] text-white shadow-sm'
              : 'bg-white text-orange-600 shadow-sm'
            : isDark
              ? 'text-white/60 hover:text-white hover:bg-white/5'
              : 'text-white hover:bg-white/10'
        )}
      >
        <span className="flex items-center gap-2">
          <MapIcon />
          Map
        </span>
      </button>
    </div>
  )
}

// Simple inline icons
function ListIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  )
}

function MapIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
      />
    </svg>
  )
}
