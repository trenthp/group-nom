-- Discover as a curation surface (Sep 2026): members browsing the raw seed
-- will spot duplicates. Add it as a place-level report reason. Never put a
-- semicolon in a comment in this file (the runner splits on them).

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_reason_check;
ALTER TABLE reports ADD CONSTRAINT reports_reason_check
  CHECK (reason IN ('closed', 'not_a_restaurant', 'duplicate', 'inappropriate', 'spam', 'other'));
