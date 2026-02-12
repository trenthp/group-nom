'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useUser, useClerk } from '@clerk/nextjs'
import Footer from '@/components/Footer'
import SupportPage from '@/components/auth/SupportPage'
import { USER_TIERS } from '@/lib/userTiers'

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
  const { signOut } = useClerk()
  const { user } = useUser()
  const [sessionCode, setSessionCode] = useState('')
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [joinError, setJoinError] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [stats, setStats] = useState<{ likes: number; favorites: number } | null>(null)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [showSupportModal, setShowSupportModal] = useState(false)

  const authLimit = USER_TIERS.authenticated.maxRestaurantsPerSession

  // Fetch user stats
  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/user/profile')
        if (response.ok) {
          const data = await response.json()
          setStats({
            likes: data.stats?.likes || 0,
            favorites: data.stats?.favorites || 0,
          })
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
      window.location.href = `/session/${code}`
    } catch {
      setJoinError('Connection failed')
      setIsJoining(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#222222]">
      {/* Header */}
      <header className="px-4 py-6">
        <div className="max-w-lg mx-auto">
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
                className="flex items-center gap-2 bg-[#333333] hover:bg-[#3a3a3a] rounded-full pl-3 pr-2 py-1.5 transition cursor-pointer"
              >
                <span className="text-white/70 text-sm font-medium">Account</span>
                {user?.imageUrl ? (
                  <img
                    src={user.imageUrl}
                    alt=""
                    className="w-7 h-7 rounded-full"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#EA4D19] flex items-center justify-center text-white text-xs font-bold">
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
                  <div className="absolute right-0 top-full mt-2 w-56 bg-[#333333] rounded-xl shadow-xl border border-white/10 z-50 overflow-hidden">
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
                      {/* Stats */}
                      {stats && (
                        <div className="px-4 py-2 text-white/50 text-sm">
                          {stats.likes} swipes · {stats.favorites} saved
                        </div>
                      )}

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
            Ready to find something good?
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 pb-24">
        {/* Section 1: Discover & Saved */}
        <div className="mb-4">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-3 px-1">Solo</p>
          <div className="grid grid-cols-2 gap-3">
            {/* Discover Card */}
            <Link
              href="/discover"
              className="bg-gradient-to-br from-[#F97316] to-[#DC2626] rounded-2xl p-5 hover:scale-[1.02] active:scale-[0.98] transition group"
            >
              <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88" fill="currentColor" />
                </svg>
              </div>
              <h3 className="font-bold text-white text-lg">Discover</h3>
              <p className="text-white/70 text-sm">Find new spots</p>
            </Link>

            {/* Saved Card */}
            <Link
              href="/saved"
              className="bg-[#333333] rounded-2xl p-5 hover:bg-[#3a3a3a] transition group"
            >
              <div className="w-11 h-11 bg-white/10 rounded-xl flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-[#EA4D19]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-white text-lg">Saved</h3>
              <p className="text-white/50 text-sm">
                {stats ? `${stats.favorites} favorite${stats.favorites !== 1 ? 's' : ''}` : 'Your favorites'}
              </p>
            </Link>
          </div>
        </div>

        {/* Section 2: Groups */}
        <div className="mb-6">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-3 px-1">With Friends</p>
          <div className="grid grid-cols-2 gap-3">
            {/* Start Group Card */}
            <Link
              href="/setup"
              className="bg-[#333333] rounded-2xl p-5 hover:bg-[#3a3a3a] transition group"
            >
              <div className="w-11 h-11 bg-white/10 rounded-xl flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-[#EA4D19]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="font-bold text-white text-lg">Start Group</h3>
              <p className="text-white/50 text-sm">{authLimit} restaurants</p>
            </Link>

            {/* Join Group Card */}
            <div
              className="bg-[#333333] rounded-2xl p-5 hover:bg-[#3a3a3a] transition cursor-pointer"
              onClick={() => !showJoinForm && setShowJoinForm(true)}
            >
              {!showJoinForm ? (
                <>
                  <div className="w-11 h-11 bg-white/10 rounded-xl flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-[#EA4D19]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-white text-lg">Join Group</h3>
                  <p className="text-white/50 text-sm">Enter code</p>
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
                    className="w-full px-3 py-2.5 rounded-xl text-center text-lg font-mono font-bold tracking-[0.15em] bg-[#222] text-white border border-white/20 focus:border-[#EA4D19] focus:outline-none transition"
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
                      className="flex-1 py-2 bg-[#EA4D19] text-white font-bold text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-600 transition"
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
// LANDING PAGE (Anonymous Users)
// ============================================
function LandingPage() {
  const [sessionCode, setSessionCode] = useState('')
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [isSpinning, setIsSpinning] = useState(false)
  const [joinError, setJoinError] = useState('')
  const [isJoining, setIsJoining] = useState(false)

  const anonLimit = USER_TIERS.anonymous.maxRestaurantsPerSession
  const authLimit = USER_TIERS.authenticated.maxRestaurantsPerSession

  // Trigger hero logo spin animation once on page load
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSpinning(true)
      setTimeout(() => setIsSpinning(false), 1200)
    }, 300) // Small delay for smoother UX after page renders
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
        setJoinError('Group not found. Check your code.')
        setIsJoining(false)
        return
      }
      if (!response.ok) {
        setJoinError('Something went wrong. Try again.')
        setIsJoining(false)
        return
      }
      window.location.href = `/session/${code}`
    } catch {
      setJoinError('Connection failed. Try again.')
      setIsJoining(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F97316] to-[#DC2626]">
      {/* Header with logo */}
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
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="bg-white/20 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-white/30 transition"
          >
            Sign Up
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <div className="flex items-center justify-center p-4 pb-8">
        <div className="w-full max-w-sm text-center">
          {/* Big Bold Logo */}
          <div className="mb-8">
            <div className="relative w-40 h-40 mx-auto mb-5">
              {/* Rotating circular text */}
              <svg
                className={`absolute inset-0 w-full h-full ${isSpinning ? 'spin-once-reverse' : ''}`}
                viewBox="0 0 200 200"
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
              {/* Logo */}
              <Image
                src="/logo_groupNom.svg"
                alt="Group Nom"
                width={90}
                height={90}
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer drop-shadow-lg ${isSpinning ? 'spin-once' : ''}`}
                onClick={handleLogoTap}
              />
            </div>

            {/* Tagline */}
            <h1 className="text-white text-3xl font-extrabold mb-2 leading-tight">
              Find your next<br />favorite restaurant.
            </h1>
            <p className="text-white/80 text-base font-medium">
              Or at least a rebound.
            </p>
          </div>

          {/* Main Actions */}
          <div className="space-y-3 mb-6">
            <Link
              href="/setup"
              className="block w-full bg-white text-[#EA4D19] font-bold text-lg py-4 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Start a Group
            </Link>

            <p className="text-white/70 text-sm">
              {anonLimit} restaurants free · {authLimit} with account
            </p>
          </div>

          {/* Join Group */}
          <div className="mb-6">
            {!showJoinForm ? (
              <button
                onClick={() => setShowJoinForm(true)}
                className="text-white font-semibold underline underline-offset-4 decoration-white/50 hover:decoration-white transition"
              >
                Have a code? Join a group
              </button>
            ) : (
              <form onSubmit={joinSession} className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="ABC123"
                    value={sessionCode}
                    onChange={(e) => {
                      setSessionCode(e.target.value.toUpperCase())
                      setJoinError('')
                    }}
                    className="flex-1 px-4 py-3 rounded-xl text-center text-xl font-mono font-bold tracking-[0.2em] bg-white/20 text-white placeholder-white/50 border-2 border-white/30 focus:border-white focus:outline-none transition"
                    maxLength={6}
                    autoFocus
                    disabled={isJoining}
                  />
                  <button
                    type="submit"
                    disabled={isJoining || sessionCode.length < 6}
                    className="px-6 py-3 bg-white text-[#EA4D19] font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/90 transition"
                  >
                    {isJoining ? '...' : 'Go'}
                  </button>
                </div>
                {joinError && (
                  <p className="text-white text-sm bg-red-500/30 rounded-lg py-2 px-3">
                    {joinError}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinForm(false)
                    setSessionCode('')
                    setJoinError('')
                  }}
                  className="text-white/70 text-sm hover:text-white transition"
                >
                  Cancel
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Swipe Demo Section */}
      <div className="bg-[#1a1a1a] py-12 px-4">
        <div className="max-w-sm mx-auto">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-4 text-center">How it works</p>

          {/* Card Stack Animation with Swipe Demo */}
          <div className="relative h-72 mb-6">
            {/* Animated card stack */}
            <div className="relative w-52 h-64 mx-auto">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="absolute inset-0 bg-white rounded-2xl shadow-xl overflow-hidden"
                  style={{
                    animation: i === 0 ? 'cardSwipeDemo 3s ease-in-out infinite' : undefined,
                    transform: i === 0 ? undefined : `translateY(${i * 8}px) scale(${1 - i * 0.05})`,
                    zIndex: 3 - i,
                    opacity: i === 0 ? 1 : 0.7 - i * 0.2,
                  }}
                >
                  {/* Mini restaurant card preview */}
                  <div className="h-28 bg-gradient-to-br from-orange-300 to-red-400 flex items-center justify-center">
                    <svg className="w-10 h-10 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div className="p-3">
                    <div className="bg-gray-200 rounded h-4 w-3/4 mb-2" />
                    <div className="bg-gray-100 rounded h-3 w-1/2 mb-3" />
                    <div className="flex gap-1.5">
                      <div className="bg-orange-100 rounded-full h-4 w-12" />
                      <div className="bg-orange-100 rounded-full h-4 w-10" />
                    </div>
                  </div>
                </div>
              ))}

              {/* Swipe indicators that appear during animation */}
              <div className="absolute -left-16 top-1/2 -translate-y-1/2 text-red-400 opacity-0 animate-swipeHintLeft">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="absolute -right-16 top-1/2 -translate-y-1/2 text-green-400 opacity-0 animate-swipeHintRight">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Swipe instructions */}
          <div className="flex justify-center gap-8 text-sm mb-2">
            <div className="text-center">
              <div className="text-red-400 font-bold">← Pass</div>
            </div>
            <div className="text-center">
              <div className="text-green-400 font-bold">Like →</div>
            </div>
          </div>
          <p className="text-white/40 text-xs text-center">
            Swipe through restaurants. Match with your group.
          </p>
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes cardSwipeDemo {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          15% { transform: translateX(80px) rotate(8deg); }
          30% { transform: translateX(0) rotate(0deg); }
          45% { transform: translateX(-80px) rotate(-8deg); }
          60% { transform: translateX(0) rotate(0deg); }
        }
        @keyframes swipeHintRight {
          0%, 100% { opacity: 0; }
          10%, 25% { opacity: 1; }
        }
        @keyframes swipeHintLeft {
          0%, 100% { opacity: 0; }
          40%, 55% { opacity: 1; }
        }
        .animate-swipeHintRight {
          animation: swipeHintRight 3s ease-in-out infinite;
        }
        .animate-swipeHintLeft {
          animation: swipeHintLeft 3s ease-in-out infinite;
        }
      `}</style>

      {/* Value Proposition Section - Dark Background */}
      <div className="bg-[#222222] pt-10 pb-8 px-4">
        <div className="max-w-sm mx-auto">
          <h2 className="text-white text-xl font-bold text-center mb-2">
            More than a group thing.
          </h2>
          <p className="text-white/50 text-sm text-center mb-8">
            Create an account to unlock all features
          </p>

          {/* Features Grid - with hover effects */}
          <div className="space-y-3 mb-8">
            {/* Discover */}
            <div className="flex items-start gap-4 bg-[#2a2a2a] rounded-xl p-4 hover:bg-[#333333] transition cursor-default">
              <div className="w-10 h-10 bg-gradient-to-br from-[#F97316] to-[#DC2626] rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88" fill="currentColor" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold">Discover solo</h3>
                <p className="text-white/50 text-sm">Swipe on your own to find hidden gems.</p>
              </div>
            </div>

            {/* Save */}
            <div className="flex items-start gap-4 bg-[#2a2a2a] rounded-xl p-4 hover:bg-[#333333] transition cursor-default">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold">Save the good ones</h3>
                <p className="text-white/50 text-sm">Build a collection you'll actually remember.</p>
              </div>
            </div>

            {/* Boost locals */}
            <div className="flex items-start gap-4 bg-[#2a2a2a] rounded-xl p-4 hover:bg-[#333333] transition cursor-default">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold">Boost local favorites</h3>
                <p className="text-white/50 text-sm">Help others discover your go-to spots.</p>
              </div>
            </div>

            {/* More options */}
            <div className="flex items-start gap-4 bg-[#2a2a2a] rounded-xl p-4 hover:bg-[#333333] transition cursor-default">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold">{authLimit} restaurants per group</h3>
                <p className="text-white/50 text-sm">Guests only get {anonLimit}. More options = better matches.</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <Link
            href="/sign-up"
            className="block w-full bg-[#EA4D19] text-white font-bold text-lg py-4 rounded-2xl text-center hover:bg-orange-600 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg"
          >
            Create free account
          </Link>

          <Footer />
        </div>
      </div>
    </div>
  )
}
