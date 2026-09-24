'use client'

import { BottomSheet } from '@/components/ui'
import { DiscoverPlaceDetail } from './DiscoverPlaceDetail'
import type { DiscoverPlace } from '@/lib/discover'

/**
 * Phone: tap a dot on the Discover map and the place detail slides up.
 * (Desktops dock the same detail beside the map instead — see
 * DiscoverPlacePanel.)
 */
export interface DiscoverSheetProps {
  place: DiscoverPlace | null
  isOpen: boolean
  onClose: () => void
  saved: boolean
  saving: boolean
  onToggleSave: (place: DiscoverPlace) => void
}

export function DiscoverSheet({ place, isOpen, onClose, saved, saving, onToggleSave }: DiscoverSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} ariaLabel={place ? place.name : 'Place'}>
      {place && (
        <div className="pb-8">
          <DiscoverPlaceDetail place={place} saved={saved} saving={saving} onToggleSave={onToggleSave} />
        </div>
      )}
    </BottomSheet>
  )
}
