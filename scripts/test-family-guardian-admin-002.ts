import { db } from '../lib/db/client'
import { users, students, studentParents } from '../drizzle/schema'
import { eq, and } from 'drizzle-orm'
import { 
  _searchGuardianCandidatesCore,
  _listStudentGuardiansCore,
  _createGuardianRelationshipCore,
  _updateGuardianRelationshipCore,
  _reactivateGuardianRelationshipCore,
  _deactivateGuardianRelationshipCore
} from '../lib/guardians/internal/manage-core'
import { hasPermission } from '../lib/auth/rbac'
import { SessionPayload } from '../lib/auth/session'

async function runTests() {
  console.log('--- RUNNING FAMILY GUARDIAN PHASE B1 TESTS ---')

  let passCount = 0
  let failCount = 0

  const assert = (condition: boolean, msg: string) => {
    if (condition) {
      console.log(`✅ PASS: ${msg}`)
      passCount++
    } else {
      console.error(`❌ FAIL: ${msg}`)
      failCount++
    }
  }

  // 1. Setup Test Data
  const student = await db.select().from(students).limit(1).then(r => r[0])
  if (!student) throw new Error("No student found for testing")

  const candidates = await db.select().from(users).limit(3)
  if (candidates.length < 3) throw new Error("Not enough users for testing")

  const adminUser = candidates.find(u => u.role === 'admin') || candidates[0]
  const parent1 = candidates[1]
  const parent2 = candidates[2]

  // Clean up any existing relations for this student to avoid collisions during test
  await db.delete(studentParents).where(eq(studentParents.studentId, student.id))

  // TEST: Authorization Rules (Separately Tested)
  const guruSession: SessionPayload = { userId: 999, role: 'guru', fullName: 'Test Guru' }
  const adminSession: SessionPayload = { userId: adminUser.id, role: 'admin', fullName: adminUser.fullName }

  const guruCanManage = await hasPermission(guruSession, 'system.user.manage')
  const adminCanManage = await hasPermission(adminSession, 'system.user.manage')
  
  assert(guruCanManage === false, "Unauthorized management denied for GURU")
  assert(adminCanManage === true, "Authorized permission holder allowed for ADMIN")

  // Using _Core functions to test business logic directly without route wrappers
  const adminId = adminUser.id

  // Search
  const searchResults = await _searchGuardianCandidatesCore(parent1.fullName.substring(0, 3))
  assert(searchResults.length > 0, "Candidate search works safely")
  assert(!searchResults[0].hasOwnProperty('passwordHash'), "Candidate search hides sensitive data")

  // Create Default Deny
  await _createGuardianRelationshipCore(adminId, {
    studentId: student.id,
    parentId: parent1.id,
    relationship: 'FATHER',
    isPrimary: true,
    canViewAcademic: false,
    canViewFinance: false
  })

  let guardians = await _listStudentGuardiansCore(student.id)
  assert(guardians.length === 1, "Guardian created successfully")
  assert(guardians[0].isPrimary === true, "Guardian is primary")
  assert(guardians[0].canViewAcademic === false, "Default academic is false")
  assert(guardians[0].canViewFinance === false, "Default finance is false")
  
  const parent1RelId = guardians[0].id

  // Duplicate active reject
  try {
    await _createGuardianRelationshipCore(adminId, {
      studentId: student.id,
      parentId: parent1.id,
      relationship: 'FATHER',
      isPrimary: false,
      canViewAcademic: false,
      canViewFinance: false
    })
    assert(false, "Duplicate active relationship should be rejected")
  } catch (e: any) {
    assert(e.message.includes("sudah menjadi wali aktif"), "Duplicate active relationship rejected gracefully")
  }

  // Update capabilities
  await _updateGuardianRelationshipCore(adminId, parent1RelId, {
    relationship: 'FATHER',
    isPrimary: true,
    canViewAcademic: true,
    canViewFinance: true
  })

  guardians = await _listStudentGuardiansCore(student.id)
  assert(guardians[0].canViewAcademic === true, "Academic enable works")
  assert(guardians[0].canViewFinance === true, "Finance enable works")

  // Primary atomic replacement
  await _createGuardianRelationshipCore(adminId, {
    studentId: student.id,
    parentId: parent2.id,
    relationship: 'MOTHER',
    isPrimary: true,
    canViewAcademic: false,
    canViewFinance: false
  })

  guardians = await _listStudentGuardiansCore(student.id)
  assert(guardians.length === 2, "Second guardian created")
  
  const g1 = guardians.find(g => g.parentId === parent1.id)
  const g2 = guardians.find(g => g.parentId === parent2.id)
  
  assert(g1?.isPrimary === false, "Old primary unset automatically")
  assert(g2?.isPrimary === true, "New primary set automatically")
  assert(guardians.filter(g => g.isPrimary && g.isActive).length === 1, "Max one active primary")

  // Deactivate
  await _deactivateGuardianRelationshipCore(adminId, g2!.id)
  guardians = await _listStudentGuardiansCore(student.id)
  const g2Deactivated = guardians.find(g => g.parentId === parent2.id)
  assert(g2Deactivated?.isActive === false, "Guardian deactivated")
  assert(g2Deactivated?.isPrimary === false, "Primary flag cleared on deactivation")
  assert(guardians.filter(g => g.isPrimary && g.isActive).length === 0, "Zero active primary is valid")

  // Reactivate
  await _reactivateGuardianRelationshipCore(adminId, {
    studentId: student.id,
    parentId: parent2.id,
    relationship: 'MOTHER',
    isPrimary: false,
    canViewAcademic: true,
    canViewFinance: false
  })

  guardians = await _listStudentGuardiansCore(student.id)
  const g2Reactivated = guardians.find(g => g.parentId === parent2.id)
  assert(g2Reactivated?.isActive === true, "Guardian reactivated")
  assert(g2Reactivated?.canViewAcademic === true, "Capabilities updated on reactivate")

  console.log(`\nTESTS COMPLETE: ${passCount} Passed, ${failCount} Failed`)
  process.exit(failCount > 0 ? 1 : 0)
}

runTests().catch(e => {
  console.error("Test execution failed:", e)
  process.exit(1)
})

  try {
    // 17. Verify Soft-Deleted row allows new active row
    // First, permanently deactivate (soft delete) a row? Wait, our manage function doesn't set deletedAt.
    // I will mock it directly in the db.
    const mockSoftDeleted = await db.insert(studentParents).values({
      studentId: studentId,
      parentId: adminUser.id, // we use adminUser as a random parent
      relationship: 'OTHER',
      isPrimary: false,
      canViewAcademic: false,
      canViewFinance: false,
      isActive: false,
      deletedAt: new Date()
    }).returning()
    
    await _createGuardianRelationshipCore(adminUser.id, {
      studentId: studentId,
      parentId: adminUser.id,
      relationship: 'OTHER',
      isPrimary: false,
      canViewAcademic: false,
      canViewFinance: false
    })
    console.log('✅ PASS: new active relation after historical soft-delete')
    
    const countQuery = await db.select().from(studentParents).where(and(eq(studentParents.studentId, studentId), eq(studentParents.parentId, adminUser.id)))
    if (countQuery.length === 2 && countQuery.filter(r => r.deletedAt === null).length === 1 && countQuery.filter(r => r.deletedAt !== null).length === 1) {
       console.log('✅ PASS: historical deleted row preserved')
       passCount += 2
    } else {
       console.log('❌ FAIL: historical deleted row not preserved correctly', countQuery)
       failCount += 2
    }

  } catch (e) {
    console.error('❌ FAIL: soft-delete behavior tests failed', e)
    failCount += 2
  }
}

runTests().then(() => process.exit(0)).catch(console.error)
