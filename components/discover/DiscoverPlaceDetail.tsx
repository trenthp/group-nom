'use client'

import { ReportButton } from '@/components/ReportButton'
import {
  PlacePhoto,
  PlaceBody,
  PlaceTitle,
  PlaceAddress,
  PlaceMeta,
  PlaceActions,
  ActionButton,
  ActionLink,
  QuietLink,
  mapsUrl,
} from '@/components/place'
import type { DiscoverPlace } from '@/lib/discover'

/**
 * What you see when you tap a dot on the Discover map: the place, the love
 * it has (if any), save first, nominate second, the quieter follow-ups,
 * and a quiet report at the bottom (Discover doubles as the curation
 * surface for the raw seed). Phones show it in a bottom sheet; desktops
 * dock it beside the map. Same content either way.
 */
export interface DiscoverPlaceDetailProps {
  place: DiscoverPlace
  saved: boolean
  saving: boolean
  onToggleSave: (place: DiscoverPlace) => void
}

export function DiscoverPlaceDetail({ place, saved, saving, onToggleSave }: DiscoverPlaceDetailProps) {
  const loved = place.nominationCount > 0

  return (
    <>
      <PlacePhoto src={place.photoUrl} loved={loved} height="lg" />

      <PlaceBody className="px-5">
        <PlaceTitle size="lg" as="h2">{place.name}</PlaceTitle>
        {place.address && <PlaceAddress>{place.address}</PlaceAddress>}
        <PlaceMeta nominationCount={place.nominationCount} cuisines={place.cuisines} />

        <p className="text-white/60 text-sm mt-4">
          {loved
            ? 'Someone here loves this place. Been? Add your own nomination.'
            : 'Nobody has nominated this place yet. Save it to try, or light it up if you love it.'}
        </p>

        {/* Actions: save first, nominate second */}
        <PlaceActions>
          <ActionButton
            type="button"
            variant={saved ? 'secondary' : 'primary'}
            onClick={() => onToggleSave(place)}
            disabled={saving}
            aria-pressed={saved}
          >
            {saved ? '✓ On your list' : 'Save to try'}
          </ActionButton>
          <ActionLink href={`/nominate/${place.id}`}>❤️ Nominate</ActionLink>
        </PlaceActions>

        {/* The quieter follow-ups share the row, never a lone text link */}
        <PlaceActions className="mt-2">
          {loved && (
            <QuietLink href={`/restaurant/${place.id}`} className="text-brand hover:text-brand">
              See the page →
            </QuietLink>
          )}
          <QuietLink href={mapsUrl(place.lat, place.lng)} external>
            Open in maps ↗
          </QuietLink>
        </PlaceActions>

        <div className="mt-6 pt-4 border-t border-white/10">
          <ReportButton targetType="restaurant" targetId={place.id} label="Something wrong with this entry?" />
        </div>
      </PlaceBody>
    </>
  )
}

/**
 * Desktop: the detail docked beside the map, in a card, with a close
 * control that hands the panel back to the deck.
 */
export interface DiscoverPlacePanelProps extends DiscoverPlaceDetailProps {
  onClose: () => void
}

export function DiscoverPlacePanel({ onClose, ...detail }: DiscoverPlacePanelProps) {
  return (
    <section
      className="relative bg-surface-card rounded-card overflow-hidden"
      aria-label={detail.place.name}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white/80 hover:bg-black/70 hover:text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        aria-label="Back to the deck"
      >
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      <DiscoverPlaceDetail {...detail} />
    </section>
  )
}
