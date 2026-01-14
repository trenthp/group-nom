import { kv } from '@vercel/kv'
import { Session, Restaurant, Filters, SessionMetadata } from './types'

// Session expiration: 24 hours in seconds
const SESSION_EXPIRY_SECONDS = 24 * 60 * 60

// Key prefix for sessions
const SESSION_KEY_PREFIX = 'session:'

function getSessionKey(code: string): string {
  return `${SESSION_KEY_PREFIX}${code}`
}

export const sessionStore = {
  createSession: async (
    code: string,
    userId: string,
    filters: Filters,
    restaurants: Restaurant[],
    location: { lat: number; lng: number },
    metadata?: SessionMetadata
  ): Promise<Session> => {
    const session: Session = {
      code,
      createdAt: Date.now(),
      status: 'active',
      hostId: userId,
      users: [userId],
      votes: [],
      finished: false,
      filters,
      restaurants,
      location,
      metadata,
    }
    await kv.set(getSessionKey(code), session, { ex: SESSION_EXPIRY_SECONDS })
    return session
  },

  getSession: async (code: string): Promise<Session | null> => {
    const session = await kv.get<Session>(getSessionKey(code))
    return session
  },

  updateSession: async (code: string, session: Session): Promise<void> => {
    // Get current TTL to preserve it
    const ttl = await kv.ttl(getSessionKey(code))
    const expiry = ttl > 0 ? ttl : SESSION_EXPIRY_SECONDS
    await kv.set(getSessionKey(code), session, { ex: expiry })
  },

  addUserToSession: async (code: string, userId: string): Promise<boolean> => {
    const session = await sessionStore.getSession(code)
    if (!session) return false
    if (!session.users.includes(userId)) {
      session.users.push(userId)
      await sessionStore.updateSession(code, session)
    }
    return true
  },

  addVote: async (code: string, userId: string, restaurantId: string, liked: boolean): Promise<void> => {
    const session = await sessionStore.getSession(code)
    if (!session) return

    // Remove existing vote for this user/restaurant combination
    session.votes = session.votes.filter(
      (v) => !(v.userId === userId && v.restaurantId === restaurantId)
    )

    // Add new vote
    session.votes.push({ userId, restaurantId, liked })
    await sessionStore.updateSession(code, session)
  },

  getUserVoteCount: async (code: string, userId: string): Promise<number> => {
    const session = await sessionStore.getSession(code)
    if (!session) return 0
    return session.votes.filter(v => v.userId === userId).length
  },

  hasUserFinishedVoting: async (code: string, userId: string): Promise<boolean> => {
    const session = await sessionStore.getSession(code)
    if (!session) return false
    const userVotes = session.votes.filter(v => v.userId === userId)
    return userVotes.length >= session.restaurants.length
  },

  allUsersFinished: async (code: string): Promise<boolean> => {
    const session = await sessionStore.getSession(code)
    if (!session || session.users.length === 0) return false

    for (const userId of session.users) {
      const userVotes = session.votes.filter(v => v.userId === userId)
      if (userVotes.length < session.restaurants.length) {
        return false
      }
    }
    return true
  },

  finishSession: async (code: string): Promise<void> => {
    const session = await sessionStore.getSession(code)
    if (session) {
      session.finished = true
      session.status = 'finished'
      await sessionStore.updateSession(code, session)
    }
  },

  setReconfiguring: async (code: string): Promise<boolean> => {
    const session = await sessionStore.getSession(code)
    if (session) {
      session.status = 'reconfiguring'
      await sessionStore.updateSession(code, session)
      return true
    }
    return false
  },

  reconfigureSession: async (
    code: string,
    filters: Filters,
    restaurants: Restaurant[],
    location: { lat: number; lng: number }
  ): Promise<Session | null> => {
    const session = await sessionStore.getSession(code)
    if (!session) return null

    // Reset session state but keep users
    session.status = 'active'
    session.votes = []
    session.finished = false
    session.filters = filters
    session.restaurants = restaurants
    session.location = location

    await sessionStore.updateSession(code, session)
    return session
  },

  calculateResults: async (code: string) => {
    const session = await sessionStore.getSession(code)
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

  deleteSession: async (code: string): Promise<void> => {
    await kv.del(getSessionKey(code))
  },
}
