import { config } from 'dotenv';
config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);

async function findChains() {
  // Find most common restaurant names (likely chains)
  const chains = await sql`
    SELECT name, COUNT(*) as count
    FROM restaurants
    GROUP BY name
    HAVING COUNT(*) > 50
    ORDER BY count DESC
    LIMIT 30
  `;

  console.log('Most common names (likely chains):');
  chains.forEach((row: any) => console.log(`  ${row.count}x ${row.name}`));

  console.log('\nTotal unique names with 50+ locations:', chains.length);
}

findChains().catch(console.error);
