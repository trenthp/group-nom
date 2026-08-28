-- ============================================
-- Migration 009: One nomination per member per local day
-- local_date is the member's calendar date in the IANA zone their browser
-- reported at publish. The partial unique index makes the limit race-proof.
-- Legacy rows keep local_date NULL and do not count against anyone.
-- (no semicolons in comments - the migration runner splits on them)
-- ============================================

ALTER TABLE nominations
  ADD COLUMN IF NOT EXISTS local_date DATE;

ALTER TABLE nominations
  ADD COLUMN IF NOT EXISTS published_tz TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS nominations_one_per_local_day
  ON nominations (clerk_user_id, local_date)
  WHERE local_date IS NOT NULL;
