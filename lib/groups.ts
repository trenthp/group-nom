/**
 * Groups Management for Group Nom
 *
 * Handles saved groups (friends lists) for recurring group sessions.
 * Users can create groups, add members, and start voting sessions with their groups.
 */

import { sql } from './db'
import { toPublicName } from './userProfile'

export interface Group {
  id: string
  ownerId: string
  name: string
  memberCount: number
  createdAt: Date
}

export interface GroupWithMembers extends Group {
  members: GroupMember[]
}

export interface GroupMember {
  clerkUserId: string
  displayName: string | null
  avatarUrl: string | null
  joinedAt: Date
}

/**
 * Create a new group
 */
/** Random, unreadable-by-design: the code is the only way in. */
function newInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O, 1/I/L
  const bytes = new Uint8Array(10)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => alphabet[b % alphabet.length]).join('')
}

export async function createGroup(
  ownerId: string,
  name: string
): Promise<Group> {
  const result = await sql`
    INSERT INTO groups (owner_id, name, invite_code)
    VALUES (${ownerId}, ${name}, ${newInviteCode()})
    RETURNING *
  `

  // Add owner as first member
  await sql`
    INSERT INTO group_members (group_id, clerk_user_id)
    VALUES (${result[0].id}, ${ownerId})
  `

  return {
    id: result[0].id,
    ownerId: result[0].owner_id,
    name: result[0].name,
    memberCount: 1,
    createdAt: result[0].created_at,
  }
}

/**
 * Get all groups owned by a user
 */
export async function getGroupsForUser(
  clerkUserId: string
): Promise<Group[]> {
  const results = await sql`
    SELECT
      g.id,
      g.owner_id,
      g.name,
      g.created_at,
      COUNT(gm.clerk_user_id) as member_count
    FROM groups g
    LEFT JOIN group_members gm ON g.id = gm.group_id
    WHERE g.owner_id = ${clerkUserId}
    GROUP BY g.id
    ORDER BY g.created_at DESC
  `

  return results.map(r => ({
    id: r.id,
    ownerId: r.owner_id,
    name: r.name,
    memberCount: Number(r.member_count),
    createdAt: r.created_at,
  }))
}

/**
 * Get a single group with members
 */
export async function getGroupWithMembers(
  groupId: string,
  clerkUserId: string
): Promise<GroupWithMembers | null> {
  // Verify user has access (is owner or member)
  const access = await sql`
    SELECT 1 FROM groups g
    LEFT JOIN group_members gm ON g.id = gm.group_id
    WHERE g.id = ${groupId}
    AND (g.owner_id = ${clerkUserId} OR gm.clerk_user_id = ${clerkUserId})
    LIMIT 1
  `

  if (access.length === 0) {
    return null
  }

  const groupResult = await sql`
    SELECT * FROM groups WHERE id = ${groupId}
  `

  if (groupResult.length === 0) {
    return null
  }

  const members = await sql`
    SELECT
      gm.clerk_user_id,
      gm.joined_at,
      up.display_name,
      up.avatar_url
    FROM group_members gm
    LEFT JOIN user_profiles up ON gm.clerk_user_id = up.clerk_user_id
    WHERE gm.group_id = ${groupId}
    ORDER BY gm.joined_at ASC
  `

  const group = groupResult[0]

  return {
    id: group.id,
    ownerId: group.owner_id,
    name: group.name,
    memberCount: members.length,
    createdAt: group.created_at,
    members: members.map(m => ({
      clerkUserId: m.clerk_user_id,
      displayName: toPublicName(m.display_name) ?? null,
      avatarUrl: m.avatar_url,
      joinedAt: m.joined_at,
    })),
  }
}

/**
 * Update group name
 */
export async function updateGroup(
  groupId: string,
  ownerId: string,
  updates: { name?: string }
): Promise<Group | null> {
  if (!updates.name) {
    return null
  }

  const result = await sql`
    UPDATE groups
    SET name = ${updates.name}
    WHERE id = ${groupId} AND owner_id = ${ownerId}
    RETURNING *
  `

  if (result.length === 0) {
    return null
  }

  const memberCount = await sql`
    SELECT COUNT(*) as count FROM group_members WHERE group_id = ${groupId}
  `

  return {
    id: result[0].id,
    ownerId: result[0].owner_id,
    name: result[0].name,
    memberCount: Number(memberCount[0]?.count || 0),
    createdAt: result[0].created_at,
  }
}

/**
 * Delete a group (owner only)
 */
export async function deleteGroup(
  groupId: string,
  ownerId: string
): Promise<boolean> {
  const result = await sql`
    DELETE FROM groups
    WHERE id = ${groupId} AND owner_id = ${ownerId}
    RETURNING id
  `

  return result.length > 0
}

/**
 * Add a member to a group
 */
export async function addMember(
  groupId: string,
  clerkUserId: string
): Promise<boolean> {
  try {
    await sql`
      INSERT INTO group_members (group_id, clerk_user_id)
      VALUES (${groupId}, ${clerkUserId})
      ON CONFLICT (group_id, clerk_user_id) DO NOTHING
    `
    return true
  } catch {
    return false
  }
}

/**
 * Remove a member from a group
 */
export async function removeMember(
  groupId: string,
  ownerId: string,
  memberUserId: string
): Promise<boolean> {
  // Prevent removing owner
  if (memberUserId === ownerId) {
    return false
  }

  // Verify requester is owner
  const isOwner = await sql`
    SELECT 1 FROM groups WHERE id = ${groupId} AND owner_id = ${ownerId}
  `

  if (isOwner.length === 0) {
    return false
  }

  const result = await sql`
    DELETE FROM group_members
    WHERE group_id = ${groupId} AND clerk_user_id = ${memberUserId}
    RETURNING group_id
  `

  return result.length > 0
}

/**
 * The stored invite code, owners only (security audit fix: codes are
 * random and stored, never derivable from the group id).
 */
export async function getInviteCode(groupId: string, ownerId: string): Promise<string | null> {
  const rows = await sql`
    SELECT invite_code FROM groups WHERE id = ${groupId} AND owner_id = ${ownerId}
  `
  return rows.length ? (rows[0].invite_code as string) : null
}

/**
 * Join a group via invite code
 */
export async function joinGroupByCode(
  inviteCode: string,
  clerkUserId: string
): Promise<Group | null> {
  const code = inviteCode.trim().toUpperCase()
  if (!/^[A-Z0-9]{6,32}$/.test(code)) {
    return null
  }

  const groupResult = await sql`
    SELECT * FROM groups WHERE invite_code = ${code}
  `

  if (groupResult.length === 0) {
    return null
  }
  const groupId = groupResult[0].id as string

  // Add member
  await addMember(groupId, clerkUserId)

  const memberCount = await sql`
    SELECT COUNT(*) as count FROM group_members WHERE group_id = ${groupId}
  `

  return {
    id: groupResult[0].id,
    ownerId: groupResult[0].owner_id,
    name: groupResult[0].name,
    memberCount: Number(memberCount[0]?.count || 0),
    createdAt: groupResult[0].created_at,
  }
}
