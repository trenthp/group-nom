# Group Nom

A collaborative restaurant discovery app where groups can swipe on restaurants together and find matches. Think "Tinder for restaurants, but as a group."

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Clerk (@clerk/nextjs)
- **Database/Cache**: Vercel KV (Redis)
- **Rate Limiting**: @upstash/ratelimit
- **Restaurant Data**: Google Maps Places API
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
├── types.ts              # TypeScript interfaces (Session, Restaurant, Vote, etc.)
├── sessionStore.ts       # Vercel KV session operations
└── googleMaps.ts         # Google Maps API integration
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
- `KV_REST_API_URL` - Vercel KV URL
- `KV_REST_API_TOKEN` - Vercel KV token
- `GOOGLE_MAPS_API_KEY` - Google Maps API key

## API Rate Limits

Configured in `middleware.ts`:
- Session creation: 5/min
- Voting: 30/min
- Restaurant search: 10/min
- General API: 120/min

## Notes

- Mobile-first design with swipe gestures for voting
- Anonymous users get a generated ID stored in session
- Host has elevated controls (start/stop voting, reconfigure)
