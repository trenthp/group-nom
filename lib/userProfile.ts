/**
 * User Profile Management for Group Nom
 *
 * Identity is Clerk; this table is what the community layer knows about a
 * member. Membership ladder (Aug 2026): a profile "unlocks" the full library
 * after its first nomination, derived from nomination_count > 0 — never a
 * separate flag.
 */

import { sql } from './db'

export type ProfileStatus = 'active' | 'suspended' | 'deleted'

/** Attribution shown for members who deleted their account (nominations stay). */
export const FORMER_MEMBER_NAME = 'A former member'

/**
 * Public attribution rule (Aug 2026): members are shown as first name +
 * last initial ("Trent P.") on all community surfaces. Apply this at every
 * read boundary that returns a member's name to other users; the stored
 * display_name keeps the full name for the member's own settings.
 */
export function toPublicName(name: string | null | undefined): string | undefined {
  if (!name) return undefined
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`
}

/**
 * Attribution that also handles deleted accounts. Use this wherever a
 * profile's status is available in the row; fall back to toPublicName when
 * it isn't.
 */
export function publicNameFor(
  name: string | null | undefined,
  status: string | null | undefined
): string | undefined {
  if (status === 'deleted') return FORMER_MEMBER_NAME
  return toPublicName(name)
}

export interface UserProfile {
  id: string
  clerkUserId: string
  displayName: string | null
  avatarUrl: string | null
  likeCount: number
  nominationCount: number
  enrichmentCount: number
  timezone: string | null
  status: ProfileStatus
  lastActiveAt: Date | null
  createdAt: Date
}

/** Derived ladder state — the only unlock signal in the system. */
export function isUnlocked(profile: Pick<UserProfile, 'nominationCount'>): boolean {
  return profile.nominationCount > 0
}

/** Suspended and deleted members are read-only. */
export function canPublish(profile: Pick<UserProfile, 'status'>): boolean {
  return profile.status === 'active'
}

/**
 * The public shape of a member, as seen by other members. Never carries the
 * Clerk id, counts of followers, trust, or anything rankable.
 */
export interface PublicMember {
  id: string
  displayName?: string
  avatarUrl?: string
}

export function toPublicMember(profile: UserProfile): PublicMember {
  return {
    id: profile.id,
    displayName: publicNameFor(profile.displayName, profile.status),
    avatarUrl: profile.avatarUrl ?? undefined,
  }
}

/**
 * Guarantee a profile row exists for a Clerk user. Call this at the top of
 * every mutating path (nominate, enrich, host, join) — the nomination count
 * triggers UPDATE this table and silently no-op if the row is missing, which
 * would leave a member permanently locked out.
 */
export async function ensureProfile(clerkUserId: string): Promise<UserProfile> {
  const rows = await sql`
    INSERT INTO user_profiles (clerk_user_id, last_active_at)
    VALUES (${clerkUserId}, NOW())
    ON CONFLICT (clerk_user_id) DO UPDATE
      SET last_active_at = NOW()
    RETURNING *
  `
  return mapDbToProfile(rows[0])
}

/**
 * Get or create a user profile
 * Optionally sync display name and avatar from Clerk
 */
export async function getOrCreateProfile(
  clerkUserId: string,
  clerkData?: { displayName?: string; avatarUrl?: string }
): Promise<UserProfile> {
  const profile = await ensureProfile(clerkUserId)

  // Fill in name/avatar from Clerk when we have nothing yet; ongoing changes
  // arrive via the Clerk webhook (syncProfileFromClerk).
  if (profile.status === 'active' && !profile.displayName && clerkData?.displayName) {
    return syncProfileFromClerk(clerkUserId, clerkData)
  }

  return profile
}

/**
 * Overwrite name/avatar with what Clerk currently has. Used by the
 * user.created / user.updated webhook so attribution never goes stale.
 * No-ops for deleted profiles so a late webhook can't un-anonymize someone.
 */
export async function syncProfileFromClerk(
  clerkUserId: string,
  clerkData: { displayName?: string; avatarUrl?: string }
): Promise<UserProfile> {
  const rows = await sql`
    INSERT INTO user_profiles (clerk_user_id, display_name, avatar_url)
    VALUES (${clerkUserId}, ${clerkData.displayName ?? null}, ${clerkData.avatarUrl ?? null})
    ON CONFLICT (clerk_user_id) DO UPDATE
      SET display_name = CASE WHEN user_profiles.status = 'deleted' THEN user_profiles.display_name ELSE EXCLUDED.display_name END,
          avatar_url   = CASE WHEN user_profiles.status = 'deleted' THEN user_profiles.avatar_url   ELSE EXCLUDED.avatar_url END,
          updated_at   = NOW()
    RETURNING *
  `
  return mapDbToProfile(rows[0])
}

/**
 * Account deletion policy (decided Aug 27, 2026): nominations, photos and
 * enrichments stay, attributed to "a former member"; private data goes.
 */
export async function anonymizeProfile(clerkUserId: string): Promise<void> {
  await sql`SELECT anonymize_member(${clerkUserId})`
}

/**
 * Get user profile by Clerk user ID
 */
export async function getProfile(clerkUserId: string): Promise<UserProfile | null> {
  const result = await sql`
    SELECT * FROM user_profiles
    WHERE clerk_user_id = ${clerkUserId}
  `

  if (result.length === 0) {
    return null
  }

  return mapDbToProfile(result[0])
}

/**
 * Get a profile by its opaque public id (member pages). Deleted members are
 * treated as not found — no residue of the identity anywhere.
 */
export async function getProfileById(id: string): Promise<UserProfile | null> {
  const result = await sql`
    SELECT * FROM user_profiles
    WHERE id = ${id}::uuid AND status != 'deleted'
  `

  if (result.length === 0) {
    return null
  }

  return mapDbToProfile(result[0])
}

/**
 * Update user profile
 */
export async function updateProfile(
  clerkUserId: string,
  updates: {
    displayName?: string
    avatarUrl?: string
    timezone?: string
  }
): Promise<UserProfile | null> {
  const result = await sql`
    UPDATE user_profiles
    SET
      display_name = COALESCE(${updates.displayName ?? null}, display_name),
      avatar_url = COALESCE(${updates.avatarUrl ?? null}, avatar_url),
      timezone = COALESCE(${updates.timezone ?? null}, timezone),
      updated_at = NOW()
    WHERE clerk_user_id = ${clerkUserId}
    RETURNING *
  `

  if (result.length === 0) {
    return null
  }

  return mapDbToProfile(result[0])
}

/**
 * Get user stats
 */
export async function getUserStats(clerkUserId: string): Promise<{
  likes: number
  nominations: number
  favorites: number
}> {
  const profile = await sql`
    SELECT like_count, nomination_count FROM user_profiles
    WHERE clerk_user_id = ${clerkUserId}
  `

  const favorites = await sql`
    SELECT COUNT(*) as count FROM user_favorites
    WHERE clerk_user_id = ${clerkUserId}
  `

  return {
    likes: profile.length > 0 ? profile[0].like_count : 0,
    nominations: profile.length > 0 ? profile[0].nomination_count : 0,
    favorites: favorites.length > 0 ? Number(favorites[0].count) : 0,
  }
}

/**
 * Increment a user's enrichment contribution count
 */
export async function incrementEnrichmentCount(clerkUserId: string): Promise<void> {
  await sql`
    UPDATE user_profiles
    SET enrichment_count = COALESCE(enrichment_count, 0) + 1
    WHERE clerk_user_id = ${clerkUserId}
  `
}

// Helper to map database record to profile interface
function mapDbToProfile(db: Record<string, unknown>): UserProfile {
  return {
    id: db.id as string,
    clerkUserId: db.clerk_user_id as string,
    displayName: (db.display_name as string | null) ?? null,
    avatarUrl: (db.avatar_url as string | null) ?? null,
    likeCount: (db.like_count as number) ?? 0,
    nominationCount: (db.nomination_count as number) ?? 0,
    enrichmentCount: (db.enrichment_count as number) ?? 0,
    timezone: (db.timezone as string | null) ?? null,
    status: ((db.status as ProfileStatus | undefined) ?? 'active'),
    lastActiveAt: (db.last_active_at as Date | null) ?? null,
    createdAt: db.created_at as Date,
  }
}
