/**
 * Private nomination drafts (decided Aug 2026).
 *
 * A draft is intent: "I'll nominate this after I go back" (revisit),
 * "tomorrow, when my daily slot reopens" (limit), or just "later". Drafts
 * are private, unlimited, one per member + place, and carry no photo —
 * the photo is taken at publish. Drafts + the daily limit together are
 * the daily return loop.
 */

import { sql } from './db'

export type DraftReason = 'revisit' | 'later' | 'limit'

export interface NominationDraft {
  id: string
  gersId: string
  whyILoveIt: string | null
  myFavoriteDishes: string[]
  reason: DraftReason
  createdAt: Date
  updatedAt: Date
  restaurant?: {
    name: string
    city?: string
    address?: string
  }
}

function serialize(row: Record<string, unknown>): NominationDraft {
  return {
    id: row.id as string,
    gersId: row.gers_id as string,
    whyILoveIt: (row.why_i_love_it as string | null) ?? null,
    myFavoriteDishes: (row.my_favorite_dishes as string[] | null) ?? [],
    reason: (row.reason as DraftReason) ?? 'later',
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
    restaurant: row.restaurant_name !== undefined ? {
      name: row.restaurant_name as string,
      city: (row.restaurant_city as string | null) ?? undefined,
      address: (row.restaurant_address as string | null) ?? undefined,
    } : undefined,
  }
}

/** Create or update the member's draft for a place. */
export async function upsertDraft(
  clerkUserId: string,
  gersId: string,
  fields: { whyILoveIt?: string | null; myFavoriteDishes?: string[]; reason?: DraftReason }
): Promise<NominationDraft> {
  const rows = await sql`
    INSERT INTO nomination_drafts (clerk_user_id, gers_id, why_i_love_it, my_favorite_dishes, reason)
    VALUES (
      ${clerkUserId}, ${gersId},
      ${fields.whyILoveIt ?? null},
      ${fields.myFavoriteDishes ?? []}::text[],
      ${fields.reason ?? 'later'}
    )
    ON CONFLICT (clerk_user_id, gers_id) DO UPDATE SET
      why_i_love_it = COALESCE(EXCLUDED.why_i_love_it, nomination_drafts.why_i_love_it),
      my_favorite_dishes = CASE
        WHEN array_length(EXCLUDED.my_favorite_dishes, 1) IS NULL THEN nomination_drafts.my_favorite_dishes
        ELSE EXCLUDED.my_favorite_dishes END,
      reason = EXCLUDED.reason,
      updated_at = NOW()
    RETURNING *
  `
  return serialize(rows[0])
}

export async function getDraft(clerkUserId: string, gersId: string): Promise<NominationDraft | null> {
  const rows = await sql`
    SELECT d.*, r.name AS restaurant_name, r.city AS restaurant_city, r.address AS restaurant_address
    FROM nomination_drafts d
    LEFT JOIN restaurants r ON r.gers_id = d.gers_id
    WHERE d.clerk_user_id = ${clerkUserId} AND d.gers_id = ${gersId}
  `
  return rows.length ? serialize(rows[0]) : null
}

export async function listDrafts(clerkUserId: string, limit = 50): Promise<NominationDraft[]> {
  const rows = await sql`
    SELECT d.*, r.name AS restaurant_name, r.city AS restaurant_city, r.address AS restaurant_address
    FROM nomination_drafts d
    LEFT JOIN restaurants r ON r.gers_id = d.gers_id
    WHERE d.clerk_user_id = ${clerkUserId}
    ORDER BY d.updated_at DESC
    LIMIT ${limit}
  `
  return rows.map(serialize)
}

export async function deleteDraft(clerkUserId: string, gersId: string): Promise<boolean> {
  const rows = await sql`
    DELETE FROM nomination_drafts
    WHERE clerk_user_id = ${clerkUserId} AND gers_id = ${gersId}
    RETURNING id
  `
  return rows.length > 0
}

export async function countDrafts(clerkUserId: string): Promise<number> {
  const rows = await sql`
    SELECT COUNT(*)::int AS count FROM nomination_drafts WHERE clerk_user_id = ${clerkUserId}
  `
  return (rows[0]?.count as number) ?? 0
}
