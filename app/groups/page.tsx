'use client'

import { useState, useEffect } from 'react'
import { useUser, SignInButton } from '@clerk/nextjs'
import Link from 'next/link'
import { Group } from '@/lib/groups'

interface GroupsState {
  groups: Group[]
  loading: boolean
  error: string | null
}

export default function GroupsPage() {
  const { isSignedIn, isLoaded } = useUser()
  const [state, setState] = useState<GroupsState>({
    groups: [],
    loading: true,
    error: null,
  })
  const [showCreate, setShowCreate] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchGroups()
    } else if (isLoaded && !isSignedIn) {
      setState(s => ({ ...s, loading: false }))
    }
  }, [isLoaded, isSignedIn])

  const fetchGroups = async () => {
    setState(s => ({ ...s, loading: true, error: null }))

    try {
      const response = await fetch('/api/groups')
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch groups')
      }

      const data = await response.json()
      setState(s => ({
        ...s,
        groups: data.groups || [],
        loading: false,
      }))
    } catch (error) {
      console.error('Error fetching groups:', error)
      setState(s => ({
        ...s,
        error: error instanceof Error ? error.message : 'Failed to load groups',
        loading: false,
      }))
    }
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGroupName.trim() || creating) return

    setCreating(true)

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName.trim() }),
      })

      if (!response.ok) throw new Error('Failed to create group')

      const data = await response.json()
      setState(s => ({
        ...s,
        groups: [data.group, ...s.groups],
      }))
      setNewGroupName('')
      setShowCreate(false)
    } catch (error) {
      console.error('Error creating group:', error)
      alert('Failed to create group')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this group?')) return

    // Optimistic update
    setState(s => ({
      ...s,
      groups: s.groups.filter(g => g.id !== groupId),
    }))

    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete group')
    } catch (error) {
      console.error('Error deleting group:', error)
      fetchGroups() // Refresh on error
    }
  }

  // Auth loading
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
            Your Groups
          </h1>
          <p className="text-white/60 mb-6">
            Sign in to create groups and start voting sessions with your friends.
          </p>
          <SignInButton mode="modal">
            <button className="bg-[#EA4D19] text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-600 transition">
              Sign In to Get Started
            </button>
          </SignInButton>
        </div>
      </div>
    )
  }

  // Loading state
  if (state.loading) {
    return (
      <div className="min-h-screen bg-[#222222] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent mx-auto mb-4" />
          <p className="text-white/60">Loading your groups...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#222222]">
      {/* Header */}
      <header className="px-4 py-6">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">My Groups</h1>
            <p className="text-sm text-white/50">
              {state.groups.length} group{state.groups.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-[#EA4D19] text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-600 transition text-sm"
          >
            + New Group
          </button>
        </div>
      </header>

      {/* Create Group Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#333333] rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-white mb-4">Create Group</h2>
            <form onSubmit={handleCreateGroup}>
              <input
                type="text"
                placeholder="Group name (e.g., Friday Lunch Crew)"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="w-full px-4 py-3 bg-[#222222] text-white border border-white/20 rounded-lg focus:ring-2 focus:ring-[#EA4D19] focus:border-[#EA4D19] outline-none placeholder-white/40"
                maxLength={50}
                autoFocus
              />
              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreate(false)
                    setNewGroupName('')
                  }}
                  className="flex-1 px-4 py-2 border border-white/20 rounded-lg text-white/70 hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newGroupName.trim() || creating}
                  className="flex-1 px-4 py-2 bg-[#EA4D19] text-white rounded-lg font-medium hover:bg-orange-600 transition disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Groups List */}
      <main className="max-w-lg mx-auto px-4 pb-24">
        {state.error && (
          <div className="bg-[#333333] rounded-2xl p-6 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium mb-1">Groups not available</p>
                <p className="text-white/60 text-sm">{state.error}</p>
                <button
                  onClick={() => fetchGroups()}
                  className="mt-3 text-[#EA4D19] text-sm font-medium hover:underline"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {!state.error && state.groups.length === 0 ? (
          <div className="bg-[#333333] rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-[#EA4D19]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <UsersIcon />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              No groups yet
            </h2>
            <p className="text-white/60 mb-6">
              Create a group to start organizing your restaurant voting sessions!
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="bg-[#EA4D19] text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-600 transition"
            >
              Create Your First Group
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {state.groups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                onDelete={() => handleDeleteGroup(group.id)}
              />
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 space-y-3">
          <Link
            href="/setup"
            className="block bg-[#333333] rounded-xl p-4 hover:bg-[#3a3a3a] transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                <PlayIcon />
              </div>
              <div>
                <h3 className="font-semibold text-white">Quick Session</h3>
                <p className="text-sm text-white/50">
                  Start a one-time voting session without a saved group
                </p>
              </div>
            </div>
          </Link>
        </div>
      </main>
    </div>
  )
}

function GroupCard({
  group,
  onDelete,
}: {
  group: Group
  onDelete: () => void
}) {
  return (
    <div className="bg-[#333333] rounded-xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-white">{group.name}</h3>
            <p className="text-sm text-white/50">
              {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
          <Link
            href={`/groups/${group.id}`}
            className="flex-1 text-center text-sm text-[#EA4D19] hover:text-orange-400 py-2 rounded-lg hover:bg-white/5 transition font-medium"
          >
            View Details
          </Link>
          <Link
            href={`/setup?groupId=${group.id}`}
            className="flex-1 text-center text-sm text-green-400 hover:text-green-300 py-2 rounded-lg hover:bg-white/5 transition font-medium"
          >
            Start Session
          </Link>
          <button
            onClick={onDelete}
            className="text-white/40 text-sm py-2 px-3 rounded-lg hover:bg-white/5 hover:text-red-400 transition"
            title="Delete group"
          >
            <TrashIcon />
          </button>
        </div>
      </div>
    </div>
  )
}

// Simple icons
function UsersIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-green-500">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3,6 5,6 21,6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}
