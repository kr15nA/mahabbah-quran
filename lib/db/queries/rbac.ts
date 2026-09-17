import { db } from '../client'
import { roles, permissions, rolePermissions, userRoles, auditLogs } from '@/drizzle/schema'
import { eq, inArray, and } from 'drizzle-orm'

export type RoleRow = typeof roles.$inferSelect
export type PermissionRow = typeof permissions.$inferSelect
export type UserRoleRow = typeof userRoles.$inferSelect

export async function getAllRoles() {
  return await db.select().from(roles).orderBy(roles.code)
}

export async function getRoleByCode(code: string) {
  const res = await db.select().from(roles).where(eq(roles.code, code)).limit(1)
  return res[0] || null
}

export async function getRoleById(id: number) {
  const res = await db.select().from(roles).where(eq(roles.id, id)).limit(1)
  return res[0] || null
}

export async function getAllPermissions() {
  return await db.select().from(permissions).orderBy(permissions.code)
}

export async function getPermissionsForRole(roleId: number) {
  return await db.select({
    id: permissions.id,
    code: permissions.code,
    name: permissions.name,
    description: permissions.description
  })
  .from(permissions)
  .innerJoin(rolePermissions, eq(rolePermissions.permissionId, permissions.id))
  .where(eq(rolePermissions.roleId, roleId))
}

export async function getUsersCountByRole(roleId: number) {
  const res = await db.select({ id: userRoles.userId })
    .from(userRoles)
    .where(eq(userRoles.roleId, roleId))
  return res.length
}

export async function getRolesForUser(userId: number) {
  return await db.select({
    id: roles.id,
    code: roles.code,
    name: roles.name,
    description: roles.description
  })
  .from(roles)
  .innerJoin(userRoles, eq(userRoles.roleId, roles.id))
  .where(eq(userRoles.userId, userId))
}

export async function insertRoleWithPermissions(data: { code: string, name: string, description?: string, permissionIds: number[] }, actorId: number) {
  const [newRole] = await db.insert(roles).values({
    code: data.code,
    name: data.name,
    description: data.description,
  }).returning()

  try {
    const batchOps: any[] = []
    
    if (data.permissionIds.length > 0) {
      batchOps.push(
        db.insert(rolePermissions).values(
          data.permissionIds.map(pid => ({ roleId: newRole.id, permissionId: pid }))
        )
      )
    }

    batchOps.push(
      db.insert(auditLogs).values({
        actorUserId: actorId,
        action: 'ROLE_CREATED',
        entityType: 'ROLE',
        entityId: newRole.id,
        newValues: { code: data.code, name: data.name, permissions: data.permissionIds }
      })
    )

    if (batchOps.length > 0) {
      await db.batch(batchOps as any)
    }

    return newRole
  } catch (e: any) {
    // FULL COMPENSATION
    try {
      await db.delete(rolePermissions).where(eq(rolePermissions.roleId, newRole.id))
      await db.delete(roles).where(eq(roles.id, newRole.id))
    } catch (cleanupError: any) {
      console.error('CRITICAL: Compensation failed for insertRoleWithPermissions', cleanupError)
      throw new Error(`CRITICAL INTEGRITY ERROR: Role creation failed and compensation rollback also failed. Orphaned role ID: ${newRole.id}`)
    }
    throw e
  }
}


export async function updateRoleWithPermissions(id: number, data: { name: string, description?: string, permissionIds: number[] }, actorId: number) {
  const existingRole = await db.select().from(roles).where(eq(roles.id, id))
  if (existingRole.length === 0) throw new Error('Role not found')

  const batchOps: any[] = []
  
  batchOps.push(
    db.update(roles).set({
      name: data.name,
      description: data.description,
    }).where(eq(roles.id, id))
  )
  
  batchOps.push(
    db.delete(rolePermissions).where(eq(rolePermissions.roleId, id))
  )
  
  if (data.permissionIds.length > 0) {
    batchOps.push(
      db.insert(rolePermissions).values(
        data.permissionIds.map(pid => ({ roleId: id, permissionId: pid }))
      )
    )
  }

  batchOps.push(
    db.insert(auditLogs).values({
      actorUserId: actorId,
      action: 'ROLE_UPDATED',
      entityType: 'ROLE',
      entityId: id,
      newValues: { name: data.name, permissions: data.permissionIds }
    })
  )

  await db.batch(batchOps as any)

  return { ...existingRole[0], name: data.name, description: data.description || existingRole[0].description }
}


export async function syncUserRoles(userId: number, requestedRoleIds: number[], actorId: number) {
  const currentRoles = await db.select({ roleId: userRoles.roleId }).from(userRoles).where(eq(userRoles.userId, userId))
  const currentRoleIds = new Set(currentRoles.map(r => r.roleId))
  const requestedSet = new Set(requestedRoleIds)

  const toAdd = requestedRoleIds.filter(id => !currentRoleIds.has(id))
  const toRemove = Array.from(currentRoleIds).filter(id => !requestedSet.has(id))

  const batchOps: any[] = []

  if (toRemove.length > 0) {
    batchOps.push(
      db.delete(userRoles).where(
        and(eq(userRoles.userId, userId), inArray(userRoles.roleId, toRemove))
      )
    )
    batchOps.push(
      db.insert(auditLogs).values({
        actorUserId: actorId,
        action: 'USER_ROLE_REVOKED',
        entityType: 'USER_ROLE',
        entityId: userId,
        newValues: { revokedRoleIds: toRemove }
      })
    )
  }

  if (toAdd.length > 0) {
    batchOps.push(
      db.insert(userRoles).values(
        toAdd.map(roleId => ({ userId, roleId }))
      )
    )
    batchOps.push(
      db.insert(auditLogs).values({
        actorUserId: actorId,
        action: 'USER_ROLE_ASSIGNED',
        entityType: 'USER_ROLE',
        entityId: userId,
        newValues: { assignedRoleIds: toAdd }
      })
    )
  }

  if (batchOps.length > 0) {
    await db.batch(batchOps as any)
  }
}
