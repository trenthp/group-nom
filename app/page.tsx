'use client'

import { useState } from 'react'
import Image from 'next/image'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function HomePage() {
  const [sessionCode, setSessionCode] = useState('')
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [isSpinning, setIsSpinning] = useState(false)

  const handleLogoTap = () => {
    if (!isSpinning) {
      setIsSpinning(true)
      setTimeout(() => setIsSpinning(false), 1200)
    }
  }

  const startNewSession = () => {
    window.location.href = '/setup'
  }

  const joinSession = (e: React.FormEvent) => {
    e.preventDefault()
    if (sessionCode.trim()) {
      window.location.href = `/session/${sessionCode.toUpperCase()}`
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600 flex flex-col">
      <Header />

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Large centered logo with circular text */}
          <div className="text-center mb-8">
            <div className="relative w-52 h-52 mx-auto mb-4">
              {/* Rotating circular text path */}
              <svg
                className={`absolute inset-0 w-full h-full ${isSpinning ? 'spin-once-reverse' : ''}`}
                viewBox="0 0 200 200"
              >
                <defs>
                  <path
                    id="circlePath"
                    d="M 100, 100 m -70, 0 a 70,70 0 1,1 140,0 a 70,70 0 1,1 -140,0"
                    fill="none"
                  />
                </defs>
                <text className="fill-white opacity-88 text-[22px] font-bold tracking-[.02em]" style={{ fontFamily: "'Alan Sans', sans-serif" }}>
                  <textPath href="#circlePath" startOffset="0%">
                    Group Nom • Group Nom • Group Nom •
                  </textPath>
                </text>
              </svg>
              {/* Logo */}
              <Image
                src="/logo_groupNom.svg"
                alt="Group Nom"
                width={128}
                height={128}
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl cursor-pointer ${isSpinning ? 'spin-once' : ''}`}
                onClick={handleLogoTap}
              />
            </div>
            <p className="text-orange-100 text-xl">Find a restaurant. Get your group nom.
            <br/>Swipe together, match together, eat together.</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={startNewSession}
              className="w-full bg-white text-orange-600 font-semibold py-4 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition"
            >
              Start New Group
            </button>

            {!showJoinForm ? (
              <button
                onClick={() => setShowJoinForm(true)}
                className="w-full bg-orange-700 text-white font-semibold py-4 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition"
              >
                Join Group
              </button>
            ) : (
              <form onSubmit={joinSession} className="space-y-3 bg-orange-700 p-4 rounded-lg">
                <input
                  type="text"
                  placeholder="Enter group code"
                  value={sessionCode}
                  onChange={(e) => setSessionCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg text-center text-lg uppercase tracking-widest bg-orange-600 text-white placeholder-orange-300 focus:outline-none focus:ring-2 focus:ring-white"
                  maxLength={6}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowJoinForm(false)
                      setSessionCode('')
                    }}
                    className="flex-1 bg-orange-600 text-white font-semibold py-3 rounded-lg hover:bg-orange-500 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-white text-orange-700 font-semibold py-3 rounded-lg hover:bg-orange-50 transition"
                  >
                    Join
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="mt-8 text-center text-orange-100 text-sm">
            <p>Find your next favorite restaurant.<br />Or at least a rebound.</p>
          </div>

          <Footer />
        </div>
      </div>
    </div>
  )
}
