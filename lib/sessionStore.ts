import { kv } from './kv'
import { Session, Restaurant, Filters, SessionMetadata } from './types'

// Session expiration: 24 hours in seconds
const SESSION_EXPIRY_SECONDS = 24 * 60 * 60

// Key prefix for sessions
const SESSION_KEY_PREFIX = 'session:'

function getSessionKey(code: string): string {
  return `${SESSION_KEY_PREFIX}${code}`
}

// ---------------------------------------------------------------------------
// Mutation lock (security audit fix): every write below is get-modify-set,
// so two concurrent requests could silently drop each other's changes
// (e.g. two joiners, or a vote racing close-voting). A short per-session
// Redis lock (SET NX PX) serializes them. If the lock can't be acquired in
// time we proceed anyway — a rare lost update beats a failed request.
// ---------------------------------------------------------------------------
const LOCK_TTL_MS = 3000
// Deadline, not a retry count: N concurrent writers serialize, so a waiter
// may legitimately queue behind several critical sections (~3 KV round
// trips each). Only a KV *error* falls through to running unlocked.
const LOCK_WAIT_MS = 8000
const LOCK_RETRY_DELAY_MS = 100

async function withSessionLock<T>(code: string, fn: () => Promise<T>): Promise<T> {
  const lockKey = `${SESSION_KEY_PREFIX}${code}:lock`
  const token = Math.random().toString(36).slice(2)
  let held = false

  try {
    const deadline = Date.now() + LOCK_WAIT_MS
    while (Date.now() < deadline) {
      const ok = await kv.set(lockKey, token, { nx: true, px: LOCK_TTL_MS })
      if (ok) { held = true; break }
      await new Promise(r => setTimeout(r, LOCK_RETRY_DELAY_MS + Math.random() * 100))
    }
  } catch {
    // KV hiccup acquiring the lock — run unlocked rather than fail
  }

  try {
    return await fn()
  } finally {
    if (held) {
      try {
        // Only release our own lock (it may have expired and been re-taken)
        const current = await kv.get<string>(lockKey)
        if (current === token) await kv.del(lockKey)
      } catch {
        // Expires on its own via PX
      }
    }
  }
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
    // keepTtl preserves the 24h expiry without an extra round trip
    await kv.set(getSessionKey(code), session, { keepTtl: true })
  },

  addUserToSession: async (code: string, userId: string): Promise<boolean> =>
    withSessionLock(code, async () => {
      const session = await sessionStore.getSession(code)
      if (!session) return false
      if (!session.users.includes(userId)) {
        session.users.push(userId)
        await sessionStore.updateSession(code, session)
      }
      return true
    }),

  addVote: async (code: string, userId: string, restaurantId: string, liked: boolean): Promise<void> =>
    withSessionLock(code, async () => {
      const session = await sessionStore.getSession(code)
      if (!session) return

      // Remove existing vote for this user/restaurant combination
      session.votes = session.votes.filter(
        (v) => !(v.userId === userId && v.restaurantId === restaurantId)
      )

      // Add new vote
      session.votes.push({ userId, restaurantId, liked })
      await sessionStore.updateSession(code, session)
    }),

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

  finishSession: async (code: string): Promise<void> =>
    withSessionLock(code, async () => {
      const session = await sessionStore.getSession(code)
      if (session) {
        session.finished = true
        session.status = 'finished'
        await sessionStore.updateSession(code, session)
      }
    }),

  setReconfiguring: async (code: string): Promise<boolean> =>
    withSessionLock(code, async () => {
      const session = await sessionStore.getSession(code)
      if (session) {
        session.status = 'reconfiguring'
        await sessionStore.updateSession(code, session)
        return true
      }
      return false
    }),

  reconfigureSession: async (
    code: string,
    filters: Filters,
    restaurants: Restaurant[],
    location: { lat: number; lng: number }
  ): Promise<Session | null> =>
    withSessionLock(code, async () => {
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
    }),

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
