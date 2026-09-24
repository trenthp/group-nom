/**
 * Follows and blocks (Phase 3, decided Aug 2026).
 *
 * Following someone puts the places they love in your home feed. That's
 * the whole deal — no follower counts, no lists, no notifications to the
 * followed member. Blocking hides you from each other: your page 404s
 * for them, their places leave your feed, and neither can follow the
 * other.
 */

import { sql } from './db'
import { publicNameFor } from './userProfile'
import { recomputeTrust } from './trust'

export interface Relationship {
  following: boolean
  blocked: boolean
}

export async function getRelationship(viewerId: string, memberId: string): Promise<Relationship> {
  const rows = await sql`
    SELECT
      EXISTS (SELECT 1 FROM follows WHERE follower_id = ${viewerId} AND followee_id = ${memberId}) AS following,
      EXISTS (SELECT 1 FROM blocks WHERE blocker_id = ${viewerId} AND blocked_id = ${memberId}) AS blocked
  `
  return { following: !!rows[0]?.following, blocked: !!rows[0]?.blocked }
}

/** True when either side has blocked the other. */
export async function isBlockedEitherWay(a: string, b: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM blocks
    WHERE (blocker_id = ${a} AND blocked_id = ${b}) OR (blocker_id = ${b} AND blocked_id = ${a})
    LIMIT 1
  `
  return rows.length > 0
}

export async function follow(followerId: string, followeeId: string): Promise<boolean> {
  if (followerId === followeeId) return false
  if (await isBlockedEitherWay(followerId, followeeId)) return false
  await sql`
    INSERT INTO follows (follower_id, followee_id)
    VALUES (${followerId}, ${followeeId})
    ON CONFLICT DO NOTHING
  `
  recomputeTrust(followeeId) // followers are an internal trust input
  return true
}

export async function unfollow(followerId: string, followeeId: string): Promise<void> {
  await sql`DELETE FROM follows WHERE follower_id = ${followerId} AND followee_id = ${followeeId}`
  recomputeTrust(followeeId)
}

/** Blocking severs follows in both directions. */
export async function block(blockerId: string, blockedId: string): Promise<void> {
  if (blockerId === blockedId) return
  await sql`
    INSERT INTO blocks (blocker_id, blocked_id)
    VALUES (${blockerId}, ${blockedId})
    ON CONFLICT DO NOTHING
  `
  await sql`
    DELETE FROM follows
    WHERE (follower_id = ${blockerId} AND followee_id = ${blockedId})
       OR (follower_id = ${blockedId} AND followee_id = ${blockerId})
  `
  recomputeTrust(blockerId)
  recomputeTrust(blockedId)
}

export async function unblock(blockerId: string, blockedId: string): Promise<void> {
  await sql`DELETE FROM blocks WHERE blocker_id = ${blockerId} AND blocked_id = ${blockedId}`
}

export interface FeedItem {
  nominationId: string
  restaurant: { id: string; name: string; city?: string }
  photoUrl: string
  whyILoveIt: string
  myFavoriteDishes: string[]
  createdAt: Date
  member: { id: string; displayName?: string; avatarUrl?: string }
}

/**
 * Places loved by people you follow, newest first. Deleted and blocked
 * members never appear; nothing here is counted or ranked.
 */
export async function getFeed(userId: string, limit = 20): Promise<FeedItem[]> {
  const rows = await sql`
    SELECT
      n.id, n.gers_id, n.photo_url, n.why_i_love_it, n.my_favorite_dishes, n.created_at,
      r.name AS restaurant_name, r.city AS restaurant_city,
      up.id AS profile_id, up.display_name, up.avatar_url, up.status AS profile_status
    FROM follows f
    JOIN nominations n ON n.clerk_user_id = f.followee_id
    JOIN restaurants r ON r.gers_id = n.gers_id
    JOIN user_profiles up ON up.clerk_user_id = f.followee_id
    WHERE f.follower_id = ${userId}
      AND up.status = 'active'
      AND r.hidden_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM blocks b
        WHERE (b.blocker_id = ${userId} AND b.blocked_id = f.followee_id)
           OR (b.blocker_id = f.followee_id AND b.blocked_id = ${userId})
      )
    ORDER BY n.created_at DESC
    LIMIT ${limit}
  `
  return rows.map(row => ({
    nominationId: row.id as string,
    restaurant: {
      id: row.gers_id as string,
      name: row.restaurant_name as string,
      city: (row.restaurant_city as string | null) ?? undefined,
    },
    photoUrl: row.photo_url as string,
    whyILoveIt: row.why_i_love_it as string,
    myFavoriteDishes: (row.my_favorite_dishes as string[] | null) ?? [],
    createdAt: row.created_at as Date,
    member: {
      id: row.profile_id as string,
      displayName: publicNameFor(row.display_name as string | null, row.profile_status as string),
      avatarUrl: (row.avatar_url as string | null) ?? undefined,
    },
  }))
}
