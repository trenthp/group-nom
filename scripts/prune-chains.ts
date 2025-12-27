/**
 * Prune Chain Restaurants
 *
 * Removes restaurants belonging to large chains (>N locations nationwide).
 * This helps reduce database storage while keeping unique/local restaurants.
 *
 * Usage:
 *   npx tsx scripts/prune-chains.ts --dry-run    # Preview what would be deleted
 *   npx tsx scripts/prune-chains.ts --execute    # Actually delete
 *   npx tsx scripts/prune-chains.ts --threshold 200  # Custom threshold (default: 100)
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);

async function pruneChains() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || !args.includes('--execute');
  const thresholdIdx = args.indexOf('--threshold');
  const threshold = thresholdIdx !== -1 ? parseInt(args[thresholdIdx + 1]) : 100;

  console.log('=== Chain Pruning ===\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'EXECUTE (will delete!)'}`);
  console.log(`Threshold: >${threshold} locations\n`);

  // Find chain names
  const chains = await sql`
    SELECT name, COUNT(*) as count
    FROM restaurants
    GROUP BY name
    HAVING COUNT(*) > ${threshold}
    ORDER BY count DESC
  `;

  console.log(`Found ${chains.length} chains with >${threshold} locations:\n`);

  let totalLocations = 0;
  chains.slice(0, 20).forEach((r: any) => {
    console.log(`  ${r.count.toString().padStart(5)}x  ${r.name}`);
    totalLocations += Number(r.count);
  });

  if (chains.length > 20) {
    const remaining = chains.slice(20).reduce((sum: number, r: any) => sum + Number(r.count), 0);
    totalLocations += remaining;
    console.log(`  ... and ${chains.length - 20} more chains`);
  }

  // Get total count
  const countResult = await sql`
    SELECT COUNT(*) as cnt FROM restaurants
    WHERE name IN (SELECT name FROM restaurants GROUP BY name HAVING COUNT(*) > ${threshold})
  `;
  const deleteCount = Number(countResult[0].cnt);

  console.log(`\nTotal restaurants to delete: ${deleteCount.toLocaleString()}`);
  console.log(`Estimated storage freed: ~${Math.round(deleteCount * 597 / 1024 / 1024)} MB`);

  if (dryRun) {
    console.log('\n⚠️  DRY RUN - No changes made');
    console.log('Run with --execute to actually delete these restaurants');
    return;
  }

  // Execute deletion
  console.log('\n🗑️  Deleting...');

  const result = await sql`
    DELETE FROM restaurants
    WHERE name IN (
      SELECT name FROM restaurants
      GROUP BY name
      HAVING COUNT(*) > ${threshold}
    )
  `;

  console.log(`✅ Deleted ${deleteCount.toLocaleString()} chain restaurant locations`);

  // Verify new count and size
  const newCount = await sql`SELECT COUNT(*) as cnt FROM restaurants`;
  const newSize = await sql`SELECT pg_size_pretty(pg_database_size(current_database())) as size`;

  console.log(`\nRemaining restaurants: ${Number(newCount[0].cnt).toLocaleString()}`);
  console.log(`New database size: ${newSize[0].size}`);
  console.log('\nNote: Run VACUUM to reclaim disk space if needed');
}

pruneChains().catch(console.error);
