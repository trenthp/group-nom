/**
 * Moderation floor (decided Aug 2026): members can report a nomination or
 * a place; a moderator dismisses, removes the nomination, quietly hides
 * the place, or suspends the member. Positive-only means a hidden place
 * just stops surfacing — nothing is announced.
 */

import { sql } from './db'

export type ReportTargetType = 'nomination' | 'restaurant'
export type ReportReason = 'closed' | 'not_a_restaurant' | 'inappropriate' | 'spam' | 'other'
export type ReportResolution = 'dismissed' | 'nomination_removed' | 'place_hidden' | 'member_suspended'

export const REPORT_REASONS: ReportReason[] = ['closed', 'not_a_restaurant', 'inappropriate', 'spam', 'other']

export interface Report {
  id: string
  reporterId: string
  targetType: ReportTargetType
  targetId: string
  reason: ReportReason
  note: string | null
  status: 'open' | 'resolved'
  resolution: ReportResolution | null
  createdAt: Date
  // Joined context for the queue
  target?: {
    restaurantId?: string
    restaurantName?: string
    nominationText?: string
    nominationPhotoUrl?: string
    nominatorId?: string
  }
}

function serialize(row: Record<string, unknown>): Report {
  return {
    id: row.id as string,
    reporterId: row.reporter_id as string,
    targetType: row.target_type as ReportTargetType,
    targetId: row.target_id as string,
    reason: row.reason as ReportReason,
    note: (row.note as string | null) ?? null,
    status: row.status as 'open' | 'resolved',
    resolution: (row.resolution as ReportResolution | null) ?? null,
    createdAt: row.created_at as Date,
    target: {
      restaurantId: (row.restaurant_id as string | null) ?? undefined,
      restaurantName: (row.restaurant_name as string | null) ?? undefined,
      nominationText: (row.nomination_text as string | null) ?? undefined,
      nominationPhotoUrl: (row.nomination_photo as string | null) ?? undefined,
      nominatorId: (row.nominator_id as string | null) ?? undefined,
    },
  }
}

/** One report per member per target; a repeat just refreshes the note. */
export async function createReport(
  reporterId: string,
  targetType: ReportTargetType,
  targetId: string,
  reason: ReportReason,
  note?: string | null
): Promise<Report> {
  const rows = await sql`
    INSERT INTO reports (reporter_id, target_type, target_id, reason, note)
    VALUES (${reporterId}, ${targetType}, ${targetId}, ${reason}, ${note ?? null})
    ON CONFLICT (reporter_id, target_type, target_id) DO UPDATE
      SET reason = EXCLUDED.reason, note = EXCLUDED.note, status = 'open', resolution = NULL
    RETURNING *
  `
  return serialize(rows[0])
}

export async function listOpenReports(limit = 100): Promise<Report[]> {
  const rows = await sql`
    SELECT rp.*,
      COALESCE(n.gers_id, CASE WHEN rp.target_type = 'restaurant' THEN rp.target_id END) AS restaurant_id,
      r.name AS restaurant_name,
      n.why_i_love_it AS nomination_text,
      n.photo_url AS nomination_photo,
      n.clerk_user_id AS nominator_id
    FROM reports rp
    LEFT JOIN nominations n ON rp.target_type = 'nomination' AND n.id::text = rp.target_id
    LEFT JOIN restaurants r ON r.gers_id = COALESCE(n.gers_id, CASE WHEN rp.target_type = 'restaurant' THEN rp.target_id END)
    WHERE rp.status = 'open'
    ORDER BY rp.created_at DESC
    LIMIT ${limit}
  `
  return rows.map(serialize)
}

export async function getReport(id: string): Promise<Report | null> {
  const rows = await sql`
    SELECT rp.*,
      COALESCE(n.gers_id, CASE WHEN rp.target_type = 'restaurant' THEN rp.target_id END) AS restaurant_id,
      n.clerk_user_id AS nominator_id
    FROM reports rp
    LEFT JOIN nominations n ON rp.target_type = 'nomination' AND n.id::text = rp.target_id
    WHERE rp.id = ${id}::uuid
  `
  return rows.length ? serialize(rows[0]) : null
}

export async function resolveReport(
  id: string,
  resolution: ReportResolution,
  resolvedBy: string
): Promise<void> {
  await sql`
    UPDATE reports
    SET status = 'resolved', resolution = ${resolution}, resolved_by = ${resolvedBy}, resolved_at = NOW()
    WHERE id = ${id}::uuid
  `
  // Sibling reports on the same target are settled by the same action
  await sql`
    UPDATE reports r2
    SET status = 'resolved', resolution = ${resolution}, resolved_by = ${resolvedBy}, resolved_at = NOW()
    FROM reports r1
    WHERE r1.id = ${id}::uuid
      AND r2.status = 'open'
      AND r2.target_type = r1.target_type AND r2.target_id = r1.target_id
  `
}

/** Quiet-hide: the place stops surfacing everywhere. Nothing is announced. */
export async function hidePlace(gersId: string, reason: string): Promise<void> {
  await sql`
    UPDATE restaurants SET hidden_at = NOW(), hidden_reason = ${reason}, updated_at = NOW()
    WHERE gers_id = ${gersId}
  `
}

export async function unhidePlace(gersId: string): Promise<void> {
  await sql`
    UPDATE restaurants SET hidden_at = NULL, hidden_reason = NULL, updated_at = NOW()
    WHERE gers_id = ${gersId}
  `
}

/** Moderator removal — the count triggers handle the bookkeeping. */
export async function removeNominationById(nominationId: string): Promise<boolean> {
  const rows = await sql`DELETE FROM nominations WHERE id = ${nominationId}::uuid RETURNING id`
  return rows.length > 0
}

export async function setMemberStatus(clerkUserId: string, status: 'active' | 'suspended'): Promise<void> {
  await sql`
    UPDATE user_profiles SET status = ${status}, updated_at = NOW()
    WHERE clerk_user_id = ${clerkUserId} AND status != 'deleted'
  `
}
