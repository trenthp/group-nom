'use client'

import { useState, useEffect, use } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GroupWithMembers } from '@/lib/groups'

interface GroupDetailState {
  group: GroupWithMembers | null
  inviteCode: string | null
  loading: boolean
  error: string | null
}

export default function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { isSignedIn, isLoaded, user } = useUser()
  const router = useRouter()
  const [state, setState] = useState<GroupDetailState>({
    group: null,
    inviteCode: null,
    loading: true,
    error: null,
  })
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchGroup()
    } else if (isLoaded && !isSignedIn) {
      router.push('/sign-in')
    }
  }, [isLoaded, isSignedIn, id])

  const fetchGroup = async () => {
    setState(s => ({ ...s, loading: true, error: null }))

    try {
      const response = await fetch(`/api/groups/${id}`)
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Group not found')
        }
        throw new Error('Failed to fetch group')
      }

      const data = await response.json()
      setState(s => ({
        ...s,
        group: data.group,
        inviteCode: data.inviteCode,
        loading: false,
      }))
      setNewName(data.group.name)
    } catch (error) {
      console.error('Error fetching group:', error)
      setState(s => ({
        ...s,
        error: error instanceof Error ? error.message : 'Failed to load group',
        loading: false,
      }))
    }
  }

  const handleCopyInvite = async () => {
    if (!state.inviteCode) return

    const inviteUrl = `${window.location.origin}/groups/join?code=${state.inviteCode}`

    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      prompt('Copy this invite link:', inviteUrl)
    }
  }

  const handleUpdateName = async () => {
    if (!newName.trim() || newName === state.group?.name) {
      setEditing(false)
      return
    }

    try {
      const response = await fetch(`/api/groups/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })

      if (!response.ok) throw new Error('Failed to update')

      const data = await response.json()
      setState(s => ({
        ...s,
        group: s.group ? { ...s.group, name: data.group.name } : null,
      }))
      setEditing(false)
    } catch (error) {
      console.error('Error updating group:', error)
      alert('Failed to update group name')
    }
  }

  const handleRemoveMember = async (memberUserId: string) => {
    if (!confirm('Remove this member from the group?')) return

    try {
      const response = await fetch(`/api/groups/${id}/members?userId=${memberUserId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to remove member')

      // Refresh group
      fetchGroup()
    } catch (error) {
      console.error('Error removing member:', error)
      alert('Failed to remove member')
    }
  }

  // Loading
  if (!isLoaded || state.loading) {
    return (
      <div className="min-h-screen bg-[#222222] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent" />
      </div>
    )
  }

  // Error
  if (state.error) {
    return (
      <div className="min-h-screen bg-[#222222] flex items-center justify-center p-4">
        <div className="bg-[#333333] rounded-2xl p-8 max-w-md text-center">
          <p className="text-red-400 mb-4">{state.error}</p>
          <Link
            href="/groups"
            className="inline-block bg-[#EA4D19] text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-600 transition"
          >
            Back to Groups
          </Link>
        </div>
      </div>
    )
  }

  if (!state.group) return null

  const isOwner = state.group.ownerId === user?.id

  return (
    <div className="min-h-screen bg-[#222222]">
      {/* Header */}
      <header className="px-4 py-6">
        <div className="max-w-lg mx-auto">
          <Link href="/groups" className="text-[#EA4D19] text-sm mb-2 inline-block hover:text-orange-400 transition">
            ← Back to Groups
          </Link>
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 text-xl font-bold text-white border-b-2 border-[#EA4D19] outline-none bg-transparent"
                maxLength={50}
                autoFocus
              />
              <button
                onClick={handleUpdateName}
                className="text-green-400 font-medium"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditing(false)
                  setNewName(state.group?.name || '')
                }}
                className="text-white/40"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">{state.group.name}</h1>
              {isOwner && (
                <button
                  onClick={() => setEditing(true)}
                  className="text-white/40 hover:text-white/60"
                  title="Edit name"
                >
                  <EditIcon />
                </button>
              )}
            </div>
          )}
          <p className="text-sm text-white/50">
            {state.group.memberCount} member{state.group.memberCount !== 1 ? 's' : ''}
          </p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pb-24 space-y-4">
        {/* Quick Actions */}
        <div className="bg-[#333333] rounded-xl p-4">
          <Link
            href={`/setup?groupId=${id}`}
            className="flex items-center gap-3 text-green-400 hover:text-green-300"
          >
            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
              <PlayIcon />
            </div>
            <div>
              <span className="font-semibold">Start Voting Session</span>
              <p className="text-sm text-white/50">Choose restaurants together</p>
            </div>
          </Link>
        </div>

        {/* Invite Section (Owner only) */}
        {isOwner && state.inviteCode && (
          <div className="bg-[#333333] rounded-xl p-4">
            <h2 className="font-semibold text-white mb-3">Invite Members</h2>
            <p className="text-sm text-white/60 mb-3">
              Share this link to invite friends to your group:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/groups/join?code=${state.inviteCode}`}
                className="flex-1 px-3 py-2 bg-[#222222] border border-white/10 rounded-lg text-sm text-white/70"
              />
              <button
                onClick={handleCopyInvite}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-[#EA4D19] text-white hover:bg-orange-600'
                }`}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {/* Members List */}
        <div className="bg-[#333333] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <h2 className="font-semibold text-white">Members</h2>
          </div>
          <div className="divide-y divide-white/10">
            {state.group.members.map((member) => (
              <div
                key={member.clerkUserId}
                className="px-4 py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {member.avatarUrl ? (
                    <img
                      src={member.avatarUrl}
                      alt=""
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white/50">
                      {(member.displayName || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-white">
                      {member.displayName || 'Unknown User'}
                      {member.clerkUserId === state.group?.ownerId && (
                        <span className="ml-2 text-xs bg-[#EA4D19]/20 text-[#EA4D19] px-2 py-0.5 rounded">
                          Owner
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                {isOwner && member.clerkUserId !== state.group?.ownerId && (
                  <button
                    onClick={() => handleRemoveMember(member.clerkUserId)}
                    className="text-white/40 hover:text-red-400 p-2 transition"
                    title="Remove member"
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

// Simple icons
function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
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
