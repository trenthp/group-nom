'use client'

import { useState } from 'react'
import Image from 'next/image'
import SessionCodeOverlay from './SessionCodeOverlay'

interface HeaderProps {
  sessionCode?: string
}

export default function Header({ sessionCode }: HeaderProps) {
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
            className="flex items-center gap-2 hover:opacity-80 transition"
          >
            <Image
              src="/logo_groupNom.png"
              alt="Group Nom"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="text-white font-bold text-lg">Group Nom</span>
          </button>

          {/* Right: Session Code Badge */}
          {sessionCode && (
            <button
              onClick={() => setShowOverlay(true)}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 transition px-3 py-1.5 rounded-lg flex items-center gap-2"
            >
              <span className="text-white text-sm font-medium">Code:</span>
              <code className="text-white font-mono font-bold tracking-wider">{sessionCode}</code>
            </button>
          )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
            onClick={() => setShowLeaveModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="text-center">
              <div className="text-5xl mb-4">🚪</div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Leave Session?</h2>
              <p className="text-gray-600 text-sm mb-6">
                Are you sure you want to leave this session? Your votes will be saved, but you'll need the session code to rejoin.
              </p>

              <div className="space-y-3">
                <button
                  onClick={handleLeaveSession}
                  className="w-full py-3 px-4 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition"
                >
                  Leave Session
                </button>
                <button
                  onClick={() => setShowLeaveModal(false)}
                  className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition"
                >
                  Stay Here
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
