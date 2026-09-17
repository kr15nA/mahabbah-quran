import { db } from '../lib/db/client'
import { users, roles, permissions, rolePermissions, userRoles, auditLogs } from '../drizzle/schema'
import { eq, and, desc, inArray } from 'drizzle-orm'
import { getRoleByCode, insertRoleWithPermissions, syncUserRoles, updateRoleWithPermissions } from '../lib/db/queries/rbac'

async function runTest() {
  console.log('--- RBAC MANAGEMENT 001 TEST ---')
  let passed = true
  
  try {
    // 1. Setup mock super admin for actor
    const [mockAdmin] = await db.select().from(users).where(eq(users.role, 'admin')).limit(1)
    if (!mockAdmin) throw new Error('No admin user found to act as test actor')
    const ACTOR_ID = mockAdmin.id

    const [mockUser] = await db.insert(users).values({
      fullName: 'Test User RBAC',
      email: 'test.rbac@example.com',
      role: 'guru',
      passwordHash: 'dummy'
    }).returning()

    console.log(`[TEST] Creating mock user ID: ${mockUser.id}`)

    const manageRolePerm = await db.select().from(permissions).where(eq(permissions.code, 'system.role.manage')).limit(1)
    if (!manageRolePerm.length) {
      throw new Error('system.role.manage permission missing')
    }

    // 2. Role Creation
    const newRoleCode = 'TEST_ROLE_123'
    await db.delete(roles).where(eq(roles.code, newRoleCode))
    
    console.log('[TEST] Creating role...')
    const role1 = await insertRoleWithPermissions({
      code: newRoleCode,
      name: 'Test Role',
      description: 'Role for testing',
      permissionIds: [manageRolePerm[0].id]
    }, ACTOR_ID)
    
    if (role1.code !== newRoleCode) throw new Error('Role creation failed')
    
    // Check duplicate code rejection
    try {
      await insertRoleWithPermissions({
        code: newRoleCode,
        name: 'Duplicate Role',
        permissionIds: []
      }, ACTOR_ID)
      passed = false; console.error('FAILED: Duplicate role code was not rejected')
    } catch (e) {
      console.log('PASS: Duplicate role code rejected')
    }

    // 3. User Role Sync
    console.log('[TEST] Syncing user roles...')
    await syncUserRoles(mockUser.id, [role1.id], ACTOR_ID)

    const userRolesAfterSync = await db.select().from(userRoles).where(eq(userRoles.userId, mockUser.id))
    if (userRolesAfterSync.length !== 1 || userRolesAfterSync[0].roleId !== role1.id) {
      throw new Error('Sync user roles failed to add role')
    }

    // Add another role sync diff test
    const newRoleCode2 = 'TEST_ROLE_456'
    await db.delete(roles).where(eq(roles.code, newRoleCode2))
    const role2 = await insertRoleWithPermissions({
      code: newRoleCode2,
      name: 'Test Role 2',
      permissionIds: []
    }, ACTOR_ID)

    console.log('[TEST] Syncing diff-based user roles...')
    await syncUserRoles(mockUser.id, [role2.id], ACTOR_ID)
    
    const userRolesDiff = await db.select().from(userRoles).where(eq(userRoles.userId, mockUser.id))
    if (userRolesDiff.length !== 1 || userRolesDiff[0].roleId !== role2.id) {
      throw new Error('Sync user roles diff failed, did not revoke old and add new')
    }
    
    // 4. Role Edition
    console.log('[TEST] Editing role...')
    const editedRole = await updateRoleWithPermissions(role1.id, {
      name: 'Edited Test Role',
      permissionIds: []
    }, ACTOR_ID)

    if (editedRole.name !== 'Edited Test Role') throw new Error('Role edit failed')

    // Verify permissions were wiped
    const rolePerms = await db.select().from(rolePermissions).where(eq(rolePermissions.roleId, role1.id))
    if (rolePerms.length !== 0) throw new Error('Role permissions not updated correctly')

    // 5. Cleanup
    console.log('[TEST] Cleaning up test data...')
    await db.delete(userRoles).where(eq(userRoles.userId, mockUser.id))
    await db.delete(rolePermissions).where(inArray(rolePermissions.roleId, [role1.id, role2.id]))
    await db.delete(roles).where(inArray(roles.id, [role1.id, role2.id]))
    await db.delete(users).where(eq(users.id, mockUser.id))
    
    console.log('--- ALL TESTS PASSED ---')
  } catch (e: any) {
    console.error('TEST FAILED:', e.message)
    passed = false
  }
  
  process.exit(passed ? 0 : 1)
}

runTest()
