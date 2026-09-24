'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { NominationBadge, Spinner } from '@/components/ui'
import { LocationIcon } from '@/components/icons'
import type { BBox, DiscoverPlace } from '@/lib/discover'

/**
 * The optional cards way through Discover: ten random places from the
 * current view, one at a time. Drag right or tap Save to put a place on
 * your to-try list; drag left or tap Skip to move on. Skipping records
 * nothing — there is no like signal anywhere in the product.
 */
export interface DiscoverCardsProps {
  bbox: BBox | null
  saved: Set<string>
  onToggleSave: (place: DiscoverPlace) => Promise<void> | void
}

const SWIPE_THRESHOLD = 80

export function DiscoverCards({ bbox, saved, onToggleSave }: DiscoverCardsProps) {
  const [hand, setHand] = useState<DiscoverPlace[]>([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exhausted, setExhausted] = useState(false)
  const seen = useRef<Set<string>>(new Set())
  const bboxKey = bbox ? `${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}` : null

  const deal = useCallback(async () => {
    if (!bboxKey) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/discover/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bbox: bboxKey, exclude: Array.from(seen.current) }),
      })
      if (!res.ok) throw new Error('deal failed')
      const { places } = (await res.json()) as { places: DiscoverPlace[] }
      places.forEach(p => seen.current.add(p.id))
      setHand(places)
      setIndex(0)
      setExhausted(places.length === 0)
    } catch {
      setError('Could not deal the cards. Try again.')
    } finally {
      setLoading(false)
    }
  }, [bboxKey])

  // New view → fresh hand (the seen set persists for the sitting)
  useEffect(() => {
    deal()
  }, [deal])

  const current = hand[index] ?? null

  // Drag state
  const [drag, setDrag] = useState<{ x: number; active: boolean }>({ x: 0, active: false })
  const startX = useRef(0)
  const [leaving, setLeaving] = useState<'left' | 'right' | null>(null)

  const advance = useCallback((direction: 'left' | 'right') => {
    setLeaving(direction)
    setTimeout(() => {
      setLeaving(null)
      setDrag({ x: 0, active: false })
      setIndex(i => i + 1)
    }, 220)
  }, [])

  const handleSkip = () => {
    if (!current || leaving) return
    advance('left')
  }

  const handleSave = async () => {
    if (!current || leaving) return
    if (!saved.has(current.id)) await onToggleSave(current)
    advance('right')
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (leaving) return
    startX.current = e.clientX
    setDrag({ x: 0, active: true })
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.active) return
    setDrag({ x: e.clientX - startX.current, active: true })
  }
  const onPointerUp = () => {
    if (!drag.active) return
    const x = drag.x
    setDrag({ x: 0, active: false })
    if (x > SWIPE_THRESHOLD) handleSave()
    else if (x < -SWIPE_THRESHOLD) handleSkip()
  }

  if (!bbox) {
    return <p className="text-white/50 text-sm text-center py-12">Set a location to start.</p>
  }

  if (loading && hand.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 text-sm mb-3">{error}</p>
        <button onClick={deal} className="text-brand font-medium text-sm">Try again</button>
      </div>
    )
  }

  if (exhausted || (!current && hand.length > 0)) {
    const nothingLeft = exhausted
    return (
      <div className="bg-surface-card rounded-card p-8 text-center">
        <p className="text-3xl mb-3" aria-hidden="true">{nothingLeft ? '🗺️' : '🃏'}</p>
        <h2 className="text-white font-bold text-lg mb-1">
          {nothingLeft ? 'That’s everything in view' : 'That’s ten'}
        </h2>
        <p className="text-white/60 text-sm mb-5">
          {nothingLeft
            ? 'Move the map to a new neighborhood and deal again.'
            : 'Keep going, or switch to the map to pick a new neighborhood.'}
        </p>
        {!nothingLeft && (
          <button
            onClick={deal}
            disabled={loading}
            className="px-5 py-2.5 rounded-lg bg-brand text-white font-semibold text-sm hover:bg-brand-hover transition disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page"
          >
            {loading ? 'Dealing…' : 'Ten more'}
          </button>
        )}
      </div>
    )
  }

  if (!current) return null

  const loved = current.nominationCount > 0
  const isSaved = saved.has(current.id)
  const rotate = drag.x / 18
  const transform = leaving
    ? `translateX(${leaving === 'right' ? 120 : -120}%) rotate(${leaving === 'right' ? 12 : -12}deg)`
    : `translateX(${drag.x}px) rotate(${rotate}deg)`

  return (
    <div className="select-none">
      <p className="text-white/40 text-xs text-center mb-3">
        {index + 1} of {hand.length} · drag right to save, left to skip
      </p>

      <div
        role="group"
        aria-label={current.name}
        className="bg-surface-card rounded-card overflow-hidden shadow-card touch-pan-y cursor-grab active:cursor-grabbing"
        style={{
          transform,
          transition: drag.active ? 'none' : 'transform 220ms ease-out',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {current.photoUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={current.photoUrl} alt="" className="w-full h-56 object-cover pointer-events-none" />
        ) : (
          <div
            className={`w-full h-40 flex items-center justify-center ${
              loved ? 'bg-gradient-to-br from-orange-900/40 to-red-900/40' : 'bg-[#2a2a2a]'
            }`}
            aria-hidden="true"
          >
            <span className="text-5xl">{loved ? '❤️' : '🍽️'}</span>
          </div>
        )}

        {/* Drag feedback */}
        {drag.x > 30 && (
          <div className="absolute top-4 left-4 bg-brand text-white text-sm font-bold px-3 py-1 rounded-pill rotate-[-8deg]">
            Save to try
          </div>
        )}
        {drag.x < -30 && (
          <div className="absolute top-4 right-4 bg-white/20 text-white text-sm font-bold px-3 py-1 rounded-pill rotate-[8deg]">
            Skip
          </div>
        )}

        <div className="p-5">
          <h2 className="text-xl font-bold text-white leading-tight">{current.name}</h2>
          {current.address && (
            <p className="text-white/60 text-sm mt-1 flex items-start gap-1.5">
              <LocationIcon size={14} className="mt-0.5 shrink-0" />
              {current.address}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            {loved && <NominationBadge count={current.nominationCount} size="sm" />}
            {current.cuisines.map((c) => (
              <span key={c} className="text-xs bg-white/10 text-white/70 px-2 py-0.5 rounded">
                {c}
              </span>
            ))}
          </div>
          <p className="text-white/50 text-sm mt-3">
            {loved ? 'On the shelf already. Been? Add your own.' : 'Not on the shelf yet.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4">
        <button
          type="button"
          onClick={handleSkip}
          className="py-3 rounded-lg bg-white/10 text-white/80 font-semibold text-sm hover:bg-white/15 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          Skip
        </button>
        <button
          type="button"
          onClick={handleSave}
          aria-pressed={isSaved}
          className="py-3 rounded-lg bg-brand text-white font-semibold text-sm hover:bg-brand-hover transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page"
        >
          {isSaved ? '✓ Saved' : 'Save to try'}
        </button>
        <Link
          href={`/nominate/${current.id}`}
          className="py-3 rounded-lg bg-white/10 text-white font-semibold text-sm text-center hover:bg-white/15 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          ❤️ Nominate
        </Link>
      </div>
    </div>
  )
}
