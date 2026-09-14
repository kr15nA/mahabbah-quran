import { db } from '../lib/db/client'
import { permissions, rolePermissions, roles } from '../drizzle/schema'
import { eq } from 'drizzle-orm'

async function bootstrap() {
  console.log('Bootstrapping reporting permissions...')
  const perms = [
    { code: 'finance.report.view', name: 'View Finance Reports', description: 'View financial reports and dashboards' },
    { code: 'finance.report.export', name: 'Export Finance Reports', description: 'Export financial reports to spreadsheet/PDF' },
  ]

  for (const perm of perms) {
    await db.insert(permissions).values(perm).onConflictDoNothing({ target: permissions.code })
  }
  console.log('Permissions bootstrapped.')
}

bootstrap().catch(console.error).finally(() => process.exit(0))
