# Group Nom

A community library of loved places. Members nominate the restaurants they love — photo plus why they love it — and build each place's page together (favorite dishes, hours notes, menu links, parking tips). Group voting sessions ("Tinder for restaurants, but as a group") draw from that community data.

**Positive-only by design**: there are no ratings and no reviews. The only signal a place can accumulate is love — nominations, backers, group wins. Places that decline just quietly stop being surfaced.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Clerk (@clerk/nextjs)
- **Sessions/Cache**: Vercel KV (Redis)
- **Restaurant Data**: Own Neon Postgres DB — Overture Maps seed (free, bulk) + community nominations. No paid data APIs.
- **Geospatial**: H3 (h3-js) hexagonal indexing for nearby queries
- **Geocoding**: LocationIQ (free tier)
- **Photos**: User-uploaded via Vercel Blob (community nomination photos)
- **Rate Limiting**: @upstash/ratelimit
- **Analytics**: Vercel Analytics
- **Validation**: Zod

## Project Structure

```
app/
├── page.tsx              # Landing page (start/join session)
├── layout.tsx            # Root layout with SessionProvider
├── setup/                # Session setup flow (host creates session)
├── session/              # Active session pages (voting UI)
├── sign-in/              # Clerk sign-in page
├── sign-up/              # Clerk sign-up page
├── about/                # About page
└── api/
    ├── geocode/          # Location geocoding
    ├── restaurants/      # Restaurant search endpoints
    └── session/          # Session CRUD and voting
        └── [code]/       # Dynamic routes for session operations
            ├── route.ts          # Get/create session
            ├── status/           # Session status polling
            ├── vote/             # Submit votes
            ├── close-voting/     # End voting phase
            └── set-reconfiguring/ # Host reconfigure session

components/
├── auth/                 # SessionProvider, UserMenu
├── icons/                # Custom SVG icons
├── landing/              # Landing page components
├── Header.tsx            # App header
├── Footer.tsx            # App footer
├── LocationInput.tsx     # Location search input
├── ShareCode.tsx         # Session code sharing UI
├── WaitingScreen.tsx     # Waiting for host/results
└── HostStatusPanel.tsx   # Host controls panel

lib/
├── types.ts              # TypeScript interfaces (Session, Restaurant, Nomination, etc.)
├── sessionStore.ts       # Vercel KV session operations
├── db.ts                 # Neon Postgres client
├── restaurantDiscovery.ts # Own-DB voting deck builder (H3 + nomination weighting)
├── nominations.ts        # Nomination CRUD (positive-only endorsements)
├── restaurantEnrichment.ts # Wiki-style factual data (hours, menu, parking)
├── social.ts             # Co-nominators and backers
├── completeness.ts       # Restaurant page completeness scoring
├── h3.ts                 # H3 geospatial utilities
└── geolocation.ts        # Browser geolocation helper
```

## Key Concepts

### Session Flow
1. **Host** starts a new session at `/setup`
2. Host configures filters (location, cuisine, rating, price)
3. System generates a 6-character session code
4. **Participants** join via code at `/session/[code]`
5. Once host starts voting, everyone swipes on restaurants
6. Host closes voting to reveal matches (restaurants everyone liked)

### Session States
- `pending` - Created, waiting for host to start voting
- `active` - Voting in progress
- `reconfiguring` - Host is changing settings
- `finished` - Voting closed, results available

### Data Storage
Sessions are stored in Vercel KV with 24h TTL. Key format: `session:{code}`

Restaurant data lives in Neon Postgres, seeded state-by-state from Overture Maps
(free bulk data, `scripts/import-overture.py`) and enriched by the community.
Seeded-but-unnominated restaurants feed voting decks but stay out of the
browsable library until someone nominates them.

### Nomination Layer
- **Nomination**: photo + "why I love it" (required), favorite dishes + good-for tags (optional). One per user per restaurant. No ratings, no reviews.
- **Enrichment**: wiki-style shared facts per restaurant (hours notes, menu URL, parking) — any signed-in member can update.
- DB triggers maintain `nomination_count` on restaurants and user_profiles.

### Seeding a new state
```bash
scripts/.venv/Scripts/python.exe scripts/import-overture.py \
  --release 2026-07-22.0 --states GA --bbox=-85.7,30.3,-80.7,35.1
```
~3 minutes and ~50MB per Florida-sized state. Check current release names at
s3://overturemaps-us-west-2/release/.

## Development

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # Run ESLint
```

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key
- `CLERK_SECRET_KEY` - Clerk secret key
- `CLERK_WEBHOOK_SIGNING_SECRET` - Clerk webhook (user.created/updated/deleted → `/api/webhooks/clerk`)
- `db1_KV_REST_API_URL` - Upstash Redis URL (marketplace integration; legacy `KV_REST_API_URL` also accepted)
- `db1_KV_REST_API_TOKEN` - Upstash Redis token (legacy `KV_REST_API_TOKEN` also accepted)
- `DATABASE_URL` - Neon Postgres connection string
- `LOCATIONIQ_API_KEY` - LocationIQ geocoding (free tier)
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob for nomination photos

## API Rate Limits

Configured in `middleware.ts`, tiered anon/authenticated:
- Session creation: 3/day anon, 10/day auth
- Voting: 30/min anon, 60/min auth
- Restaurant search: 5/min anon, 20/min auth
- Geocoding: 20/min anon, 30/min auth
- Photo upload: 30/hour (auth required)
- General API: 60/min anon, 120/min auth

## Notes

- Mobile-first design with swipe gestures for voting
- Sessions require sign-in; identity is the Clerk userId, verified server-side
- Host has elevated controls (start/stop voting, reconfigure); host checks use `auth()`, never client-supplied ids

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
