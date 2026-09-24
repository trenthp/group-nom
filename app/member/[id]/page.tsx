'use client'

/**
 * /member/[id] — a member's page.
 *
 * One route, two modes decided server-side (isSelf):
 *   someone else  → First L., avatar, the places they love. Nothing counted,
 *                   nothing ranked (anti-clout). Follow arrives in Phase 3.
 *   yourself      → the same, plus your ladder state. This is the profile area.
 *
 * Addressed by the opaque profile UUID. Former members 404.
 */

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Spinner } from '@/components/ui'
import { PlaceCard, PlacePhoto, PlaceBody, PlaceTitle, PlaceAddress, PlaceMeta } from '@/components/place'
import type { Nomination } from '@/lib/types'
import type { NominationDraft } from '@/lib/drafts'

const REASON_LABEL: Record<NominationDraft['reason'], string> = {
  revisit: 'After your next visit',
  limit: 'For tomorrow',
  later: 'When you have a photo',
}

interface MemberResponse {
  member: { id: string; displayName?: string; avatarUrl?: string }
  nominations: Nomination[]
  isSelf: boolean
  viewer?: { following: boolean; blocked: boolean }
  self?: {
    isUnlocked: boolean
    canPublish: boolean
    nominationCount: number
    status: string
    usedToday: boolean
    resetsAt: string
  }
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

export default function MemberPage() {
  const params = useParams()
  const search = useSearchParams()
  const id = params.id as string
  // Set by the nominate flow right after a member's first nomination
  const justUnlocked = search.get('welcome') === '1'

  const [data, setData] = useState<MemberResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<NominationDraft[]>([])

  // Drafts are private — only fetched on your own page
  useEffect(() => {
    if (!data?.isSelf) return
    let cancelled = false
    fetch('/api/nominations/drafts')
      .then(res => (res.ok ? res.json() : { drafts: [] }))
      .then(json => { if (!cancelled) setDrafts(json.drafts ?? []) })
      .catch(() => { /* non-fatal */ })
    return () => { cancelled = true }
  }, [data?.isSelf])

  const [relBusy, setRelBusy] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const setRelationship = async (kind: 'follow' | 'block', on: boolean) => {
    setRelBusy(true)
    try {
      const res = await fetch(`/api/members/${id}/${kind}`, { method: on ? 'POST' : 'DELETE' })
      if (!res.ok) return
      const json = await res.json()
      setData(prev => prev ? {
        ...prev,
        viewer: {
          following: kind === 'follow' ? !!json.following : (on ? false : prev.viewer?.following ?? false),
          blocked: kind === 'block' ? !!json.blocked : prev.viewer?.blocked ?? false,
        },
        nominations: kind === 'block' && on ? [] : prev.nominations,
      } : prev)
      if (kind === 'block' && !on) {
        // Unblocked: reload so their places come back
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
        fetch(`/api/members/${id}?tz=${encodeURIComponent(tz)}`).then(r => r.ok ? r.json() : null).then(j => { if (j) setData(j) })
      }
    } finally {
      setRelBusy(false)
      setMenuOpen(false)
    }
  }

  const removeDraft = async (gersId: string) => {
    const res = await fetch(`/api/nominations/drafts/${gersId}`, { method: 'DELETE' })
    if (res.ok) setDrafts(prev => prev.filter(d => d.gersId !== gersId))
  }

  useEffect(() => {
    let cancelled = false
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    fetch(`/api/members/${id}?tz=${encodeURIComponent(tz)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(res.status === 404 ? 'Member not found' : 'Failed to load member')
        return res.json()
      })
      .then((json: MemberResponse) => { if (!cancelled) setData(json) })
      .catch((err: Error) => { if (!cancelled) setError(err.message) })
    return () => { cancelled = true }
  }, [id])

  if (error) {
    return (
      <div className="min-h-screen bg-surface-page flex items-center justify-center p-4">
        <div className="bg-surface-card rounded-2xl p-8 max-w-md text-center">
          <p className="text-white/60 mb-4">{error}</p>
          <Link href="/library" className="text-brand underline">Back to the Library</Link>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-surface-page flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  const { member, nominations, isSelf, self, viewer } = data
  const name = member.displayName ?? 'A community member'
  const count = nominations.length

  return (
    <div className="min-h-screen bg-surface-page">
      <main className="max-w-lg mx-auto px-4 pt-8 pb-24">
        {isSelf && justUnlocked && (
          <div
            role="status"
            className="mb-6 rounded-2xl p-5 bg-gradient-to-br from-sunset-from to-sunset-to text-white"
          >
            <p className="text-xs uppercase tracking-wider text-white/80 mb-1">You&apos;re in</p>
            <h2 className="text-xl font-bold mb-1">The whole library is open to you.</h2>
            <p className="text-white/90 text-sm">
              Your first place is on the shelf. Every nomination from here makes the list better for everyone.
            </p>
            <Link
              href="/library"
              className="inline-block mt-3 px-4 py-2 rounded-pill bg-white text-sunset-to font-semibold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Explore the Library
            </Link>
          </div>
        )}

        {/* Identity */}
        <header className="flex items-center gap-4 mb-8">
          {member.avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={member.avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-2xl" aria-hidden="true">
              {name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-white">{isSelf ? 'Your page' : name}</h1>
            <p className="text-white/60 text-sm">
              {isSelf ? name : null}
              {isSelf && count > 0 ? ' · ' : ''}
              {viewer?.blocked
                ? 'Blocked'
                : count > 0
                  ? `${count} place${count === 1 ? '' : 's'} loved`
                  : isSelf ? 'No places yet' : 'Just joined'}
            </p>
          </div>

          {/* Follow / overflow — no counts, no lists, ever */}
          {!isSelf && viewer && (
            <div className="ml-auto flex items-center gap-2 relative">
              {!viewer.blocked && (
                <button
                  onClick={() => setRelationship('follow', !viewer.following)}
                  disabled={relBusy}
                  aria-pressed={viewer.following}
                  className={`px-4 py-2 rounded-pill text-sm font-semibold transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page ${
                    viewer.following
                      ? 'bg-white/10 text-white hover:bg-white/15'
                      : 'bg-brand text-white hover:bg-brand-hover'
                  }`}
                >
                  {viewer.following ? 'Following' : 'Follow'}
                </button>
              )}
              <button
                onClick={() => setMenuOpen(o => !o)}
                aria-label="More options"
                aria-expanded={menuOpen}
                className="w-9 h-9 rounded-full bg-white/10 text-white hover:bg-white/15 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                ⋯
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div role="menu" className="absolute right-0 top-full mt-2 w-44 bg-surface-card rounded-xl shadow-xl border border-white/10 z-50 overflow-hidden">
                    <button
                      role="menuitem"
                      onClick={() => setRelationship('block', !viewer.blocked)}
                      disabled={relBusy}
                      className="w-full px-4 py-2.5 text-left text-sm text-white/80 hover:bg-white/5 disabled:opacity-50"
                    >
                      {viewer.blocked ? 'Unblock' : 'Block this member'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </header>

        {/* Ladder state (self only) */}
        {isSelf && self && (
          <div className="bg-surface-card rounded-card p-4 mb-8">
            {self.status === 'suspended' ? (
              <p className="text-white/70 text-sm">Your account is read-only right now.</p>
            ) : self.usedToday ? (
              <p className="text-white/70 text-sm">
                Today&apos;s place is on the shelf. The next nomination opens at{' '}
                {new Date(self.resetsAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}.
              </p>
            ) : self.isUnlocked ? (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-white/70 text-sm">You&apos;ve unlocked the full library. Add another place you love today.</p>
                <Link
                  href="/nominate"
                  className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page"
                >
                  Nominate a place
                </Link>
              </div>
            ) : (
              <div>
                <p className="text-white font-semibold mb-1">Your first nomination opens the library.</p>
                <p className="text-white/60 text-sm mb-3">
                  Somewhere local you&apos;ve loved recently — a photo and why. That&apos;s it.
                </p>
                <Link
                  href="/nominate"
                  className="inline-block px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page"
                >
                  Find a place to nominate
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Your lists (self only) */}
        {isSelf && (
          <nav aria-label="Your lists" className="grid grid-cols-2 gap-3 mb-8">
            <Link
              href="/to-try"
              className="bg-surface-card rounded-card p-4 hover:bg-surface-card-hover transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <p className="text-white font-semibold">To try</p>
              <p className="text-white/50 text-xs mt-0.5">Places you want to get to</p>
            </Link>
            <Link
              href="/groups"
              className="bg-surface-card rounded-card p-4 hover:bg-surface-card-hover transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <p className="text-white font-semibold">Your groups</p>
              <p className="text-white/50 text-xs mt-0.5">The people you eat with</p>
            </Link>
          </nav>
        )}

        {/* Drafts (self only, private) */}
        {isSelf && drafts.length > 0 && (
          <section aria-labelledby="drafts-heading" className="mb-8">
            <div className="flex items-baseline justify-between mb-3">
              <h2 id="drafts-heading" className="text-white font-semibold">Drafts</h2>
              <span className="text-white/40 text-xs">Only you can see these</span>
            </div>
            <ul className="space-y-2 list-none p-0 m-0">
              {drafts.map((draft) => (
                <li key={draft.id} className="bg-surface-card rounded-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-white font-semibold truncate">{draft.restaurant?.name ?? 'A place'}</h3>
                      <p className="text-white/50 text-xs">
                        {[draft.restaurant?.city, REASON_LABEL[draft.reason]].filter(Boolean).join(' · ')}
                      </p>
                      {draft.whyILoveIt && (
                        <p className="text-white/70 italic text-sm mt-1 line-clamp-2">&ldquo;{draft.whyILoveIt}&rdquo;</p>
                      )}
                    </div>
                    <Link
                      href={`/nominate/${draft.gersId}`}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page"
                    >
                      Nominate
                    </Link>
                  </div>
                  <button
                    onClick={() => removeDraft(draft.gersId)}
                    className="mt-2 text-xs text-white/40 hover:text-white/70 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded"
                  >
                    Remove draft
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Places */}
        {count > 0 ? (
          <section aria-labelledby="places-heading">
            <h2 id="places-heading" className="text-white font-semibold mb-3">
              {isSelf ? 'Places you love' : `Places ${name} loves`}
            </h2>
            <ul className="space-y-4 list-none p-0 m-0">
              {nominations.map((nom) => (
                <li key={nom.id}>
                  <PlaceCard href={`/restaurant/${nom.gersId}`}>
                    <PlacePhoto src={nom.photoUrl} loved height="lg" />
                    <PlaceBody>
                      <PlaceTitle>{nom.restaurant?.name ?? 'A loved place'}</PlaceTitle>
                      {nom.restaurant?.city && <PlaceAddress>{nom.restaurant.city}</PlaceAddress>}
                      <p className="text-white/80 italic text-sm mt-2">&ldquo;{nom.whyILoveIt}&rdquo;</p>
                      <PlaceMeta dishes={nom.myFavoriteDishes} maxChips={6} />
                      <p className="text-white/60 text-xs mt-2">{formatDate(nom.createdAt)}</p>
                    </PlaceBody>
                  </PlaceCard>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          !isSelf && (
            <p className="text-white/50 text-sm">
              {name} hasn&apos;t added a place yet.
            </p>
          )
        )}

        <div className="text-center pt-8">
          <Link href="/library" className="text-white/40 hover:text-white/70 text-sm underline">
            ← Back to the Library
          </Link>
        </div>
      </main>
    </div>
  )
}
