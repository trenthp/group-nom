'use client'

import { useState } from 'react'

export default function Home() {
  const [sessionCode, setSessionCode] = useState('')
  const [showJoinForm, setShowJoinForm] = useState(false)

  const startNewSession = () => {
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    console.log('🏠 HOME: Navigating to:', `/session/${newCode}/setup`)
    window.location.href = `/session/${newCode}/setup`
  }

  const joinSession = (e: React.FormEvent) => {
    e.preventDefault()
    if (sessionCode.trim()) {
      window.location.href = `/session/${sessionCode.toUpperCase()}`
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-2">🍽️</h1>
          <h2 className="text-4xl font-bold text-white mb-2">Group Nom</h2>
          <p className="text-orange-100">Find your next favorite restaurant (or at least for tonight)</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={startNewSession}
            className="w-full bg-white text-orange-600 font-bold py-4 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition"
          >
            Start New Session
          </button>

          <button
            onClick={() => setShowJoinForm(!showJoinForm)}
            className="w-full bg-orange-700 text-white font-bold py-4 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition"
          >
            Join Session
          </button>

          {showJoinForm && (
            <form onSubmit={joinSession} className="space-y-3 mt-4 bg-orange-700 p-4 rounded-lg">
              <input
                type="text"
                placeholder="Enter session code"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value)}
                className="w-full px-4 py-3 rounded-lg text-center text-lg uppercase tracking-widest bg-orange-600 text-white placeholder-orange-300 focus:outline-none focus:ring-2 focus:ring-white"
                maxLength={6}
              />
              <button
                type="submit"
                className="w-full bg-white text-orange-700 font-bold py-3 rounded-lg hover:bg-orange-50 transition"
              >
                Join
              </button>
            </form>
          )}
        </div>

        <div className="mt-12 text-center text-orange-100 text-sm">
          <p>Swipe through restaurants and find your perfect match!</p>
        </div>
      </div>
    </div>
  )
}
