'use client'

/**
 * The moderation floor's front door: a quiet "Report" affordance that
 * expands into a reason picker. Positive-only product, so this is
 * deliberately low-key — a text link, never a badge.
 */

import { useId, useState } from 'react'

type TargetType = 'nomination' | 'restaurant'
type Reason = 'closed' | 'not_a_restaurant' | 'duplicate' | 'inappropriate' | 'spam' | 'other'

const REASONS: Record<TargetType, Array<{ value: Reason; label: string }>> = {
  restaurant: [
    { value: 'closed', label: 'It’s permanently closed' },
    { value: 'not_a_restaurant', label: 'It isn’t a restaurant' },
    { value: 'duplicate', label: 'It’s already on the map as another entry' },
    { value: 'other', label: 'Something else' },
  ],
  nomination: [
    { value: 'inappropriate', label: 'Inappropriate photo or words' },
    { value: 'spam', label: 'Spam or self-promotion' },
    { value: 'other', label: 'Something else' },
  ],
}

interface ReportButtonProps {
  targetType: TargetType
  targetId: string
  label?: string
}

export function ReportButton({ targetType, targetId, label = 'Report' }: ReportButtonProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<Reason | ''>('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const selectId = useId()

  const submit = async () => {
    if (!reason) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetId, reason, note: note.trim() || undefined }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Could not send the report')
      }
      setDone(true)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the report')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return <span className="text-white/40 text-xs">Thanks — we&apos;ll take a look.</span>
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-white/40 hover:text-white/70 text-xs underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded"
      >
        {label}
      </button>
    )
  }

  return (
    <div className="mt-2 bg-white/5 border border-white/10 rounded-lg p-3 text-left text-sm space-y-2 max-w-sm">
      <label htmlFor={selectId} className="block text-white/70 text-xs font-medium">What&apos;s wrong?</label>
      <select
        id={selectId}
        value={reason}
        onChange={(e) => setReason(e.target.value as Reason)}
        className="w-full bg-surface-page text-white border border-white/20 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:border-brand"
      >
        <option value="">Pick a reason</option>
        {REASONS[targetType].map(r => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        maxLength={500}
        placeholder="Anything that helps (optional)"
        aria-label="Details"
        className="w-full bg-surface-page text-white placeholder-white/30 border border-white/20 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:border-brand resize-none"
      />
      {error && <p role="alert" className="text-red-300 text-xs">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={busy}
          className="px-3 py-1.5 text-white/60 hover:text-white text-xs rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={busy || !reason}
          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          {busy ? 'Sending…' : 'Send report'}
        </button>
      </div>
    </div>
  )
}
