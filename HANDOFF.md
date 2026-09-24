# Developer Handoff — Community Library Pivot

_Last updated: September 24, 2026, on branch `community-library`_

This document is for the developer picking up the community-library pivot.
Read `CLAUDE.md` first for the product vision and tech stack; this file covers
**where the work actually stands, the traps, and what's left**.

---

## The pivot in one paragraph

Group Nom pivoted from "Google Places + group swiping" to a **positive-only
community library of loved places**. All restaurant data is now our own
(Overture Maps seed + community nominations in Neon Postgres). There are no
ratings and no reviews anywhere, by design — the only signals a place can
accumulate are nominations (photo + why-I-love-it), likes, and group-session
wins. Places that decline just quietly stop being surfaced. Group voting is
now a feature *within* the library, not the core product. Zero paid APIs
remain: Overture (free bulk), LocationIQ (free tier), Neon, Vercel KV/Blob.

## Branch state

- **`community-library`** is the active branch. Everything below happened here
  and is pushed to origin as of September 24, 2026. Before that push the
  branch had been local-only for six weeks; keep it pushed.
- **`main`** is pre-pivot (Google-based). Do not merge main forward without
  understanding the pivot removed Google entirely.
- **`map`** branch: a UI component library (`components/ui/`, 14 components),
  design tokens in `tailwind.config.ts`, Leaflet-style map views, and a
  location picker. Built pre-pivot against Google-era data. **Reconciling this
  is the biggest remaining task** (see below).
- **`architecture`** branch: the original pivot prototype. Everything valuable
  has been harvested (nomination layer, Overture importer, H3 utils,
  LocationIQ geocode). Treat as read-only history.
- `origin/claude/security-check-U4Z7A`: the Feb security audit
  (`SECURITY_AUDIT.md`). Its still-applicable findings were fixed in commit
  `2dfd8c4`; the deferred ones are listed below. Safe to delete the branch
  after skimming.

## Database (Neon Postgres)

The **live DB schema is the source of truth** — it matches the code on this
branch. Migrations under `scripts/db/` were applied manually via
`npx tsx scripts/run-sql-migration.ts scripts/db/00X-*.sql` (the Neon HTTP
driver runs one statement at a time; the runner handles `$$` bodies).

Applied to the live DB: 004 (nomination triggers, counts, views),
005 (Overture columns + H3 indexes), 006 (recreated
`restaurants_with_nominations` view — Postgres freezes `r.*` at CREATE VIEW,
so any future column additions to `restaurants` require re-running 006),
007 (member architecture: `user_profiles.timezone/status/last_active_at/
trust_score/trust_updated_at`, `anonymize_member()` function), 008 (`pg_trgm`
+ trigram index on `restaurants.name`, lat/lng index — powers name search).

Migration-runner trap: it splits on every `;`, **including inside comments**.
Never put a semicolon in a SQL comment.

Data: **Florida is seeded** — ~96k restaurants from Overture release
`2026-07-22.0`, ~48MB. Strategy is **state-on-demand** (NOT nationwide — it
would blow the 512MB Neon free tier). To seed a state:

```bash
scripts/.venv/Scripts/python.exe scripts/import-overture.py \
  --release 2026-07-22.0 --states GA --bbox=-85.7,30.3,-80.7,35.1
```

~3 min/state. The `--bbox` matters — it enables parquet row-group pruning.
Check current release names at `s3://overturemaps-us-west-2/release/`.
The importer stamps `source='overture'` and is idempotent (upsert on gers_id).

Key invariant: **seeded-but-unnominated places feed voting decks but never
appear in the browsable library** (`/library` queries `nomination_count > 0`).
Everything a user sees in the library, someone loved.

## Environment traps (each of these burned us once)

1. **Redis env vars are `db1_`-prefixed** (`db1_KV_REST_API_URL`,
   `db1_KV_REST_API_TOKEN`) from the Upstash marketplace integration, host
   `saved-cat-153037.upstash.io`. They're marked *Sensitive* in Vercel, so
   `vercel env pull` returns `[SENSITIVE]` placeholders — copy real values
   from the Upstash console. `lib/kv.ts` accepts `db1_`/`DB1_`/legacy names;
   all KV access must go through it (never import `kv` from `@vercel/kv`
   directly). The `db1_` vars exist in Production+Preview only — Development
   scope was never added.
2. **Clerk keys are environment-scoped in Vercel**: `pk_live`/`sk_live` on
   Production+Preview (domain-locked to groupnom.com), `pk_test`/`sk_test` on
   Development. `vercel env pull .env.local` is now safe. If sign-in on
   localhost ever throws "Production Keys are only allowed for domain
   groupnom.com", someone put live keys back in Development.
3. **`vercel env rm <name> development` deletes the variable from ALL
   environments**, not just one. Copy values before touching env config.
4. `GOOGLE_MAPS_API_KEY`, `TRIPADVISOR_API_KEY`, `FOURSQUARE_API_KEY` in
   Vercel are dead — delete when convenient.
5. Session routes must **never fetch their own API over HTTP**
   (`request.nextUrl.origin` self-fetch fails on Windows dev with
   ECONNREFUSED and burns rate limits) — call `getDiscoveryDeck()` directly,
   as `session/create` and `reconfigure` now do.

## Code map (pivot-era files)

- `lib/restaurantDiscovery.ts` — the heart. `getDiscoveryDeck()` builds voting
  decks (H3 k-ring query, nominated places weighted ~10x, chain
  deprioritization, distance nudge). `getLibraryNearby()` powers `/library`
  (nominated-only). NOTE: tagged-template `sql` calls handle BigInt; the
  parameterized `sql.query()` path does NOT — pass H3 cells as strings with
  a `::bigint[]` cast.
- `lib/nominations.ts`, `lib/restaurantEnrichment.ts`, `lib/social.ts`,
  `lib/completeness.ts` — nomination CRUD, wiki-style facts, backers,
  completeness scoring. DB triggers maintain `nomination_count`.
- `app/library`, `app/restaurant/[id]`, `app/nominate/[restaurantId]` — the
  library surfaces. All dark-themed (`#222222` page / `#333333` cards /
  `#EA4D19` accent) to match the app's evolved style.
- `app/api/session/[code]/close-voting` — also records `group_win_count`
  for the winning restaurant(s) (ties share the win).
- `scripts/import-overture.py` + `scripts/requirements.txt` — seeder
  (venv at `scripts/.venv`, gitignored).

## What has NOT been human-tested

~~The full nomination loop~~ — done: the first real nomination (Voodoo Bayou,
Orlando, Aug 2026) exists in the DB and renders on the wall, the library list,
the library map popup, and the restaurant page.

## Product direction (decided Aug 13–14, 2026)

Full plan in the "Library Loop" Claude artifact and
`memory/product-direction.md`. The product is an **ad-free, community-built
list of the best local places**; joining means contributing. The experience
is a **membership ladder**:

**tease → join → contribute → belong**

1. **Tease** (signed out): marketing pages only, with teased aggregates
   ("23 places loved near Orlando" — counts, never names/photos/content).
2. **Join** (member, not yet nominated): a limited taste of their local
   area — **"Today's Five"**, a deterministic daily sample (seed = user +
   local date, same five across list, map, and Discover all day; random
   per-request would be scrapeable and make the map look broken). They CAN
   save to the try-list (saving is intent, not access) and CAN join group
   sessions with full decks (deliberate leak — sessions are the growth
   engine).
3. **Contribute**: the first published nomination unlocks the full library,
   forever. Derive "unlocked" from `nomination_count > 0` — no separate flag.
4. **Belong**: daily rhythm — drafts, follows, sessions.

### Nomination mechanics
- **One nomination per day**, resetting at the **user's local midnight**
  (capture tz from the browser at publish time). Server-enforced.
- **Drafts**: private nomination drafts, unlimited, one per user+restaurant.
  Publishing a draft counts as the day's nomination. IMPORTANT: don't upload
  draft photos to Blob at draft time — Vercel Blob URLs are public-if-known;
  defer photo upload to publish.
- **"Visit again first" is framing, not enforcement** (no geofencing/receipt
  verification — privacy). The nominate flow asks "when were you last
  there?": recent → proceed; been a while → "go support them again first"
  and save as a draft. Drafts double as the revisit queue. The daily limit
  pushes overflow into drafts → drafts + limit = the daily return loop
  ("your next nomination unlocks tomorrow"). Say it out loud in the UX.
- **Chains are soft-discouraged**, not blocked: the nominate search flags
  known chains ("Group Nom is for local spots — this one has ~500
  locations") using the existing chain-detection data, but lets a determined
  member proceed.
- Photo + why-I-love-it stay required. No ratings, no reviews, ever.

### Follows (anti-clout by design)
- Members can follow and be followed. Following delivers a home-feed section
  ("Alex T. nominated Voodoo Bayou yesterday") and access to shelves.
- **No follower/following counts or lists are ever displayed** — ranking
  people by influence is the same disease as star ratings. Blocking must
  exist (block = they can't follow you).

### Trust-weighted ranking (internal only)
- Wherever nominated places are ranked (library order, discovery decks,
  Today's Five sampling, shelves), weight = nomination count **and the
  quality of the nominating users**.
- User quality is an **internal score, never displayed**, mixing:
  **interaction** (engagement with the app), **nominations** (their
  nomination history/completeness), and **followers**. The follower input
  activates once follows ship; v1 of the score can run on the first two.

### Session deck sources
Host picks the deck source at setup:
- **Group favorites** — only available when starting from a saved Group
  (`/groups` roster): deck draws from that roster's nominations. (Decks are
  built at creation, before ad-hoc joiners exist — that's why this mode is
  roster-gated.)
- **Library only** — nominated places from anyone.
- **Mix** — current behavior: library + Overture seed, nominations weighted.

### Also decided
- Cold-start copy inversion: in an empty area the gate unlocks nothing, so
  onboarding pitches mission instead ("be the first — put your town on the
  map"). Choose the script by local library count; the teased-aggregate
  number tells you which. The empty-but-joined screen is the highest-stakes
  screen in the app — design it with care.
- Moderation floor before growth features: report action on nominations,
  admin remove (the `/admin` route exists, is empty), "report as closed"
  that quietly hides a place (positive-only compatible). Count triggers
  already handle deletes.
- Ladder metrics from day one: join → first-nomination conversion, draft
  publish rate, Today's Five open rate, follows per member, invites.

### Member architecture (decided + built Aug 27, 2026)
The full map of user types and their flows lives in the "Who Uses Group Nom"
artifact: https://claude.ai/code/artifact/72fb2f18-01ad-4742-89e0-4899d048434e
(visitor / new member / contributor / host+participant / a member as seen by
others / moderator / former member, plus a permission matrix).

- **Profile rows are guaranteed**: `ensureProfile()` (upsert, also bumps
  `last_active_at`) runs at the top of every mutating path — nominate,
  enrich, session create, session join. Without it the nomination-count
  trigger silently UPDATEs zero rows and the member never unlocks.
- **Clerk webhook** `app/api/webhooks/clerk/route.ts` (`user.created` /
  `user.updated` → `syncProfileFromClerk`, `user.deleted` → anonymize).
  Verified via `verifyWebhook` from `@clerk/nextjs/webhooks`; needs
  `CLERK_WEBHOOK_SIGNING_SECRET`. Exempt from auth + rate limiting in
  middleware. **Owner setup still required**: Clerk Dashboard → Webhooks →
  add endpoint `https://groupnom.com/api/webhooks/clerk`, subscribe to the
  three user events, paste the signing secret into Vercel env (all scopes).
  Until then the route returns 503 and profiles still work via lazy
  `ensureProfile` — only name/avatar changes and deletions won't propagate.
- **Account deletion = anonymize** (owner decision Aug 27): `anonymize_member()`
  nulls name/avatar/tz, sets `status='deleted'`, deletes favorites, group
  memberships and owned groups. Nominations, photos, enrichments stay and
  render as "A former member" (`publicNameFor()` in `lib/userProfile.ts` —
  every read boundary now selects `up.status`).
- **Ladder state is derived, never stored**: `isUnlocked(profile)` =
  `nomination_count > 0`; `canPublish(profile)` = `status === 'active'`.
  `GET /api/user/profile` returns both. Enrichment PATCH is
  **contributor-only** (unlocked) and refuses suspended accounts.
- **Member page** `/member/[id]` (opaque `user_profiles.id` UUID, never the
  Clerk id) with `GET /api/members/[id]`. Two modes on one route decided by
  `isSelf` server-side: others see First L. + avatar + their nominations
  (no counts, nothing rankable); you see the same plus your ladder state.
  The nominate flow's "Done" now lands on your page, with `?welcome=1` on
  the nomination that unlocked the library (the "You're in" moment).
  Nominator names on restaurant pages link there (`Nomination.user.memberId`).
- `Nomination.restaurant {name, city}` is joined for the member page.
- `PUT /api/user/profile` accepts `timezone` (IANA) — the daily-limit input.

### Schema still to come
`follows` (+ blocks, composite PKs, no counters), session metadata
`deckSource`. Trust score columns already exist (unused until Phase 4).
Applied so far beyond 007: 008 (name search), 009 (daily limit), 010
(drafts).

### Build order
**Phase 0 structural ✅ complete** (member gates; First L. attribution;
sessions require sign-in — session identity is the Clerk userId end to end,
host checks via `auth()`, GET returns per-requester `isHost`). NOTE: the
signed-in session flow was verified by build + signed-out gate checks only —
needs one human run-through (create → invite/join → vote → close → results).

1. **The nomination system** — workstreams, in dependency order:
   - ✅ **Zero: member architecture** (migration 007, `ensureProfile`, Clerk
     webhook, anonymize-on-delete, `isUnlocked`/`canPublish`, `/member/[id]`,
     the "You're in" landing). See "Member architecture" above.
   - ✅ **A. Search-first entry**: `/nominate` (location-aware, debounced
     name search) → `GET /api/restaurants/search?q&lat&lng`
     (`lib/restaurantSearch.ts`: trigram similarity within a ~40km box,
     ranked by match band then distance, seeded-but-unnominated places
     included on purpose) → result card links straight into the existing
     `/nominate/[restaurantId]` capture flow. CTAs: home "Nominate a place"
     card, library header "+ Nominate", library empty state. Verified
     against live data: "vodoo bayou" → Voodoo Bayou, <250ms. Empty-result
     copy points at the add-a-place fallback (G) as "coming soon".
   - ✅ **D. One per day at local midnight** (migration 009:
     `nominations.local_date`, `published_tz`, partial unique index
     `nominations_one_per_local_day` — legacy rows stay NULL and never
     count). `lib/dailyLimit.ts` does the zone math with `formatToParts`
     (server-zone independent — tested NY/LA/Tokyo/UTC/Kolkata). Browser
     sends its IANA zone with the upload *and* the publish; the upload
     endpoint pre-checks too so a blocked publish never orphans a Blob
     photo. `GET /api/nominations/today?tz=` feeds the capture page (shows
     the "already on the shelf today" state instead of the form) and the
     self member page ("next opens at …"). The 429 carries
     `code: 'DAILY_LIMIT'` + `resetsAt`. When drafts land (C), the
     limit-hit state should offer "save as draft".
   - **E. Unlock moment** — landing built; wire the celebration copy to the
     actual gate once Phase 2 ships.
   - ✅ **B. Recency question**: `/nominate/[id]` now opens on "When were
     you last there?" (skipped when a draft already exists — they answered).
     "It's been a while" → the revisit screen (optional "what do you
     remember loving?") → draft with `reason='revisit'`.
   - ✅ **C. Private drafts** (migration 010: `nomination_drafts`, no photo
     column, `UNIQUE(clerk_user_id, gers_id)`, `reason` ∈ revisit/later/
     limit; `anonymize_member()` now clears them). `lib/drafts.ts` +
     `GET/POST /api/nominations/drafts`, `GET/DELETE
     /api/nominations/drafts/[gersId]`. Entry points: revisit screen, the
     limit-hit screen ("save it for tomorrow"), and a "no photo handy?"
     link under the capture form. Publishing deletes the draft
     server-side. Drafts render on the self member page (Nominate /
     Remove) and home shows "N drafts waiting for you →".
   - ✅ **F. Chain soft-discourage**: `lib/chains.ts#isLikelyChain` = the
     deck keyword heuristic ∪ `chain_names` (≥5 locations) ∪ ≥6 same-name
     rows in the seed. Surfaced as `likelyChain` on
     `/api/restaurants/[id]/details` and shown as a note on the recency
     step. Never blocks.
   - ✅ **G. Add-a-place fallback**: `/nominate` empty state → "Add … as a
     new place" → `POST /api/restaurants/community` (`lib/geocode.ts`
     forward-geocodes via LocationIQ, refuses a twin — similar name within
     300m — with 409 + the match, which the UI offers as "Is it this
     one?"). Inserts `gers_id = cmty_…`, `source='community'`, H3 res8/9,
     then routes into the capture flow. Rate limited with uploads.
   **Phase 1 is complete.** Untested by a human end to end — see the
   session-test note; the nominate flow needs the same run-through.
2. ✅ **The gate + Today's Five + moderation floor** (Aug 27, 2026):
   - `lib/gate.ts`: `getTodaysFive(userId, tz, lat, lng)` — candidates
     from `getLibraryNearby` (25km, up to 200), sorted by id then shuffled
     with a seeded PRNG (`userId|localDate`), first five; memoized in KV
     (`five:{user}:{date}`, 36h) so the set holds all day and the page
     check is one read. `canOpenRestaurant()` = unlocked, or in the five,
     or saved/drafted/own-nominated, or in a session deck the member is in
     (`?session=CODE`, the winner card passes it).
   - Served by `/api/library` (`limited: true, totalNearby`), by
     `POST /api/restaurants/nearby` (Discover swipes the same five, then
     runs out), and enforced on `GET /api/nominations/restaurant/[id]`
     (403 `code: 'GATED'`). Restaurant details stay open — the nominate
     flow needs name/address for any searchable place; the *wall* is the
     content. `/restaurant/[id]` renders a teaser card on 403.
   - Onboarding: home leads with "Nominate your first place" + "Today's
     Five" for pre-unlock members (from `isUnlocked` on the profile API);
     the library header/banner explains the five and counts what opens.
     Empty-area mission copy was already on the library empty state.
   - Moderation (migration 011): `reports` table (one per member per
     target), `restaurants.hidden_at` quiet-hide (filtered out of
     library, decks, search, and the five), `POST /api/reports`,
     `components/ReportButton` (per nomination + place-level "closed /
     not a restaurant"), `/admin` queue with dismiss / remove nomination /
     hide place / suspend member (`/api/admin/reports*`). Moderator role =
     Clerk `publicMetadata.role` ∈ {admin, moderator} (`lib/admin.ts`);
     non-moderators get 404. **Owner setup**: set `{"role":"admin"}` in
     your user's Public metadata in the Clerk Dashboard.
3. ✅ **Follows + home feed + try-list** (Aug 27, 2026; migration 012:
   `follows`, `blocks`, no counter columns by design; `anonymize_member`
   clears both). `lib/follows.ts`: follow/unfollow, block/unblock (severs
   follows both ways, refuses re-follow), `getFeed` (followees' nominations,
   newest first, active members only, hidden places and blocks excluded).
   API: `POST/DELETE /api/members/[id]/follow`, `…/block`, `GET /api/feed`.
   `GET /api/members/[id]` returns `viewer: {following, blocked}` for
   others; a member who blocked you (or whom you blocked, except that you
   still see your own block to undo it) 404s. Member page: Follow /
   Following pill + ⋯ menu with Block. Home: "From people you follow"
   section (top 6). Gate: pre-unlock members can open any place loved by
   someone they follow. Try-list framing: Saved → "Places to try" / home
   card "To try". Still no counts, no lists, no notifications anywhere.
   Not built: "shelves" as a separate concept — a member's page *is* their
   shelf; situational shelves are Phase 6.
4. ✅ **Trust-weighted ranking** (Aug 27, 2026; migration 013). The math
   is in Postgres so it can never drift from the data:
   `compute_trust_score(user)` = 1.0 + nomination history (≤ +1.0) +
   agreement share (≤ +0.5) + enrichments (≤ +0.5) + active-in-30d (+0.2)
   + followers (≤ +0.5), clamped 0–3; suspended → 0; deleted keeps last.
   `restaurants.love_score` = Σ nominators' trust, maintained by the 004
   count triggers (now call `recompute_love_score`) and by a trigger on
   `user_profiles.trust_score` that re-weights every place the member
   loves. App side (`lib/trust.ts#recomputeTrust`, fire-and-forget) runs
   after publish, enrichment, follow/unfollow/block, and suspension.
   Ranking now uses `love_score` in the library list/map order and in the
   deck score (Today's Five draws from the love-ordered pool). Trust is
   never serialized: `mapDbToProfile` omits it — keep it that way.
   Not done: a scheduled full recompute (the 30-day activity input decays
   without one). Add a cron hitting
   `SELECT recompute_trust_score(clerk_user_id) FROM user_profiles WHERE nomination_count > 0`
   nightly when there's a scheduler.
5. ✅ **Session deck sources** (Aug 27, 2026). `lib/deckSources.ts#buildDeck`:
   `mix` (current love-weighted discovery), `library` (nominated-only via
   `getLibraryNearby`, love-ordered), `group` (places nominated by the
   saved group's roster, ordered by roster votes then love;
   `getGroupWithMembers(groupId, hostId)` enforces the host is on the
   roster). Under 3 places → falls back to `mix` and reports
   `deckFellBack`. Wired into `session/create` and `reconfigure`
   (`deckSource`, `groupId` in the Zod schemas; stored on
   `SessionMetadata`). Setup page has a three-way picker + group select
   (fetches `/api/groups`). Not surfaced yet: the fallback notice on the
   session waiting screen (the create response carries `deckFellBack`).
6. ✅ **Situational shelves + sharing** (Aug 27, 2026).
   - Shelves: chip row on `/library` (Date night, With kids, Groups, Solo,
     Quick bite, Late night, Brunch) → `/api/library?shelf=<good_for tag>`
     → `getLibraryNearby(..., { goodFor })` (places with at least one
     nomination carrying the tag, still love-ordered). Hidden for
     pre-unlock members — the five are the five. Dish shelves not built:
     favorite dishes are free text; needs normalization first.
   - Sharing: `/restaurant/*` is member-gated, so unfurlers would hit a
     sign-in redirect. Share links go to **`/p/[id]`** (public, server
     component, `generateMetadata` + `opengraph-image.tsx` via `next/og`):
     name, town, "Loved by N locals" — never a photo/quote/member
     (`lib/teaser.ts`). Share button on the restaurant page uses
     `navigator.share` or copies the link. `/p` is outside the member
     matcher on purpose.

Parallel any time: marketing rewrite (hero = ad-free community library of
loved local places; group voting is the second act; stale rating/price copy
dies).

## Frontend restructure (Sep 24, 2026)

Done in one sitting after the merge to `main`, once the owner had
human-tested nominate + sessions on production. Decisions in
`memory/frontend-restructure.md`.

- **Nav is four tabs**: Home / Library / Discover / Profile
  (`components/BottomNav.tsx`). Nominate is the primary action on Library,
  not a tab. `/profile` (server component) resolves the member's own page.
  `/saved` became `/to-try` (permanent redirect kept); the list is called
  "To try" everywhere. Groups hang off Home and the profile page.
- **Discover is the curation surface**, not a swipe deck. `lib/discover.ts`
  picks hexes vs points from the bbox size (never trusted from the client):
  H3 res-8 groups rolled up to res 5–8 in Node, dim CircleMarkers for
  unlit places, the ember marker for loved ones, tap a hex to zoom in.
  Cards view deals ten random places from the view; skip records nothing.
  Save to try is primary, Nominate secondary, report (closed / not a
  restaurant / duplicate — migration 015) under a quiet link. Open to
  pre-unlock members: dots are public seed data; photos only when unlocked.
  Verified on live data: 65 ms neighborhood, <500 ms metro.
- **Landing rewritten** around the mission with a teased aggregate from
  `GET /api/tease` (public; reads Vercel's `x-vercel-ip-*` geo headers, so
  it says "N places loved near Orlando" without a browser prompt; falls
  back to a global count locally). Primary CTA is Join; the session code
  box is the second act. `/about` is a dark mission page linked from the
  footer. Sign-in/up copy pitches the library, not saving.
- **Setup** is one screen: deck source first, then where/how far. The
  "pick from favorites" fork and the NYC fallback are gone.
- **Legal pages** rewritten for the pivot (Overture/OSM/LocationIQ, what is
  public vs never shown, delete = anonymize). Deleting a nomination now
  deletes its Blob photo (`lib/photos.ts`).
- **Dead code removed**: the like signal and its route, the old nearby deck
  route, LocalBadge, the anonymous tier (`lib/userTiers.ts` is one
  constant), `Restaurant.rating/reviewCount/priceLevel`, the rating/price
  filter fields, the Google directions links (OSM now), the landing
  components, and every signed-out branch behind the member gate.

## Remaining work, in rough priority order

1. **Human pass on the new surfaces**: Discover (map + cards + sheet +
   report), the landing tease on production (geo headers only exist on
   Vercel), the profile tab, the to-try list, and setup.
2. **Nightly trust recompute** — still no scheduler. A Vercel cron hitting
   `SELECT recompute_trust_score(clerk_user_id) FROM user_profiles WHERE nomination_count > 0`
   is the whole job.
3. **Keyed basemap before growth** (CARTO or Stadia) — one line in
   `RestaurantMap.tsx` + `DiscoverMap.tsx` and the host in the CSP img-src.
4. **Owner setup still outstanding**: Clerk webhook endpoint +
   `CLERK_WEBHOOK_SIGNING_SECRET`; `publicMetadata.role=admin` on the
   owner's user; delete dead Google/TripAdvisor/Foursquare keys from Vercel
   env; Preview scope should carry Clerk **test** keys (live keys are
   domain-locked, so previews can never sign in as configured).
5. The owner has two profiles (dev-instance user with the August
   nominations, prod-instance user with the rest). Reassign the two August
   nominations with one UPDATE on `nominations.clerk_user_id` if wanted.
6. Lint debt: `<img>` vs `next/image` in a few places, setState-in-effect
   patterns in the session page. Fix when touching those files.
7. Session voting screens still use raw sunset classes rather than the
   kit's glass variants — consistent, just not tokenized.

## Development

```bash
npm run dev      # dev server (needs .env.local — see traps above)
npm run build    # includes typecheck; scripts/ is excluded from tsconfig
npm run lint     # eslint 9 flat config (eslint.config.mjs)
```

`.env.local` needs: Clerk test keys, `DATABASE_URL`, `db1_KV_REST_API_URL` +
`db1_KV_REST_API_TOKEN`, `LOCATIONIQ_API_KEY`, `BLOB_READ_WRITE_TOKEN`,
and `CLERK_WEBHOOK_SIGNING_SECRET` once the webhook endpoint exists in Clerk
(a Development-instance endpoint can point at an ngrok/`vercel dev` tunnel).

Gate checks with curl: Clerk's `auth.protect()` answers plain curl with a
**404**, and only redirects (307) when the request looks like a document —
send `-H "Accept: text/html" -H "Sec-Fetch-Dest: document"` to see the real
behavior. Member APIs return 401 JSON either way.
