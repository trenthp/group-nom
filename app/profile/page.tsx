import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { ensureProfile } from '@/lib/userProfile'

/**
 * /profile — the Profile tab. Resolves the signed-in member's opaque
 * profile id and lands on their own member page (self mode). Middleware
 * already requires sign-in for this route.
 */
export default async function ProfilePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in?redirect_url=/profile')

  const profile = await ensureProfile(userId)
  redirect(`/member/${profile.id}`)
}
