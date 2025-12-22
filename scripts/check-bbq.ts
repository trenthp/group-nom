import { config } from 'dotenv';
config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);

async function check() {
  const r = await sql`
    SELECT cat, COUNT(*) as cnt FROM (
      SELECT unnest(categories) as cat FROM restaurants
    ) t
    WHERE cat LIKE '%bbq%' OR cat LIKE '%barbecue%'
    GROUP BY cat
    ORDER BY cnt DESC
  `;
  console.log('BBQ-related categories:');
  r.forEach((c: any) => console.log(`  ${c.cnt}x ${c.cat}`));
}

check().catch(console.error);
