import { db } from '../lib/db/client';
import { sql } from 'drizzle-orm';

async function bootstrap() {
  await db.execute(sql`
    INSERT INTO permissions (code, name) VALUES
      ('finance.ziswaf.view', 'View ZISWAF Receipts'),
      ('finance.ziswaf.manage', 'Manage ZISWAF Receipts'),
      ('finance.ziswaf.refund', 'Refund ZISWAF Receipts')
    ON CONFLICT (code) DO NOTHING;
  `);
  console.log('✅ ZISWAF Permissions bootstrapped.');
}

bootstrap().catch(console.error).finally(() => process.exit(0));
