'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import Image from 'next/image'
import Link from 'next/link'
import SessionCodeOverlay from './SessionCodeOverlay'
import UserMenu from './auth/UserMenu'

interface HeaderProps {
  sessionCode?: string
}

export default function Header({ sessionCode }: HeaderProps) {
  const { isSignedIn, isLoaded } = useUser()
  const [showOverlay, setShowOverlay] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)

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
                aria-label={`View and share session code ${sessionCode}`}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 transition px-3 py-1.5 rounded-lg flex items-center gap-2"
              >
                <span className="text-white text-sm font-medium">Code:</span>
                <code className="text-white font-mono font-bold tracking-wider" aria-hidden="true">{sessionCode}</code>
              </button>
            )}

            {/* Auth section */}
            {isLoaded && (
              isSignedIn ? (
                <UserMenu />
              ) : (
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
