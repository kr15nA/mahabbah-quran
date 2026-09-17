import { db } from '../lib/db/client'
import * as schema from '../drizzle/schema'

async function audit() {
  const roles = await db.select().from(schema.roles)
  const permissions = await db.select().from(schema.permissions)
  const rolePermissions = await db.select().from(schema.rolePermissions)
  const userRoles = await db.select().from(schema.userRoles)
  const users = await db.select().from(schema.users)

  console.log(`total roles: ${roles.length}`)
  console.log(`total permissions: ${permissions.length}`)
  console.log(`total role_permissions: ${rolePermissions.length}`)
  console.log(`total user_roles: ${userRoles.length}`)

  let noDynamicRole = 0
  let multiDynamicRole = 0
  let legacyOnly = 0

  for (const u of users) {
    const dynamicRolesCount = userRoles.filter(ur => ur.userId === u.id).length
    if (dynamicRolesCount === 0) noDynamicRole++
    if (dynamicRolesCount > 1) multiDynamicRole++
    if (dynamicRolesCount === 0 && u.role) legacyOnly++
  }

  console.log(`users with no dynamic role: ${noDynamicRole}`)
  console.log(`users with >1 dynamic role: ${multiDynamicRole}`)
  console.log(`users relying only on legacy users.role: ${legacyOnly}`)

  // Duplicate checks
  const roleKeys = new Set()
  let dupRoles = 0
  for (const r of roles) {
    if (roleKeys.has(r.code)) dupRoles++
    roleKeys.add(r.code)
  }
  console.log(`duplicate role names: ${dupRoles}`)

  const permKeys = new Set()
  let dupPerms = 0
  for (const p of permissions) {
    if (permKeys.has(p.code)) dupPerms++
    permKeys.add(p.code)
  }
  console.log(`duplicate permission keys: ${dupPerms}`)
  
  // Orphans
  const validRoleIds = new Set(roles.map(r => r.id))
  const validPermIds = new Set(permissions.map(p => p.id))
  const validUserIds = new Set(users.map(u => u.id))

  let orphanRP = 0
  for (const rp of rolePermissions) {
    if (!validRoleIds.has(rp.roleId) || !validPermIds.has(rp.permissionId)) orphanRP++
  }
  console.log(`orphan role_permissions: ${orphanRP}`)

  let orphanUR = 0
  for (const ur of userRoles) {
    if (!validRoleIds.has(ur.roleId) || !validUserIds.has(ur.userId)) orphanUR++
  }
  console.log(`orphan user_roles: ${orphanUR}`)
}

audit().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
