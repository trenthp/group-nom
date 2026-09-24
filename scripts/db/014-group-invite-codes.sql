-- ============================================
-- Migration 014: Random group invite codes (security audit item)
-- The old scheme was base64url(group id) - reversible, so anyone could
-- derive any group's invite from its id. Codes are now random, stored,
-- and unique. Old links stop working by design. Idempotent.
-- (no semicolons in comments - the migration runner splits on them)
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS invite_code TEXT;

-- Backfill existing groups with random codes (12 hex chars, uppercased)
UPDATE groups
SET invite_code = UPPER(encode(gen_random_bytes(6), 'hex'))
WHERE invite_code IS NULL;

ALTER TABLE groups ALTER COLUMN invite_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_groups_invite_code ON groups (invite_code);
