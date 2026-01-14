'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  requiresAuth?: boolean
}

const navItems: NavItem[] = [
  {
    href: '/',
    label: 'Home',
    icon: <HomeIcon />,
  },
  {
    href: '/discover',
    label: 'Discover',
    icon: <CompassIcon />,
  },
  {
    href: '/saved',
    label: 'Saved',
    icon: <HeartIcon />,
    requiresAuth: true,
  },
  {
    href: '/groups',
    label: 'Groups',
    icon: <UsersIcon />,
  },
]

export default function BottomNav() {
  const pathname = usePathname()
  const { isSignedIn, isLoaded } = useUser()

  // Don't show for unauthenticated users - reduces noise on the landing experience
  if (isLoaded && !isSignedIn) {
    return null
  }

  // Don't show on session pages
  if (pathname?.startsWith('/session/')) {
    return null
  }

  // Don't show while auth is loading to prevent flash
  if (!isLoaded) {
    return null
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-[#1a1a1a] border-t border-white/10 z-50 pb-safe"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          // Skip auth-required items for non-signed-in users
          if (item.requiresAuth && !isSignedIn) {
            return null
          }

          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname?.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center py-2 px-4 min-w-[64px] transition ${
                isActive
                  ? 'text-[#EA4D19]'
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

// Simple icons for navigation
function HomeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9,22 9,12 15,12 15,22" />
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

function HeartIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
