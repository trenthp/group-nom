/**
 * Moderator role. Lives in Clerk `publicMetadata.role` — set in the Clerk
 * Dashboard on the user, never a column a client could write. Checked
 * server-side on every admin action.
 */

import { auth, clerkClient } from '@clerk/nextjs/server'

export type Role = 'admin' | 'moderator'

export async function getRole(userId: string): Promise<Role | null> {
  try {
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    const role = (user.publicMetadata as { role?: unknown } | undefined)?.role
    return role === 'admin' || role === 'moderator' ? role : null
  } catch {
    return null
  }
}

/** Returns the moderator's userId, or null when the requester isn't one. */
export async function requireModerator(): Promise<string | null> {
  const { userId } = await auth()
  if (!userId) return null
  const role = await getRole(userId)
  return role ? userId : null
}
