'use client'

import Link from 'next/link'
import { BottomSheet, NominationBadge } from '@/components/ui'
import { ReportButton } from '@/components/ReportButton'
import { LocationIcon } from '@/components/icons'
import type { DiscoverPlace } from '@/lib/discover'

/**
 * Tap a dot on the Discover map and this opens. Save to try is primary on
 * every place; nominate is the follow-through after a visit. A loved place
 * also links to its page (gated as usual). Reporting sits at the bottom,
 * quiet — Discover doubles as the curation surface for the raw seed.
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
  const loved = (place?.nominationCount ?? 0) > 0
  const mapUrl = place
    ? `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}#map=17/${place.lat}/${place.lng}`
    : '#'

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} ariaLabel={place ? place.name : 'Place'}>
      {place && (
        <div className="pb-8">
          {place.photoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={place.photoUrl} alt="" className="w-full h-44 object-cover" />
          ) : (
            <div
              className={`w-full h-20 flex items-center justify-center ${
                loved ? 'bg-gradient-to-br from-orange-900/40 to-red-900/40' : 'bg-[#2a2a2a]'
              }`}
              aria-hidden="true"
            >
              <span className="text-3xl">{loved ? '❤️' : '🍽️'}</span>
            </div>
          )}

          <div className="px-5 pt-4">
            <h2 className="text-xl font-bold text-white leading-tight">{place.name}</h2>
            {place.address && (
              <p className="text-white/60 text-sm mt-1 flex items-start gap-1.5">
                <LocationIcon size={14} className="mt-0.5 shrink-0" />
                {place.address}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              {loved && <NominationBadge count={place.nominationCount} size="sm" />}
              {place.cuisines.map((c) => (
                <span key={c} className="text-xs bg-white/10 text-white/70 px-2 py-0.5 rounded">
                  {c}
                </span>
              ))}
            </div>

            <p className="text-white/60 text-sm mt-4">
              {loved
                ? 'Someone here loves this place. Been? Add your own nomination.'
                : 'Nobody has nominated this place yet. Save it to try, or light it up if you love it.'}
            </p>

            {/* Actions: save first, nominate second */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                type="button"
                onClick={() => onToggleSave(place)}
                disabled={saving}
                aria-pressed={saved}
                className={`py-3 rounded-lg font-semibold text-sm transition disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card ${
                  saved
                    ? 'bg-white/10 text-white hover:bg-white/15'
                    : 'bg-brand text-white hover:bg-brand-hover'
                }`}
              >
                {saved ? '✓ On your list' : 'Save to try'}
              </button>
              <Link
                href={`/nominate/${place.id}`}
                className="py-3 rounded-lg font-semibold text-sm text-center bg-white/10 text-white hover:bg-white/15 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card"
              >
                ❤️ Nominate
              </Link>
            </div>

            <div className="flex items-center gap-4 mt-4 text-sm">
              {loved && (
                <Link href={`/restaurant/${place.id}`} className="text-brand hover:text-orange-400 font-medium">
                  See the page →
                </Link>
              )}
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/50 hover:text-white/80"
              >
                Open map
              </a>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10">
              <ReportButton targetType="restaurant" targetId={place.id} label="Something wrong with this entry?" />
            </div>
          </div>
        </div>
      )}
    </BottomSheet>
  )
}
