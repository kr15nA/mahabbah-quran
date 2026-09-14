import { db } from '../lib/db/client'
import { permissions, roles, rolePermissions } from '../drizzle/schema'
import { eq, inArray } from 'drizzle-orm'

async function run() {
  console.log('--- BOOTSTRAPPING DASHBOARD PERMISSIONS ---')

  const newPermissions = [
    {
      code: 'finance.dashboard.view',
      name: 'View Finance Dashboard',
      description: 'View general finance dashboard metrics and balances'
    },
    {
      code: 'finance.report.view',
      name: 'View Finance Reports',
      description: 'View detailed financial reports and reconciliation diagnostics'
    },
    {
      code: 'finance.settings.manage',
      name: 'Manage Finance Settings',
      description: 'Manage chart of accounts, classifications, and system mappings'
    }
  ]

  for (const perm of newPermissions) {
    await db.insert(permissions)
      .values(perm)
      .onConflictDoUpdate({
        target: permissions.code,
        set: { name: perm.name, description: perm.description }
      })
    console.log(`✓ Upserted permission: ${perm.code}`)
  }

  // Grant to SUPER_ADMIN by default
  const [superAdminRole] = await db.select().from(roles).where(eq(roles.code, 'SUPER_ADMIN'))
  
  if (superAdminRole) {
    const permRecords = await db.select().from(permissions).where(
      inArray(permissions.code, newPermissions.map(p => p.code))
    )
    
    for (const perm of permRecords) {
      await db.insert(rolePermissions)
        .values({ roleId: superAdminRole.id, permissionId: perm.id })
        .onConflictDoNothing()
    }
    console.log('✓ Granted to SUPER_ADMIN')
  }

  console.log('--- BOOTSTRAP COMPLETE ---')
}

run().catch(err => {
  console.error(err)
  process.exit(1)
}).finally(() => {
  process.exit(0)
})
