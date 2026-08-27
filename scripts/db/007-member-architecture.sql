-- ============================================
-- Migration 007: Member architecture
-- Profile columns the membership ladder needs (decided Aug 2026).
-- Idempotent - safe to re-run.
--
--   timezone         last IANA tz seen at publish (one nomination per local day)
--   status           active | suspended | deleted (deleted = anonymized, row kept)
--   last_active_at   "interaction" input to the internal trust score
--   trust_score      internal ranking weight - NEVER serialized to a client
-- (no semicolons in comments: the migration runner splits on them)
--
-- Unlock is NOT a column: it is derived from nomination_count > 0.
-- ============================================

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS timezone TEXT;

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP;

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS trust_score REAL NOT NULL DEFAULT 1.0;

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS trust_updated_at TIMESTAMP;

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Guard the enum by hand (no CHECK on a column that may already have rows)
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_status_check;
ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_status_check
  CHECK (status IN ('active', 'suspended', 'deleted'));

-- Member pages are addressed by the opaque profile UUID, not the Clerk id
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);

-- ============================================
-- Anonymize on account deletion (decided Aug 27, 2026)
-- Nominations, photos and enrichments stay - the person leaves cleanly.
-- Private data (saves, group memberships, owned groups) is removed.
-- ============================================

CREATE OR REPLACE FUNCTION anonymize_member(p_clerk_user_id TEXT)
RETURNS VOID AS $$
BEGIN
  DELETE FROM user_favorites WHERE clerk_user_id = p_clerk_user_id;
  DELETE FROM group_members WHERE clerk_user_id = p_clerk_user_id;
  DELETE FROM groups WHERE owner_id = p_clerk_user_id;

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
