'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useUser, useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Footer from '@/components/Footer'
import SupportPage from '@/components/auth/SupportPage'

export default function HomePage() {
  const { isSignedIn, isLoaded, user } = useUser()

  // Show loading state briefly
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F97316] to-[#DC2626] flex items-center justify-center">
        <Image
          src="/logo_groupNom.svg"
          alt="Group Nom"
          width={64}
          height={64}
          className="animate-pulse"
        />
      </div>
    )
  }

  // Authenticated users see the dashboard
  if (isSignedIn) {
    return <AuthenticatedDashboard userName={user?.firstName || 'there'} />
  }

  // Anonymous users see the landing page
  return <LandingPage />
}

// ============================================
// AUTHENTICATED DASHBOARD
// ============================================
function AuthenticatedDashboard({ userName }: { userName: string }) {
  const router = useRouter()
  const { signOut } = useClerk()
  const { user } = useUser()
  const [sessionCode, setSessionCode] = useState('')
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [joinError, setJoinError] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [stats, setStats] = useState<{ favorites: number } | null>(null)
  const [draftNudge, setDraftNudge] = useState<{ count: number; href: string } | null>(null)
  // null until known; the pre-unlock home leads with the first nomination
  const [isUnlocked, setIsUnlocked] = useState<boolean | null>(null)
  // Places loved by people you follow (empty until you follow someone)
  const [feed, setFeed] = useState<Array<{
    nominationId: string
    restaurant: { id: string; name: string; city?: string }
    photoUrl: string
    whyILoveIt: string
    member: { id: string; displayName?: string; avatarUrl?: string }
  }>>([])

  useEffect(() => {
    fetch('/api/feed?limit=6')
      .then(res => (res.ok ? res.json() : { items: [] }))
      .then(json => setFeed(json.items ?? []))
      .catch(() => { /* non-fatal */ })
  }, [])
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [showSupportModal, setShowSupportModal] = useState(false)

  // Fetch user stats
  useEffect(() => {
    async function fetchStats() {
      try {
        const [profileRes, draftsRes] = await Promise.all([
          fetch('/api/user/profile'),
          fetch('/api/nominations/drafts'),
        ])
        if (profileRes.ok) {
          const data = await profileRes.json()
          setStats({ favorites: data.stats?.favorites || 0 })
          if (typeof data.isUnlocked === 'boolean') setIsUnlocked(data.isUnlocked)
          // A draft waiting is the daily reason to come back
          if (draftsRes.ok && data.profile?.id) {
            const { drafts } = await draftsRes.json()
            if (Array.isArray(drafts) && drafts.length > 0) {
              setDraftNudge({ count: drafts.length, href: `/member/${data.profile.id}` })
            }
          }
        }
      } catch {
        // Non-fatal
      }
    }
    fetchStats()
  }, [])

  const joinSession = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = sessionCode.trim().toUpperCase()
    if (!code) return

    setJoinError('')
    setIsJoining(true)

    try {
      const response = await fetch(`/api/session/${code}/status`)
      if (response.status === 404) {
        setJoinError('Group not found')
        setIsJoining(false)
        return
      }
      if (!response.ok) {
        setJoinError('Something went wrong')
        setIsJoining(false)
        return
      }
      router.push(`/session/${code}`)
    } catch {
      setJoinError('Connection failed')
      setIsJoining(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-page">
      {/* Header */}
      <header className="px-4 py-6">
        <div className="max-w-lg md:max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Image
              src="/logo_groupNom.svg"
              alt="Group Nom"
              width={44}
              height={44}
            />
            <div className="relative">
              <button
                onClick={() => setShowAccountMenu(!showAccountMenu)}
                className="flex items-center gap-2 bg-surface-card hover:bg-surface-card-hover rounded-full pl-3 pr-2 py-1.5 transition cursor-pointer"
              >
                <span className="text-white/70 text-sm font-medium">Account</span>
                {user?.imageUrl ? (
                  <img
                    src={user.imageUrl}
                    alt=""
                    className="w-7 h-7 rounded-full"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center text-white text-xs font-bold">
                    {userName[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </button>

              {/* Account Dropdown Menu */}
              {showAccountMenu && (
                <>
                  {/* Backdrop to close menu */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowAccountMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-surface-card rounded-xl shadow-xl border border-white/10 z-50 overflow-hidden">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-white/10">
                      <p className="text-white font-medium truncate">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-white/50 text-sm truncate">
                        {user?.primaryEmailAddress?.emailAddress}
                      </p>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      <Link
                        href="/profile"
                        onClick={() => setShowAccountMenu(false)}
                        className="w-full px-4 py-2.5 text-left text-white/70 hover:bg-white/5 transition text-sm flex items-center gap-2"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        Your page
                      </Link>

                      <button
                        onClick={() => {
                          setShowAccountMenu(false)
                          setShowSupportModal(true)
                        }}
                        className="w-full px-4 py-2.5 text-left text-white/70 hover:bg-white/5 transition text-sm flex items-center gap-2"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        Feedback
                      </button>
                    </div>

                    {/* Sign Out */}
                    <div className="border-t border-white/10">
                      <button
                        onClick={() => signOut({ redirectUrl: '/' })}
                        className="w-full px-4 py-3 text-left text-red-400 hover:bg-white/5 transition text-sm font-medium"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          <h1 className="text-white text-2xl font-bold">
            Hey {userName}!
          </h1>
          <p className="text-white/60 text-sm mt-1">
            {isUnlocked === false
              ? 'Your first nomination opens the whole library.'
              : 'Ready to find something good?'}
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg md:max-w-3xl mx-auto px-4 pb-24">
        {/* Section: From people you follow */}
        {feed.length > 0 && (
          <div className="mb-4">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3 px-1">From people you follow</p>
            <ul className="space-y-2 md:space-y-0 md:grid md:grid-cols-2 md:gap-3 list-none p-0 m-0">
              {feed.map((item) => (
                <li key={item.nominationId}>
                  <Link
                    href={`/restaurant/${item.restaurant.id}`}
                    className="flex gap-3 bg-surface-card rounded-2xl p-3 hover:bg-surface-card-hover transition group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.photoUrl} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                    <div className="min-w-0">
                      <p className="text-white font-semibold truncate group-hover:text-orange-300 transition">{item.restaurant.name}</p>
                      <p className="text-white/70 text-sm italic line-clamp-1">&ldquo;{item.whyILoveIt}&rdquo;</p>
                      <p className="text-white/40 text-xs mt-0.5">
                        {item.member.displayName ?? 'A community member'}{item.restaurant.city ? ` · ${item.restaurant.city}` : ''}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Section: Community Library */}
        <div className="mb-4 md:grid md:grid-cols-2 md:gap-3">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-3 px-1 md:col-span-2 md:mb-0">Community</p>
          <Link
            href="/nominate"
            className="block bg-surface-card rounded-2xl p-5 mb-3 md:mb-0 hover:bg-surface-card-hover transition group border border-brand/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 bg-brand rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">
                  {isUnlocked === false ? 'Nominate your first place' : 'Nominate a place'}
                </h3>
                <p className="text-white/50 text-sm">
                  {isUnlocked === false
                    ? 'Somewhere local you’ve loved lately — a photo and why. Not lately? We’ll hold it while you go back.'
                    : 'Somewhere local you’ve loved lately'}
                </p>
              </div>
            </div>
          </Link>
          {draftNudge && (
            <Link
              href={draftNudge.href}
              className="block -mt-1 mb-3 px-1 text-sm text-orange-300 hover:text-orange-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded md:col-span-2 md:order-last md:mt-0 md:mb-0"
            >
              🔖 {draftNudge.count} draft{draftNudge.count === 1 ? '' : 's'} waiting for you →
            </Link>
          )}
          <Link
            href="/library"
            className="block bg-surface-card rounded-2xl p-5 hover:bg-surface-card-hover transition group"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">{isUnlocked === false ? "Today's Five" : 'The Library'}</h3>
                <p className="text-white/50 text-sm">
                  {isUnlocked === false
                    ? 'Five loved places near you, new every day'
                    : 'Places locals love, nominated by the community'}
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* Section: Around you — the map and your list */}
        <div className="mb-4">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-3 px-1">Around you</p>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/discover"
              className="bg-surface-card rounded-2xl p-5 hover:bg-surface-card-hover transition group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <div className="w-11 h-11 bg-white/10 rounded-xl flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88" fill="currentColor" />
                </svg>
              </div>
              <h3 className="font-bold text-white text-lg">Discover</h3>
              <p className="text-white/50 text-sm">Browse the map, save what looks good</p>
            </Link>

            <Link
              href="/to-try"
              className="bg-surface-card rounded-2xl p-5 hover:bg-surface-card-hover transition group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <div className="w-11 h-11 bg-white/10 rounded-xl flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </div>
              <h3 className="font-bold text-white text-lg">To try</h3>
              <p className="text-white/50 text-sm">
                {stats ? `${stats.favorites} place${stats.favorites !== 1 ? 's' : ''} to get to` : 'Places to get to'}
              </p>
            </Link>
          </div>
        </div>

        {/* Section: Sessions */}
        <div className="mb-6">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-3 px-1">With friends</p>
          <div className="grid grid-cols-2 gap-3">
            {/* Start a session */}
            <Link
              href="/setup"
              className="bg-surface-card rounded-2xl p-5 hover:bg-surface-card-hover transition group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <div className="w-11 h-11 bg-white/10 rounded-xl flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="font-bold text-white text-lg">Start a session</h3>
              <p className="text-white/50 text-sm">Vote on where to eat</p>
            </Link>

            {/* Join a session */}
            <div
              className="bg-surface-card rounded-2xl p-5 hover:bg-surface-card-hover transition cursor-pointer"
              onClick={() => !showJoinForm && setShowJoinForm(true)}
            >
              {!showJoinForm ? (
                <>
                  <div className="w-11 h-11 bg-white/10 rounded-xl flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-white text-lg">Join a session</h3>
                  <p className="text-white/50 text-sm">Enter a code</p>
                </>
              ) : (
                <form onSubmit={joinSession} className="space-y-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    placeholder="ABC123"
                    value={sessionCode}
                    onChange={(e) => {
                      setSessionCode(e.target.value.toUpperCase())
                      setJoinError('')
                    }}
                    className="w-full px-3 py-2.5 rounded-xl text-center text-lg font-mono font-bold tracking-[0.15em] bg-[#222] text-white border border-white/20 focus:border-brand focus:outline-none transition"
                    maxLength={6}
                    autoFocus
                    disabled={isJoining}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowJoinForm(false)
                        setSessionCode('')
                        setJoinError('')
                      }}
                      className="flex-1 py-2 text-white/50 text-sm rounded-lg hover:text-white transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isJoining || sessionCode.length < 6}
                      className="flex-1 py-2 bg-brand text-white font-bold text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-hover transition"
                    >
                      {isJoining ? '...' : 'Join'}
                    </button>
                  </div>
                  {joinError && (
                    <p className="text-red-400 text-xs text-center">{joinError}</p>
                  )}
                </form>
              )}
            </div>
          </div>
          <Link
            href="/groups"
            className="block mt-3 px-1 text-sm text-white/50 hover:text-white/80 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
          >
            Your groups — saved rosters for the people you eat with →
          </Link>
        </div>

        <Footer />
      </main>

      {/* Feedback Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSupportModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <button
              onClick={() => setShowSupportModal(false)}
              className="absolute top-3 right-3 z-10 p-1.5 text-gray-400 hover:text-gray-600 transition"
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            <SupportPage onClose={() => setShowSupportModal(false)} />
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// LANDING PAGE (signed-out visitors — the "tease" rung)
// ============================================
function LandingPage() {
  const router = useRouter()
  const [sessionCode, setSessionCode] = useState('')
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [isSpinning, setIsSpinning] = useState(false)
  const [joinError, setJoinError] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  // Teased aggregate: a count near the visitor, never a name or a photo
  const [tease, setTease] = useState<{ count: number; city: string | null; scope: 'nearby' | 'everywhere' } | null>(null)

  useEffect(() => {
    fetch('/api/tease')
      .then(res => (res.ok ? res.json() : null))
      .then(json => json && setTease(json))
      .catch(() => { /* the hero reads fine without it */ })
  }, [])

  // Trigger hero logo spin animation once on page load
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSpinning(true)
      setTimeout(() => setIsSpinning(false), 1200)
    }, 300)
    return () => clearTimeout(timer)
  }, [])

  const handleLogoTap = () => {
    if (!isSpinning) {
      setIsSpinning(true)
      setTimeout(() => setIsSpinning(false), 1200)
    }
  }

  const joinSession = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = sessionCode.trim().toUpperCase()
    if (!code) return

    setJoinError('')
    setIsJoining(true)

    try {
      const response = await fetch(`/api/session/${code}/status`)
      if (response.status === 404) {
        setJoinError('Session not found. Check the code.')
        setIsJoining(false)
        return
      }
      if (!response.ok) {
        setJoinError('Something went wrong. Try again.')
        setIsJoining(false)
        return
      }
      router.push(`/session/${code}`)
    } catch {
      setJoinError('Connection failed. Try again.')
      setIsJoining(false)
    }
  }

  const teaseLine = (() => {
    if (!tease) return null
    if (tease.scope === 'nearby' && tease.city) {
      return tease.count > 0
        ? `${tease.count} place${tease.count === 1 ? '' : 's'} loved near ${tease.city}`
        : `Nobody has lit up ${tease.city} yet. Be the first.`
    }
    return tease.count > 0
      ? `${tease.count} place${tease.count === 1 ? '' : 's'} loved by members so far`
      : null
  })()

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F97316] to-[#DC2626]">
      {/* Header */}
      <header className="w-full px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo_groupNom.svg"
            alt=""
            width={32}
            height={32}
            className="rounded-lg"
          />
          <span className="text-white font-bold text-lg">Group Nom</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/sign-in"
            className="text-white/90 text-sm font-medium hover:text-white transition"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="bg-white/20 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-white/30 transition"
          >
            Join
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="flex items-center justify-center p-4 pb-10">
        <div className="w-full max-w-sm text-center">
          <div className="mb-8">
            <div className="relative w-40 h-40 mx-auto mb-5">
              <svg
                className={`absolute inset-0 w-full h-full ${isSpinning ? 'spin-once-reverse' : ''}`}
                viewBox="0 0 200 200"
                aria-hidden="true"
              >
                <defs>
                  <path
                    id="circlePath"
                    d="M 100, 100 m -75, 0 a 75,75 0 1,1 150,0 a 75,75 0 1,1 -150,0"
                    fill="none"
                  />
                </defs>
                <text className="fill-white font-bold" style={{ fontFamily: "'Alan Sans', sans-serif", fontSize: '22px', letterSpacing: '0.06em' }}>
                  <textPath href="#circlePath" startOffset="0%">
                    Group Nom • Group Nom • Group Nom •{' '}
                  </textPath>
                </text>
              </svg>
              <Image
                src="/logo_groupNom.svg"
                alt="Group Nom"
                width={90}
                height={90}
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer drop-shadow-lg ${isSpinning ? 'spin-once' : ''}`}
                onClick={handleLogoTap}
              />
            </div>

            <h1 className="text-white text-3xl font-extrabold mb-3 leading-tight">
              The places your neighbors actually love.
            </h1>
            <p className="text-white/85 text-base">
              A community library of local restaurants. No ads, no ratings, no reviews.
              Just people nominating what they love.
            </p>
          </div>

          {teaseLine && (
            <p className="text-white font-semibold text-sm mb-5 bg-white/15 rounded-pill px-4 py-2 inline-block" aria-live="polite">
              ❤️ {teaseLine}
            </p>
          )}

          <div className="space-y-3 mb-4">
            <Link
              href="/sign-up"
              className="block w-full bg-white text-brand font-bold text-lg py-4 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-orange-500"
            >
              Join the library
            </Link>
            <p className="text-white/70 text-sm">
              Free. Your first nomination opens everything.
            </p>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-[#1a1a1a] py-12 px-4">
        <div className="max-w-sm mx-auto">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-6 text-center">How it works</p>
          <ol className="space-y-5 list-none p-0 m-0">
            {[
              {
                n: 1,
                title: 'Nominate one place you love',
                body: 'A photo and why. That’s the whole form. Only places you’ve actually been.',
              },
              {
                n: 2,
                title: 'The library opens',
                body: 'Every place someone near you loves, on a map, with their photos and their reasons.',
              },
              {
                n: 3,
                title: 'Decide together',
                body: 'Start a session, share a code, everyone swipes the same deck. Matches win.',
              },
            ].map((step) => (
              <li key={step.n} className="flex gap-4">
                <div className="w-9 h-9 rounded-full bg-brand text-white font-bold flex items-center justify-center shrink-0" aria-hidden="true">
                  {step.n}
                </div>
                <div>
                  <h2 className="text-white font-semibold">{step.title}</h2>
                  <p className="text-white/60 text-sm">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Positive-only */}
      <div className="bg-surface-page pt-10 pb-8 px-4">
        <div className="max-w-sm mx-auto">
          <h2 className="text-white text-xl font-bold text-center mb-2">
            No stars. No one-star rants.
          </h2>
          <p className="text-white/50 text-sm text-center mb-8">
            The only thing a place can collect here is love.
          </p>

          <div className="space-y-3 mb-8">
            {[
              {
                title: 'Nominations, not reviews',
                body: 'Members put places on the shelf. Nobody takes them down with a paragraph.',
              },
              {
                title: 'Places that fade just fade',
                body: 'If somewhere isn’t good anymore, it quietly stops being surfaced. No pile-on.',
              },
              {
                title: 'No follower counts, ever',
                body: 'Ranking people by influence is the same disease as star ratings. We don’t.',
              },
              {
                title: 'Your own data',
                body: 'Built on open map data and what members add. Nothing bought, nothing sold.',
              },
            ].map((item) => (
              <div key={item.title} className="bg-[#2a2a2a] rounded-xl p-4">
                <h3 className="text-white font-semibold">{item.title}</h3>
                <p className="text-white/50 text-sm">{item.body}</p>
              </div>
            ))}
          </div>

          {/* Sessions — the second act */}
          <div className="bg-[#2a2a2a] rounded-xl p-4 mb-8">
            <h3 className="text-white font-semibold mb-1">Got a session code?</h3>
            <p className="text-white/50 text-sm mb-3">
              Someone started a vote on where to eat. Sign in and the code drops you straight in.
            </p>
            {!showJoinForm ? (
              <button
                onClick={() => setShowJoinForm(true)}
                className="text-brand font-semibold text-sm hover:text-orange-400 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
              >
                Enter a code →
              </button>
            ) : (
              <form onSubmit={joinSession} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="ABC123"
                    aria-label="Session code"
                    value={sessionCode}
                    onChange={(e) => {
                      setSessionCode(e.target.value.toUpperCase())
                      setJoinError('')
                    }}
                    className="flex-1 px-4 py-3 rounded-xl text-center text-lg font-mono font-bold tracking-[0.2em] bg-[#222] text-white placeholder-white/30 border border-white/20 focus:border-brand focus:outline-none transition"
                    maxLength={6}
                    autoFocus
                    disabled={isJoining}
                  />
                  <button
                    type="submit"
                    disabled={isJoining || sessionCode.length < 6}
                    className="px-5 py-3 bg-brand text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-hover transition"
                  >
                    {isJoining ? '...' : 'Go'}
                  </button>
                </div>
                {joinError && (
                  <p className="text-red-400 text-sm" role="alert">{joinError}</p>
                )}
              </form>
            )}
          </div>

          <Link
            href="/sign-up"
            className="block w-full bg-brand text-white font-bold text-lg py-4 rounded-2xl text-center hover:bg-brand-hover hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page"
          >
            Join the library
          </Link>
          <p className="text-center mt-3 text-sm text-white/50">
            <Link href="/about" className="hover:text-white/80 underline underline-offset-2">Why we built it</Link>
          </p>

          <Footer />
        </div>
      </div>
    </div>
  )
}
