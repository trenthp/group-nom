-- ============================================
-- Migration 010: Private nomination drafts
-- A draft is a place a member intends to nominate - after a revisit, or
-- tomorrow when the daily slot reopens. Private to the member, unlimited,
-- one per member+place. NO photo column by design: Blob URLs are
-- public-if-known, so the photo is taken only at publish. Idempotent.
-- (no semicolons in comments - the migration runner splits on them)
-- ============================================

CREATE TABLE IF NOT EXISTS nomination_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  gers_id TEXT NOT NULL REFERENCES restaurants(gers_id) ON DELETE CASCADE,
  why_i_love_it TEXT,
  my_favorite_dishes TEXT[] DEFAULT '{}',
  reason TEXT NOT NULL DEFAULT 'later',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (clerk_user_id, gers_id)
);

ALTER TABLE nomination_drafts DROP CONSTRAINT IF EXISTS nomination_drafts_reason_check;
ALTER TABLE nomination_drafts
  ADD CONSTRAINT nomination_drafts_reason_check
  CHECK (reason IN ('revisit', 'later', 'limit'));

CREATE INDEX IF NOT EXISTS idx_nomination_drafts_user
  ON nomination_drafts (clerk_user_id, updated_at DESC);

-- Private data goes with the member (see anonymize_member in 007)
CREATE OR REPLACE FUNCTION anonymize_member(p_clerk_user_id TEXT)
RETURNS VOID AS $$
BEGIN
  DELETE FROM user_favorites WHERE clerk_user_id = p_clerk_user_id;
  DELETE FROM group_members WHERE clerk_user_id = p_clerk_user_id;
  DELETE FROM groups WHERE owner_id = p_clerk_user_id;
  DELETE FROM nomination_drafts WHERE clerk_user_id = p_clerk_user_id;

  UPDATE user_profiles
  SET
    display_name = NULL,
    avatar_url = NULL,
    timezone = NULL,
    status = 'deleted',
    updated_at = NOW()
  WHERE clerk_user_id = p_clerk_user_id;
END;
$$ LANGUAGE plpgsql;
