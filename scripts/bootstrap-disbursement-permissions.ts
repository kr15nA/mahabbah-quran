import { db } from '../lib/db/client'
import { permissions } from '../drizzle/schema'

async function run() {
  console.log('--- BOOTSTRAPPING DISBURSEMENT PERMISSIONS ---')

  const perms = [
    { code: 'finance.disbursement.view', name: 'View Disbursement' },
    { code: 'finance.disbursement.manage', name: 'Manage Disbursement' },
    { code: 'finance.disbursement.approve', name: 'Approve Disbursement' },
    { code: 'finance.disbursement.pay', name: 'Pay Disbursement' },
    { code: 'finance.disbursement.reverse', name: 'Reverse Disbursement' },
  ]

  for (const p of perms) {
    await db.insert(permissions)
      .values(p)
      .onConflictDoUpdate({ target: permissions.code, set: { name: p.name } })
    console.log(`✓ Upserted permission: ${p.code}`)
  }

  console.log('--- BOOTSTRAP COMPLETE ---')
}

run().catch(err => {
  console.error(err)
  process.exit(1)
}).finally(() => {
  process.exit(0)
})
