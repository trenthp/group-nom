'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  /** Extra path prefixes that count as "here" for the active state */
  also?: string[]
}

// Four tabs (Sep 2026): Home, Library, Discover, Profile. Nominate is the
// primary action on Library rather than a tab; groups and the to-try list
// hang off Home and Profile.
const navItems: NavItem[] = [
  { href: '/', label: 'Home', icon: <HomeIcon /> },
  { href: '/library', label: 'Library', icon: <BookIcon />, also: ['/restaurant', '/nominate'] },
  { href: '/discover', label: 'Discover', icon: <CompassIcon /> },
  { href: '/profile', label: 'Profile', icon: <UserIcon />, also: ['/member', '/to-try', '/groups'] },
]

export default function BottomNav() {
  const pathname = usePathname()
  const { isSignedIn, isLoaded } = useUser()

  // Members only — the signed-out landing has its own navigation
  if (!isLoaded || !isSignedIn) {
    return null
  }

  // Sessions are full-screen "game mode"
  if (pathname?.startsWith('/session/')) {
    return null
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-[#1a1a1a] border-t border-white/10 z-50 pb-safe"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname?.startsWith(item.href)) ||
            (item.also?.some((p) => pathname?.startsWith(p)) ?? false)

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center py-2 px-4 min-w-[64px] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-lg ${
                isActive
                  ? 'text-brand'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              <span className={isActive ? 'scale-110' : ''} aria-hidden="true">{item.icon}</span>
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

function HomeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9,22 9,12 15,12 15,22" />
    </svg>
  )
}

function BookIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  )
}

function CompassIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88" fill="currentColor" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
