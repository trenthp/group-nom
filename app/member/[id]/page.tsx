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
import { Spinner, NominationBadge } from '@/components/ui'
import type { Nomination } from '@/lib/types'

interface MemberResponse {
  member: { id: string; displayName?: string; avatarUrl?: string }
  nominations: Nomination[]
  isSelf: boolean
  self?: {
    isUnlocked: boolean
    canPublish: boolean
    nominationCount: number
    status: string
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

  useEffect(() => {
    let cancelled = false
    fetch(`/api/members/${id}`)
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

  const { member, nominations, isSelf, self } = data
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
              {count > 0
                ? `${count} place${count === 1 ? '' : 's'} loved`
                : isSelf ? 'No places yet' : 'Just joined'}
            </p>
          </div>
        </header>

        {/* Ladder state (self only) */}
        {isSelf && self && (
          <div className="bg-surface-card rounded-card p-4 mb-8">
            {self.status === 'suspended' ? (
              <p className="text-white/70 text-sm">Your account is read-only right now.</p>
            ) : self.isUnlocked ? (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-white/70 text-sm">You&apos;ve unlocked the full library. Add another place you love today.</p>
                <Link
                  href="/library"
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
                  href="/library"
                  className="inline-block px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page"
                >
                  Find a place to nominate
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Places */}
        {count > 0 ? (
          <section aria-labelledby="places-heading">
            <h2 id="places-heading" className="text-white font-semibold mb-3">
              {isSelf ? 'Places you love' : `Places ${name} loves`}
            </h2>
            <ul className="space-y-4 list-none p-0 m-0">
              {nominations.map((nom) => (
                <li key={nom.id} className="bg-surface-card rounded-card overflow-hidden">
                  <Link href={`/restaurant/${nom.gersId}`} className="block group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={nom.photoUrl} alt="" className="w-full h-44 object-cover" />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-white font-semibold group-hover:text-brand transition">
                            {nom.restaurant?.name ?? 'A loved place'}
                          </h3>
                          {nom.restaurant?.city && (
                            <p className="text-white/50 text-xs">{nom.restaurant.city}</p>
                          )}
                        </div>
                        <NominationBadge count={1} />
                      </div>
                      <p className="text-white/80 italic text-sm mt-2">&ldquo;{nom.whyILoveIt}&rdquo;</p>
                      {nom.myFavoriteDishes.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {nom.myFavoriteDishes.map((dish) => (
                            <span key={dish} className="bg-green-500/15 text-green-300 px-2 py-0.5 rounded text-xs">
                              🍴 {dish}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-white/40 text-xs mt-2">{formatDate(nom.createdAt)}</p>
                    </div>
                  </Link>
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
