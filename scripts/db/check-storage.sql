-- Check database storage usage
-- Run this in Neon SQL Editor to see what's taking up space

-- 1. Table sizes (largest first)
SELECT
  tablename AS table_name,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname || '.' || tablename)) AS data_size,
  pg_size_pretty(pg_indexes_size(schemaname || '.' || tablename::regclass)) AS index_size,
  (SELECT COUNT(*) FROM restaurants) AS row_count
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'restaurants'

UNION ALL

SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)),
  pg_size_pretty(pg_relation_size(schemaname || '.' || tablename)),
  pg_size_pretty(pg_indexes_size(schemaname || '.' || tablename::regclass)),
  (SELECT COUNT(*) FROM voting_outcomes)
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'voting_outcomes'

ORDER BY total_size DESC;

-- 2. Total database size
SELECT pg_size_pretty(pg_database_size(current_database())) AS total_database_size;

-- 3. Index sizes (to see if indexes are bloated)
SELECT
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) AS size
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexname::regclass) DESC
LIMIT 10;

-- 4. Check TripAdvisor photo data size
SELECT
  COUNT(*) AS restaurants_with_ta_photos,
  pg_size_pretty(COALESCE(SUM(pg_column_size(ta_photo_urls)), 0)) AS ta_photo_urls_size
FROM restaurants
WHERE array_length(ta_photo_urls, 1) > 0;

-- 5. Voting outcomes by month (to identify old data you could delete)
SELECT
  DATE_TRUNC('month', session_date) AS month,
  COUNT(*) AS outcomes,
  pg_size_pretty(SUM(pg_column_size(voting_outcomes.*))) AS approx_size
FROM voting_outcomes
GROUP BY DATE_TRUNC('month', session_date)
ORDER BY month DESC;
