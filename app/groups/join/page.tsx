'use client'

import { useState, useEffect, Suspense } from 'react'
import { useUser, SignInButton } from '@clerk/nextjs'
import { useRouter, useSearchParams } from 'next/navigation'

function JoinGroupContent() {
  const { isSignedIn, isLoaded } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const code = searchParams.get('code')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (isLoaded && isSignedIn && code && !loading && !success) {
      joinGroup()
    }
  }, [isLoaded, isSignedIn, code])

  const joinGroup = async () => {
    if (!code) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: code }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to join group')
      }

      const data = await response.json()
      setSuccess(true)

      // Redirect to group page after short delay
      setTimeout(() => {
        router.push(`/groups/${data.group.id}`)
      }, 1500)
    } catch (error) {
      console.error('Error joining group:', error)
      setError(error instanceof Error ? error.message : 'Failed to join group')
    } finally {
      setLoading(false)
    }
  }

  // No code provided
  if (!code) {
    return (
      <div className="min-h-screen bg-[#222222] flex items-center justify-center p-4">
        <div className="bg-[#333333] rounded-2xl p-8 max-w-md text-center">
          <p className="text-red-400 mb-4">Invalid invite link</p>
          <a
            href="/groups"
            className="inline-block bg-[#EA4D19] text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-600 transition"
          >
            Go to Groups
          </a>
        </div>
      </div>
    )
  }

  // Not loaded yet
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#222222] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent" />
      </div>
    )
  }

  // Not signed in
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-[#222222] flex items-center justify-center p-4">
        <div className="bg-[#333333] rounded-2xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-[#EA4D19]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <UsersIcon />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Join Group
          </h1>
          <p className="text-white/60 mb-6">
            Sign in to join this group and start voting on restaurants together!
          </p>
          <SignInButton mode="modal">
            <button className="bg-[#EA4D19] text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-600 transition">
              Sign In to Join
            </button>
          </SignInButton>
        </div>
      </div>
    )
  }

  // Loading / Joining
  if (loading) {
    return (
      <div className="min-h-screen bg-[#222222] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent mx-auto mb-4" />
          <p className="text-white/60">Joining group...</p>
        </div>
      </div>
    )
  }

  // Success
  if (success) {
    return (
      <div className="min-h-screen bg-[#222222] flex items-center justify-center p-4">
        <div className="bg-[#333333] rounded-2xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckIcon />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Joined Successfully!
          </h1>
          <p className="text-white/60">
            Redirecting to group...
          </p>
        </div>
      </div>
    )
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen bg-[#222222] flex items-center justify-center p-4">
        <div className="bg-[#333333] rounded-2xl p-8 max-w-md text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <div className="space-x-3">
            <button
              onClick={joinGroup}
              className="bg-[#EA4D19] text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-600 transition"
            >
              Try Again
            </button>
            <a
              href="/groups"
              className="inline-block px-6 py-2 border border-white/20 rounded-lg text-white/70 hover:bg-white/5 transition"
            >
              Go to Groups
            </a>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default function JoinGroupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#222222] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent" />
        </div>
      }
    >
      <JoinGroupContent />
    </Suspense>
  )
}

function UsersIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#EA4D19]">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
      <polyline points="20,6 9,17 4,12" />
    </svg>
  )
}
