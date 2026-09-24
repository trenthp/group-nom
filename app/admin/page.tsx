'use client'

/**
 * /admin — the moderation queue. Moderators only (the API 404s for
 * everyone else, and so does this page). Four actions, none of which
 * edit a member's words: dismiss, remove the nomination, quietly hide
 * the place, suspend the member.
 */

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Spinner } from '@/components/ui'

interface QueueReport {
  id: string
  targetType: 'nomination' | 'restaurant'
  targetId: string
  reason: string
  note: string | null
  createdAt: string
  target?: {
    restaurantId?: string
    restaurantName?: string
    nominationText?: string
    nominationPhotoUrl?: string
    nominatorId?: string
  }
}

type Action = 'dismiss' | 'remove_nomination' | 'hide_place' | 'suspend_member'

const REASON_LABEL: Record<string, string> = {
  closed: 'Permanently closed',
  not_a_restaurant: 'Not a restaurant',
  duplicate: 'Duplicate entry',
  inappropriate: 'Inappropriate',
  spam: 'Spam / self-promotion',
  other: 'Other',
}

export default function AdminPage() {
  const [reports, setReports] = useState<QueueReport[] | null>(null)
  const [forbidden, setForbidden] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/reports')
    if (res.status === 404) { setForbidden(true); return }
    if (!res.ok) { setError('Could not load the queue'); return }
    const data = await res.json()
    setReports(data.reports ?? [])
  }, [])

  useEffect(() => { load() }, [load])

  const act = async (id: string, action: Action) => {
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Action failed')
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setBusyId(null)
    }
  }

  if (forbidden) {
    return (
      <div className="min-h-screen bg-surface-page flex items-center justify-center p-4">
        <div className="bg-surface-card rounded-2xl p-8 max-w-md text-center">
          <p className="text-white/60 mb-4">Not found</p>
          <Link href="/" className="text-brand underline">Home</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-page">
      <main className="max-w-2xl mx-auto px-4 py-8">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-wider text-white/40">Moderation</p>
          <h1 className="text-2xl font-bold text-white">Open reports</h1>
          <p className="text-white/50 text-sm mt-1">
            Remove or keep — never rewrite. Hiding a place is quiet: nothing is announced.
          </p>
        </header>

        {error && <p role="alert" className="text-red-300 text-sm mb-4">{error}</p>}

        {reports === null && <div className="flex justify-center py-12"><Spinner /></div>}

        {reports && reports.length === 0 && (
          <p className="text-white/50 text-sm py-12 text-center">Nothing to review. 🎉</p>
        )}

        {reports && reports.length > 0 && (
          <ul className="space-y-3 list-none p-0 m-0">
            {reports.map((r) => {
              const busy = busyId === r.id
              return (
                <li key={r.id} className="bg-surface-card rounded-card p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="text-white font-semibold truncate">
                        {r.target?.restaurantName ?? r.target?.restaurantId ?? r.targetId}
                      </p>
                      <p className="text-white/50 text-xs">
                        {r.targetType === 'nomination' ? 'Nomination' : 'Place'} · {REASON_LABEL[r.reason] ?? r.reason} ·{' '}
                        {new Date(r.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {r.target?.restaurantId && (
                      <Link
                        href={`/restaurant/${r.target.restaurantId}`}
                        className="shrink-0 text-xs text-white/60 hover:text-white underline"
                        target="_blank"
                      >
                        Open page ↗
                      </Link>
                    )}
                  </div>

                  {r.note && <p className="text-white/70 text-sm mb-2">Reporter: &ldquo;{r.note}&rdquo;</p>}

                  {r.targetType === 'nomination' && (
                    <div className="flex gap-3 bg-white/5 rounded-lg p-2 mb-3">
                      {r.target?.nominationPhotoUrl && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={r.target.nominationPhotoUrl} alt="" className="w-16 h-16 rounded object-cover shrink-0" />
                      )}
                      <p className="text-white/80 text-sm italic line-clamp-3">&ldquo;{r.target?.nominationText}&rdquo;</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => act(r.id, 'dismiss')} disabled={busy}
                      className="px-3 py-1.5 text-xs rounded-lg border border-white/20 text-white/70 hover:bg-white/5 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
                      Dismiss
                    </button>
                    {r.targetType === 'nomination' && (
                      <button onClick={() => act(r.id, 'remove_nomination')} disabled={busy}
                        className="px-3 py-1.5 text-xs rounded-lg bg-white/10 text-white hover:bg-white/20 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
                        Remove nomination
                      </button>
                    )}
                    {r.target?.restaurantId && (
                      <button onClick={() => act(r.id, 'hide_place')} disabled={busy}
                        className="px-3 py-1.5 text-xs rounded-lg bg-white/10 text-white hover:bg-white/20 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
                        Quietly hide place
                      </button>
                    )}
                    {r.target?.nominatorId && (
                      <button onClick={() => act(r.id, 'suspend_member')} disabled={busy}
                        className="px-3 py-1.5 text-xs rounded-lg bg-red-500/20 text-red-200 hover:bg-red-500/30 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
                        Suspend member
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
