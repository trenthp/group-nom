import { config } from 'dotenv';
config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);

async function checkStats() {
  // Count records
  const count = await sql`SELECT COUNT(*) as total FROM restaurants`;
  console.log('Total restaurants imported:', count[0].total);

  // Check by state
  const byState = await sql`
    SELECT state, COUNT(*) as count
    FROM restaurants
    WHERE state IS NOT NULL
    GROUP BY state
    ORDER BY count DESC
    LIMIT 15
  `;
  console.log('\nTop states:');
  byState.forEach((r: any) => console.log(`  ${r.state}: ${r.count}`));

  // Total states
  const stateCount = await sql`SELECT COUNT(DISTINCT state) as states FROM restaurants`;
  console.log('\nStates covered:', stateCount[0].states);

  // Database size
  const size = await sql`
    SELECT pg_size_pretty(pg_database_size(current_database())) as size
  `;
  console.log('\nDatabase size:', size[0].size);
}

checkStats().catch(console.error);
