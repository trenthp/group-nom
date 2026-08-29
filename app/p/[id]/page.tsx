/**
 * /p/[id] — the public share page for a place.
 *
 * /restaurant/[id] is members-only, so shared links land here: a teaser
 * (name, town, how many locals love it) with real Open Graph metadata for
 * unfurls, and a door into the library. Aggregate only — no photo, no
 * quote, no member, by design.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPlaceTeaser, lovedByLine } from '@/lib/teaser'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const place = await getPlaceTeaser(id)
  if (!place) return { title: 'Group Nom' }
  const where = [place.city, place.state].filter(Boolean).join(', ')
  const title = `${place.name} · Group Nom`
  const description = `${lovedByLine(place.nominationCount)}${where ? ` in ${where}` : ''}. An ad-free, community-built list of the best local places.`
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function SharePage({ params }: PageProps) {
  const { id } = await params
  const place = await getPlaceTeaser(id)
  if (!place) notFound()

  const where = [place.city, place.state].filter(Boolean).join(', ')

  return (
    <div className="min-h-screen bg-surface-page flex items-center justify-center p-4">
      <main className="w-full max-w-md">
        <div className="bg-surface-card rounded-2xl p-6">
          <p className="text-xs uppercase tracking-wider text-brand mb-2">Group Nom</p>
          <h1 className="text-2xl font-bold text-white mb-1">{place.name}</h1>
          {where && <p className="text-white/50 text-sm mb-4">{where}</p>}
          <p className="text-white/90 text-lg mb-1">❤️ {lovedByLine(place.nominationCount)}</p>
          <p className="text-white/60 text-sm mb-6">
            {place.nominationCount > 0
              ? 'Their photos and why they love it are inside the library — a community-built list of the best local places, with no ads and no ratings.'
              : 'Group Nom is a community-built list of the best local places. Be the first to put this one on the shelf.'}
          </p>
          <div className="space-y-3">
            <Link
              href={`/sign-in?redirect_url=${encodeURIComponent(`/restaurant/${place.id}`)}`}
              className="block w-full text-center px-6 py-3 rounded-lg font-semibold bg-brand text-white hover:bg-brand-hover transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page"
            >
              Sign in to see why
            </Link>
            <Link
              href="/sign-up"
              className="block w-full text-center px-6 py-3 rounded-lg font-medium border border-white/20 text-white/70 hover:bg-white/5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              Join the community
            </Link>
          </div>
        </div>
        <p className="text-center text-white/30 text-xs mt-4">
          <Link href="/" className="hover:text-white/60">groupnom.com</Link>
        </p>
      </main>
    </div>
  )
}
