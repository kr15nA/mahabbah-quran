import { db } from '../lib/db/client'
import { permissions } from '../drizzle/schema'

const newPermissions = [
  { code: 'system.role.manage', name: 'Manage Roles & Permissions', description: 'Allows creating, editing, and assigning roles to users.' },
  { code: 'system.user.manage', name: 'Manage Users', description: 'Allows creating, editing users and their status.' }
]

async function bootstrap() {
  console.log('Bootstrapping RBAC permissions...')
  for (const perm of newPermissions) {
    await db.insert(permissions)
      .values(perm)
      .onConflictDoUpdate({ target: permissions.code, set: { name: perm.name, description: perm.description } })
  }
  console.log('Done.')
}

bootstrap().catch(console.error).then(() => process.exit(0))
