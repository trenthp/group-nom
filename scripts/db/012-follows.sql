-- ============================================
-- Migration 012: Follows and blocks
-- Anti-clout by design: no follower counts are ever exposed, so there
-- are no counter columns to maintain. Follows feed the home feed and
-- open a followed member's places to pre-unlock members. Idempotent.
-- (no semicolons in comments - the migration runner splits on them)
-- ============================================

CREATE TABLE IF NOT EXISTS follows (
  follower_id TEXT NOT NULL,
  followee_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_followee ON follows (followee_id);

CREATE TABLE IF NOT EXISTS blocks (
  blocker_id TEXT NOT NULL,
  blocked_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks (blocked_id);

-- Private data goes with the member
CREATE OR REPLACE FUNCTION anonymize_member(p_clerk_user_id TEXT)
RETURNS VOID AS $$
BEGIN
  DELETE FROM user_favorites WHERE clerk_user_id = p_clerk_user_id;
  DELETE FROM group_members WHERE clerk_user_id = p_clerk_user_id;
  DELETE FROM groups WHERE owner_id = p_clerk_user_id;
  DELETE FROM nomination_drafts WHERE clerk_user_id = p_clerk_user_id;
  DELETE FROM follows WHERE follower_id = p_clerk_user_id OR followee_id = p_clerk_user_id;
  DELETE FROM blocks WHERE blocker_id = p_clerk_user_id OR blocked_id = p_clerk_user_id;

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
