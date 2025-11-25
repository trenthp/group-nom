import { Session, Restaurant, Filters } from './types'

// In-memory store - in production, this would be a database
// Use globalThis to persist across hot reloads in development
const globalForSessions = globalThis as unknown as {
  sessions: Map<string, Session> | undefined
}

const sessions: Map<string, Session> = globalForSessions.sessions ?? new Map()
globalForSessions.sessions = sessions

export const sessionStore = {
  initPendingSession: (code: string, hostUserId: string): Session => {
    const session: Session = {
      code,
      createdAt: Date.now(),
      status: 'pending',
      users: [hostUserId],
      votes: [],
      finished: false,
      restaurants: [],
    }
    sessions.set(code, session)
    return session
  },

  completeSession: (
    code: string,
    filters: Filters,
    restaurants: Restaurant[],
    location: { lat: number; lng: number }
  ): Session | null => {
    const session = sessions.get(code)
    if (!session) return null

    session.status = 'active'
    session.filters = filters
    session.restaurants = restaurants
    session.location = location

    return session
  },

  createSession: (
    code: string,
    userId: string,
    filters: Filters,
    restaurants: Restaurant[],
    location: { lat: number; lng: number }
  ): Session => {
    const session: Session = {
      code,
      createdAt: Date.now(),
      status: 'active',
      users: [userId],
      votes: [],
      finished: false,
      filters,
      restaurants,
      location,
    }
    sessions.set(code, session)
    return session
  },

  getSession: (code: string): Session | undefined => {
    const session = sessions.get(code)
    if (!session) return undefined

    // Check if session is expired
    if (sessionStore.isExpired(session)) {
      sessions.delete(code)
      console.log(`🧹 Removed expired session: ${code}`)
      return undefined
    }

    return session
  },

  addUserToSession: (code: string, userId: string): boolean => {
    const session = sessions.get(code)
    if (!session) return false
    if (!session.users.includes(userId)) {
      session.users.push(userId)
    }
    return true
  },

  addVote: (code: string, userId: string, restaurantId: string, liked: boolean): void => {
    const session = sessions.get(code)
    if (!session) return

    // Remove existing vote for this user/restaurant combination
    session.votes = session.votes.filter(
      (v) => !(v.userId === userId && v.restaurantId === restaurantId)
    )

    // Add new vote
    session.votes.push({ userId, restaurantId, liked })
  },

  getUserVoteCount: (code: string, userId: string): number => {
    const session = sessions.get(code)
    if (!session) return 0
    return session.votes.filter(v => v.userId === userId).length
  },

  hasUserFinishedVoting: (code: string, userId: string): boolean => {
    const session = sessions.get(code)
    if (!session) return false
    const userVotes = session.votes.filter(v => v.userId === userId)
    return userVotes.length >= session.restaurants.length
  },

  allUsersFinished: (code: string): boolean => {
    const session = sessions.get(code)
    if (!session || session.users.length === 0) return false
    return session.users.every(userId =>
      sessionStore.hasUserFinishedVoting(code, userId)
    )
  },

  finishSession: (code: string): void => {
    const session = sessions.get(code)
    if (session) {
      session.finished = true
      session.status = 'finished'
    }
  },

  calculateResults: (code: string) => {
    const session = sessions.get(code)
    if (!session) return null

    const aggregated = new Map<
      string,
      {
        restaurant: Restaurant
        yesCount: number
        userVotes: { [userId: string]: boolean }
      }
    >()

    session.restaurants.forEach((restaurant) => {
      aggregated.set(restaurant.id, {
        restaurant,
        yesCount: 0,
        userVotes: {},
      })
    })

    session.votes.forEach((vote) => {
      const data = aggregated.get(vote.restaurantId)
      if (data) {
        data.userVotes[vote.userId] = vote.liked
        if (vote.liked) {
          data.yesCount++
        }
      }
    })

    // Convert to array and sort
    const results = Array.from(aggregated.values())
      .filter((item) => item.restaurant)
      .sort((a, b) => b.yesCount - a.yesCount)

    // Find winning match
    // 1. All users agree
    const fullAgreement = results.find(
      (item) =>
        item.yesCount === session.users.length &&
        Object.keys(item.userVotes).length === session.users.length
    )

    if (fullAgreement) {
      return {
        type: 'full-agreement',
        restaurant: fullAgreement.restaurant,
        allVotes: results,
      }
    }

    // 2. No full agreement - return highest
    if (results.length > 0 && results[0].yesCount > 0) {
      return {
        type: 'best-match',
        restaurant: results[0].restaurant,
        yesCount: results[0].yesCount,
        userCount: session.users.length,
        allVotes: results,
      }
    }

    return null
  },

  // Session expiration: 24 hours
  SESSION_EXPIRY_MS: 24 * 60 * 60 * 1000,

  isExpired: (session: Session): boolean => {
    const age = Date.now() - session.createdAt
    return age > sessionStore.SESSION_EXPIRY_MS
  },

  cleanupExpiredSessions: (): number => {
    let cleaned = 0
    for (const [code, session] of sessions.entries()) {
      if (sessionStore.isExpired(session)) {
        sessions.delete(code)
        cleaned++
      }
    }
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired session(s)`)
    }
    return cleaned
  },

  getAllSessions: (): Session[] => {
    return Array.from(sessions.values())
  },

  getSessionCount: (): number => {
    return sessions.size
  },
}

// Start periodic cleanup (every hour)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    sessionStore.cleanupExpiredSessions()
  }, 60 * 60 * 1000) // Run every hour

  // Also run cleanup on startup
  setTimeout(() => {
    sessionStore.cleanupExpiredSessions()
  }, 5000) // Wait 5 seconds after startup
}
