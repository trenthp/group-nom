# Group Nom Sitemap

## Pages Overview

```
/                       Landing / Dashboard (depends on auth)
├── /sign-in            Clerk sign-in
├── /sign-up            Clerk sign-up
├── /setup              Create new group session (host)
├── /session/[code]     Active voting session
├── /discover           Solo restaurant discovery (swipe)
├── /saved              User's saved/liked restaurants
├── /groups             Saved friend groups
│   ├── /groups/[id]    View specific group
│   └── /groups/join    Join a group via invite
├── /about              About page
├── /privacy            Privacy policy
└── /terms              Terms of service
```

---

## User Flows

### Flow 1: Anonymous User - Group Voting

```
Landing Page (/)
    │
    ├── [Start a Group] → /setup
    │       │
    │       ├── Set location
    │       ├── Configure filters (cuisine, price, distance, etc.)
    │       └── [Start Session] → /session/[code]
    │               │
    │               ├── Share code with friends
    │               ├── Wait for participants
    │               ├── [Start Voting] (host only)
    │               ├── Swipe on restaurants
    │               └── View results (matches)
    │
    └── [Join a Group] → Enter code → /session/[code]
            │
            ├── Wait for host to start
            ├── Swipe on restaurants
            └── View results
```

### Flow 2: Authenticated User - Dashboard

```
Dashboard (/)
    │
    ├── [Start a Group] → /setup → /session/[code]
    │
    ├── [Join a Group] → Enter code → /session/[code]
    │
    ├── [Discover] → /discover
    │       │
    │       ├── Swipe on restaurants (solo)
    │       ├── Likes saved to /saved
    │       └── Batch breaks every 10 cards
    │
    ├── [Saved] → /saved
    │       │
    │       └── View liked restaurants
    │
    └── [Groups] → /groups
            │
            ├── View saved friend groups
            ├── Create new group
            └── /groups/[id] → Start session with group
```

### Flow 3: Session Lifecycle

```
Host creates session (/setup)
    │
    ▼
Session created (status: pending)
    │
    ├── Participants join via code
    │
    ▼
Host starts voting (status: active)
    │
    ├── All users swipe on restaurants
    ├── Votes recorded in real-time
    │
    ▼
Voting ends (status: finished)
    │
    ├── Auto: All users finish voting
    └── Manual: Host clicks "Close Voting"
            │
            ▼
    Results displayed
        │
        ├── Winner(s) shown
        ├── Vote breakdown available
        │
        └── Host can [Reconfigure] → (status: reconfiguring)
                │
                └── New restaurants fetched → back to voting
```

---

## Page Details

### `/` - Home
| User State | View |
|------------|------|
| Anonymous | Landing page with Start/Join group options |
| Authenticated | Dashboard with stats, quick actions |

### `/setup` - Create Session
- Location input (auto-detect or manual)
- Filter configuration:
  - Cuisines
  - Price levels ($-$$$$)
  - Distance radius
  - Minimum rating
  - Open now toggle
  - Prefer local toggle
- Creates session, redirects to `/session/[code]`

### `/session/[code]` - Active Session
| Phase | View |
|-------|------|
| Pending | Waiting room, share code |
| Active | Swipe cards, vote yes/no |
| Reconfiguring | "Host changing settings" message |
| Finished | Results with winner(s) |

### `/discover` - Solo Discovery
- Geolocation-based restaurant feed
- Swipe right = like (saved if signed in)
- Swipe left = pass
- Batch breaks every 10 cards
- Anonymous users prompted to sign up

### `/saved` - Favorites
- List of liked restaurants
- Links to Google Maps
- Requires authentication

### `/groups` - Friend Groups
- Saved groups of friends
- Quick-start sessions with existing groups
- Requires authentication

---

## API Endpoints

### Session Management
```
POST   /api/session/create           Create new session
GET    /api/session/[code]           Get session details
GET    /api/session/[code]/status    Poll session status
POST   /api/session/[code]/vote      Submit vote
POST   /api/session/[code]/close-voting    End voting (host)
POST   /api/session/[code]/reconfigure     Change filters (host)
POST   /api/session/[code]/set-reconfiguring  Set reconfigure mode
GET    /api/session/[code]/results   Get voting results
```

### Restaurants
```
POST   /api/restaurants/nearby       Search restaurants
POST   /api/restaurants/like         Like a restaurant (auth required)
```

### User Data
```
GET    /api/favorites                Get user favorites
GET    /api/favorites/check          Check if restaurant is favorited
GET    /api/user/profile             Get user profile & stats
```

### Groups
```
GET    /api/groups                   List user's groups
POST   /api/groups                   Create group
GET    /api/groups/[id]              Get group details
DELETE /api/groups/[id]              Delete group
POST   /api/groups/[id]/members      Add member
DELETE /api/groups/[id]/members      Remove member
POST   /api/groups/join              Join via invite code
```

### Utilities
```
GET    /api/geocode                  Reverse geocode lat/lng
GET    /api/places/photo             Proxy Google Places photos
```

---

## Authentication States

| State | Can Access |
|-------|------------|
| Anonymous | `/`, `/setup`, `/session/*`, `/about`, `/privacy`, `/terms` |
| Authenticated | All pages |

**Anonymous Limitations:**
- 5 restaurants per session (vs 10 for auth)
- Likes not saved
- No `/saved`, `/groups`, `/discover` access

---

## Questions for Discussion

1. **Entry points**: Is the anonymous landing page effective? Should we A/B test?

2. **Discover vs Groups**: These feel like separate products. Should discover be more prominent?

3. **Session flow**: Is the host/participant distinction clear enough?

4. **Mobile UX**: Any specific mobile flow issues to address?

5. **Conversion points**: Where should we prompt sign-up more aggressively?
