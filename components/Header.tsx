'use client'

import { useState, useEffect, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import Image from 'next/image'
import Link from 'next/link'
import SessionCodeOverlay from './SessionCodeOverlay'
import UserMenu from './auth/UserMenu'

interface HeaderProps {
  sessionCode?: string
  autoOpenShare?: boolean
}

export default function Header({ sessionCode, autoOpenShare = false }: HeaderProps) {
  const { isSignedIn, isLoaded } = useUser()
  const [showOverlay, setShowOverlay] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMobileMenu(false)
      }
    }
    if (showMobileMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMobileMenu])

  // Open overlay when autoOpenShare prop becomes true
  useEffect(() => {
    if (autoOpenShare) {
      setShowOverlay(true)
    }
  }, [autoOpenShare])

  const handleLogoClick = () => {
    if (sessionCode) {
      setShowLeaveModal(true)
    } else {
      window.location.href = '/'
    }
  }

  const handleLeaveSession = () => {
    window.location.href = '/'
  }

  return (
    <>
      <header className="w-full">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Left: Logo + Title */}
          <button
            onClick={handleLogoClick}
            aria-label={sessionCode ? "Leave session and go home" : "Go to home page"}
            className="flex items-center gap-2 hover:opacity-80 transition"
          >
            <Image
              src="/logo_groupNom.svg"
              alt=""
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="text-white font-bold text-lg">Group Nom</span>
          </button>

          {/* Right: Session Code Badge + Auth */}
          <div className="flex items-center gap-3">
            {sessionCode && (
              <button
                onClick={() => setShowOverlay(true)}
                aria-label={`Invite friends with session code ${sessionCode}`}
                className="bg-white text-orange-600 hover:bg-orange-50 transition px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span className="text-sm font-semibold">Invite</span>
                <code className="font-mono font-bold tracking-wider text-xs bg-orange-100 px-1.5 py-0.5 rounded" aria-hidden="true">{sessionCode}</code>
              </button>
            )}

            {/* Auth section */}
            {isLoaded && (
              isSignedIn ? (
                <UserMenu />
              ) : sessionCode ? (
                // Mobile menu for unauthenticated users in active session
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                    aria-label="Open menu"
                    aria-expanded={showMobileMenu}
                    className="p-2 text-white hover:bg-white/10 rounded-lg transition"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>

                  {/* Dropdown menu */}
                  {showMobileMenu && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl py-2 z-50">
                      <Link
                        href="/about"
                        className="block px-4 py-2.5 text-gray-700 hover:bg-gray-100 transition"
                        onClick={() => setShowMobileMenu(false)}
                      >
                        About
                      </Link>
                      <div className="border-t border-gray-100 my-1" />
                      <Link
                        href="/sign-in"
                        className="block px-4 py-2.5 text-gray-700 hover:bg-gray-100 transition"
                        onClick={() => setShowMobileMenu(false)}
                      >
                        Sign In
                      </Link>
                      <Link
                        href="/sign-up"
                        className="block px-4 py-2.5 text-orange-600 font-medium hover:bg-orange-50 transition"
                        onClick={() => setShowMobileMenu(false)}
                      >
                        Sign Up
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                // Desktop layout for unauthenticated users (no session)
                <div className="flex items-center gap-4">
                  <Link
                    href="/about"
                    className="text-white text-sm font-medium hover:text-orange-100 transition"
                  >
                    About
                  </Link>
                  <Link
                    href="/sign-in"
                    className="text-white text-sm font-medium hover:text-orange-100 transition"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/sign-up"
                    className="bg-white text-orange-600 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-orange-50 transition"
                  >
                    Sign Up
                  </Link>
                </div>
              )
            )}
          </div>
        </div>
      </header>

      {/* Session Code Overlay */}
      {sessionCode && (
        <SessionCodeOverlay
          code={sessionCode}
          isOpen={showOverlay}
          onClose={() => setShowOverlay(false)}
        />
      )}

      {/* Leave Session Confirmation Modal */}
      {showLeaveModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-modal-title"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
            onClick={() => setShowLeaveModal(false)}
            aria-hidden="true"
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="text-center">
              <div className="text-5xl mb-4" aria-hidden="true">👻</div>
              <h2 id="leave-modal-title" className="text-xl font-bold text-gray-800 mb-2">Ghosting?</h2>
              <p className="text-gray-600 text-sm mb-6">
                Your votes are saved, but you&apos;ll need the code to come back.
              </p>

              <div className="space-y-3">
                <button
                  onClick={handleLeaveSession}
                  className="w-full py-3 px-4 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition"
                >
                  Ghost
                </button>
                <button
                  onClick={() => setShowLeaveModal(false)}
                  className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition"
                >
                  Stay
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
