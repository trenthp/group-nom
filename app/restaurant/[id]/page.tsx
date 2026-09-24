'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ReportButton } from '@/components/ReportButton'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import FactualDataForm from '@/components/restaurant/FactualDataForm'
import { calculateCompleteness, getMissingFieldsDescription } from '@/lib/completeness'
import { LocationIcon } from '@/components/icons'
import { LinkButton, NominationBadge } from '@/components/ui'
import { PlaceMeta } from '@/components/place'
import type { Restaurant, Nomination, RestaurantEnrichment } from '@/lib/types'

function formatGoodFor(tag: string): string {
  return tag.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export default function RestaurantPage() {
  const params = useParams()
  const router = useRouter()
  const { isSignedIn } = useUser()
  const restaurantId = params.id as string
  const search = useSearchParams()
  // A session code lets a pre-unlock member open a winner from their deck
  const sessionCode = search.get('session')

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [gated, setGated] = useState<string | null>(null)
  const [nominations, setNominations] = useState<Nomination[]>([])
  const [nominationCount, setNominationCount] = useState(0)
  const [userNomination, setUserNomination] = useState<Nomination | null>(null)
  const [enrichment, setEnrichment] = useState<RestaurantEnrichment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingFacts, setEditingFacts] = useState(false)
  const [shared, setShared] = useState(false)

  // Share links go to the public teaser page — the member page is gated
  const share = async () => {
    const url = `${window.location.origin}/p/${restaurantId}`
    const title = restaurant ? `${restaurant.name} on Group Nom` : 'Group Nom'
    try {
      if (navigator.share) {
        await navigator.share({ title, url })
      } else {
        await navigator.clipboard.writeText(url)
        setShared(true)
        setTimeout(() => setShared(false), 2000)
      }
    } catch {
      /* user cancelled or clipboard unavailable */
    }
  }

  const fetchAll = useCallback(async () => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      const gateQs = `tz=${encodeURIComponent(tz)}${sessionCode ? `&session=${encodeURIComponent(sessionCode)}` : ''}`
      const [detailsRes, nomsRes, enrichRes] = await Promise.all([
        fetch(`/api/restaurants/${restaurantId}/details`),
        fetch(`/api/nominations/restaurant/${restaurantId}?${gateQs}`),
        fetch(`/api/enrichment/${restaurantId}`),
      ])

      if (!detailsRes.ok) {
        setError('Restaurant not found')
        setLoading(false)
        return
      }

      const details = await detailsRes.json()
      setRestaurant(details.restaurant)

      if (nomsRes.status === 403) {
        const body = await nomsRes.json().catch(() => ({}))
        setGated(body.error || 'Nominate a place you love to open this page.')
        setNominationCount(details.restaurant?.nominationCount ?? 0)
        setLoading(false)
        return
      }

      if (nomsRes.ok) {
        const noms = await nomsRes.json()
        setNominations(noms.nominations || [])
        setNominationCount(noms.nominationCount || 0)
        setUserNomination(noms.userNomination || null)
      }

      if (enrichRes.ok) {
        const enr = await enrichRes.json()
        setEnrichment(enr.enrichment || null)
      }

      setLoading(false)
    } catch {
      setError('Failed to load restaurant')
      setLoading(false)
    }
  }, [restaurantId, sessionCode])

  useEffect(() => {
    if (restaurantId) fetchAll()
  }, [restaurantId, fetchAll])

  if (!loading && restaurant && gated) {
    return (
      <div className="min-h-screen bg-surface-page">
        <main className="max-w-lg mx-auto px-4 pt-10 pb-24">
          <button
            onClick={() => router.back()}
            className="mb-6 text-white/60 flex items-center gap-2 hover:text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded"
          >
            ← Back
          </button>
          <div className="bg-surface-card rounded-2xl p-6">
            <h1 className="text-2xl font-bold text-white mb-1">{restaurant.name}</h1>
            <p className="text-white/50 text-sm mb-5">{restaurant.address}</p>
            {nominationCount > 0 && (
              <p className="text-white/80 mb-2">
                ❤️ Loved by {nominationCount} local{nominationCount === 1 ? '' : 's'} — their photos and
                stories are waiting behind your first nomination.
              </p>
            )}
            <p className="text-white/60 text-sm mb-6">{gated}</p>
            <div className="space-y-3">
              <Link
                href="/nominate"
                className="block w-full text-center px-6 py-3 rounded-lg font-semibold bg-brand text-white hover:bg-brand-hover transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page"
              >
                Nominate a place you love
              </Link>
              <Link
                href="/library"
                className="block w-full text-center px-6 py-3 rounded-lg font-medium border border-white/20 text-white/70 hover:bg-white/5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                See Today&apos;s Five
              </Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-page flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand border-t-transparent" />
      </div>
    )
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-surface-page flex items-center justify-center p-4">
        <div className="bg-surface-card rounded-2xl p-8 max-w-md text-center">
          <p className="text-white/60 mb-4">{error || 'Restaurant not found'}</p>
          <Link href="/library" className="text-brand underline">Back to the Library</Link>
        </div>
      </div>
    )
  }

  const completeness = calculateCompleteness(nominationCount, enrichment, nominations)
  const heroPhoto = restaurant.imageUrl || nominations[0]?.photoUrl

  return (
    <div className="min-h-screen bg-surface-page">
      {/* Back navigation + share over the hero */}
      <button
        onClick={() => router.back()}
        className="absolute top-4 left-4 z-10 bg-black/40 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm hover:bg-black/60 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        ← Back
      </button>
      <button
        onClick={share}
        className="absolute top-4 right-4 z-10 bg-black/40 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm hover:bg-black/60 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        {shared ? 'Link copied' : 'Share'}
      </button>

      {/* Hero */}
      <div className="relative">
        {heroPhoto ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={heroPhoto} alt={restaurant.name} className="w-full h-56 sm:h-72 lg:h-96 object-cover" />
        ) : (
          <div className="w-full h-40 bg-gradient-to-br from-orange-900/50 to-red-900/50 flex items-center justify-center">
            <span className="text-5xl">🍽️</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface-page via-transparent to-transparent" />
      </div>

      {/* Phone: one column in story order. lg: the story (title, signal,
          nominations) on the left, the facts docked and sticky on the right. */}
      <main className="max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto px-4 pb-24 -mt-10 relative lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8 lg:items-start">
        <div className="lg:col-start-1 lg:row-start-1">
        {/* Title block */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-1">{restaurant.name}</h1>
          <p className="text-white/60 text-sm flex items-center gap-1.5">
            <LocationIcon size={14} />
            {restaurant.address}
            <a
              href={`https://www.openstreetmap.org/?mlat=${restaurant.lat}&mlon=${restaurant.lng}#map=17/${restaurant.lat}/${restaurant.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-400 underline ml-1 hover:text-orange-300"
            >
              map
            </a>
          </p>
          <PlaceMeta cuisines={restaurant.cuisines ?? []} maxChips={8} className="mt-3" />
        </div>

        {/* Community signal + CTA */}
        <div className="bg-surface-card rounded-card p-4 mb-6">
          {nominationCount > 0 ? (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <NominationBadge count={nominationCount} />
              {userNomination ? (
                <span className="text-white/50 text-sm">You&apos;ve nominated this spot ✓</span>
              ) : (
                <LinkButton href={`/nominate/${restaurantId}`} size="sm">
                  ❤️ I love it too
                </LinkButton>
              )}
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="text-white/70 mb-3">
                No one has told this place&apos;s story yet.
              </p>
              <LinkButton href={`/nominate/${restaurantId}`}>
                ❤️ Be the first to nominate it
              </LinkButton>
            </div>
          )}
        </div>

        </div>

        <aside className="lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-20" aria-label="The facts">
        {/* Completeness (only shows once nominated) */}
        {completeness.hasNominations && (
          <div className="bg-surface-card rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/70 text-sm font-medium">Page completeness</span>
              <span className="text-white/50 text-sm">{completeness.completenessScore}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  completeness.completenessScore >= 80 ? 'bg-green-500'
                  : completeness.completenessScore >= 40 ? 'bg-brand'
                  : 'bg-amber-500'
                }`}
                style={{ width: `${completeness.completenessScore}%` }}
              />
            </div>
            {completeness.completenessScore < 100 && (
              <p className="text-white/40 text-xs mt-2">{getMissingFieldsDescription(completeness)}</p>
            )}
          </div>
        )}

        {/* The facts (community-maintained) */}
        <div className="bg-surface-card rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold">The Facts</h2>
            {isSignedIn && !editingFacts && (
              <button
                onClick={() => setEditingFacts(true)}
                className="text-orange-400 text-sm hover:text-orange-300 underline"
              >
                {enrichment ? 'Update' : 'Add details'}
              </button>
            )}
          </div>

          {editingFacts ? (
            <FactualDataForm
              restaurantId={restaurantId}
              restaurantName={restaurant.name}
              existingData={enrichment}
              onSuccess={(updated) => {
                setEnrichment(updated)
                setEditingFacts(false)
              }}
              onCancel={() => setEditingFacts(false)}
            />
          ) : (
            <div className="space-y-2 text-sm">
              {enrichment?.hoursNotes && (
                <div className="flex gap-2">
                  <span className="text-white/40 w-16 shrink-0">Hours</span>
                  <span className="text-white/80">{enrichment.hoursNotes}</span>
                </div>
              )}
              {enrichment?.menuUrl && (
                <div className="flex gap-2">
                  <span className="text-white/40 w-16 shrink-0">Menu</span>
                  <a href={enrichment.menuUrl} target="_blank" rel="noopener noreferrer" className="text-orange-400 underline hover:text-orange-300 truncate">
                    {enrichment.menuUrl.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              {enrichment?.parkingNotes && (
                <div className="flex gap-2">
                  <span className="text-white/40 w-16 shrink-0">Parking</span>
                  <span className="text-white/80">{enrichment.parkingNotes}</span>
                </div>
              )}
              {!enrichment?.hoursNotes && !enrichment?.menuUrl && !enrichment?.parkingNotes && (
                <p className="text-white/40 italic">
                  Hours, menu link, and parking tips get filled in by the community.
                  {!isSignedIn && ' Sign in to help.'}
                </p>
              )}
            </div>
          )}
        </div>

        </aside>

        <div className="lg:col-start-1 lg:row-start-2">
        {/* Nominations wall */}
        {nominations.length > 0 && (
          <div className="mb-6">
            <h2 className="text-white font-semibold mb-3">
              Why people love it
            </h2>
            <div className="space-y-4">
              {nominations.map((nom) => (
                <div key={nom.id} className="bg-surface-card rounded-xl overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={nom.photoUrl} alt={`Photo by ${nom.user?.displayName ?? 'a community member'}`} className="w-full h-48 object-cover" />
                  <div className="p-4">
                    <p className="text-white/90 italic mb-3">&ldquo;{nom.whyILoveIt}&rdquo;</p>

                    {nom.myFavoriteDishes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {nom.myFavoriteDishes.map((dish) => (
                          <span key={dish} className="bg-green-500/15 text-green-300 px-2 py-0.5 rounded text-xs">
                            🍴 {dish}
                          </span>
                        ))}
                      </div>
                    )}

                    {nom.goodFor.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {nom.goodFor.map((tag) => (
                          <span key={tag} className="bg-white/10 text-white/60 px-2 py-0.5 rounded text-xs">
                            {formatGoodFor(tag)}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-white/40 text-xs mt-2 flex items-center gap-2">
                      {nom.user?.avatarUrl && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={nom.user.avatarUrl} alt="" className="w-5 h-5 rounded-full" />
                      )}
                      {nom.user?.memberId ? (
                        <Link
                          href={`/member/${nom.user.memberId}`}
                          className="text-white/60 hover:text-white underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
                        >
                          {nom.user.displayName ?? 'A community member'}
                        </Link>
                      ) : (
                        <span>{nom.user?.displayName ?? 'A community member'}</span>
                      )}
                      <span aria-hidden="true">·</span>
                      {formatDate(nom.createdAt)}
                      <span className="ml-auto">
                        <ReportButton targetType="nomination" targetId={nom.id} />
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Back link + place-level report (closed / not a restaurant) */}
        <div className="text-center pt-4 space-y-3">
          <Link href="/library" className="text-white/40 hover:text-white/70 text-sm underline">
            ← Back to the Library
          </Link>
          <div>
            <ReportButton targetType="restaurant" targetId={restaurantId} label="Closed or not a restaurant? Let us know" />
          </div>
        </div>
        </div>
      </main>
    </div>
  )
}
