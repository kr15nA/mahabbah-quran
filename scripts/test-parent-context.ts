import { normalizeStudentId, studentIdToDbNumber } from '../lib/guardians/parent-context'

async function run() {
  let passed = true
  function assert(condition: boolean, msg: string) {
    if (!condition) {
      console.error(`❌ FAIL: ${msg}`)
      passed = false
    } else {
      console.log(`✅ PASS: ${msg}`)
    }
  }

  // 1. normalize number 123 -> "123"
  assert(normalizeStudentId(123) === '123', 'normalize number 123 -> "123"')

  // 2. normalize string "123" -> "123"
  assert(normalizeStudentId("123") === '123', 'normalize string "123" -> "123"')

  // 3. leading-zero behavior
  assert(normalizeStudentId("00123") === '123', 'normalize string "00123" -> "123"')

  // 4. malformed values rejected
  assert(normalizeStudentId("abc") === null, 'reject "abc"')
  assert(normalizeStudentId("12.3") === null, 'reject "12.3"')
  assert(normalizeStudentId("-1") === null, 'reject "-1"')
  assert(normalizeStudentId("") === null, 'reject empty string')
  assert(normalizeStudentId(null) === null, 'reject null')
  
  // 5. unsafe integer range rejected at DB conversion
  try {
    studentIdToDbNumber("9007199254740992") // MAX_SAFE_INTEGER + 1
    assert(false, 'Should have thrown on MAX_SAFE_INTEGER + 1')
  } catch (e) {
    assert(true, 'Rejected MAX_SAFE_INTEGER + 1 successfully')
  }

  // --- Database Logic Tests ---
  console.log('--- Testing DB Context Resolver ---')
  const { db } = require('../lib/db/client')
  const { users, students, studentParents } = require('../drizzle/schema')
  const { eq } = require('drizzle-orm')
  const { resolveParentChildContext } = require('../lib/guardians/parent-context')

  // Setup temporary test entities
  const timestamp = Date.now()
  const tempParentId = 999999991
  const tempStudent1Id = 999999992
  const tempStudent2Id = 999999993

  try {
    // Clean up just in case
    await db.delete(studentParents).where(eq(studentParents.parentId, tempParentId))
    await db.delete(users).where(eq(users.id, tempParentId))
    await db.delete(students).where(eq(students.id, tempStudent1Id))
    await db.delete(students).where(eq(students.id, tempStudent2Id))

    // Insert Parent
    await db.insert(users).values({
      id: tempParentId,
      fullName: `Test Parent ${timestamp}`,
      email: `testparent_${timestamp}@example.com`,
      phone: `089${timestamp}`,
      passwordHash: 'dummy',
      role: 'orang_tua',
    })

    // 13. zero child -> NO_CHILDREN
    let res = await resolveParentChildContext({ userId: tempParentId })
    assert(res.status === 'NO_CHILDREN', 'zero child -> NO_CHILDREN')

    // Insert Student 1
    await db.insert(students).values({
      id: tempStudent1Id,
      fullName: `Test Student 1 ${timestamp}`,
      nis: `NIS1${timestamp}`,
      enrollmentDate: new Date(),
      status: 'aktif'
    })

    // Link Student 1 (Academic = false)
    await db.insert(studentParents).values({
      studentId: tempStudent1Id,
      parentId: tempParentId,
      relationship: 'FATHER',
      isPrimary: true,
      canViewAcademic: false,
      canViewFinance: true,
      isActive: true,
    })

    // 12. canViewAcademic=false excluded
    res = await resolveParentChildContext({ userId: tempParentId })
    assert(res.status === 'NO_CHILDREN', 'canViewAcademic=false excluded')

    // Update to Academic = true
    await db.update(studentParents)
      .set({ canViewAcademic: true })
      .where(eq(studentParents.parentId, tempParentId))

    // 6. one authorized child + no child_id -> AUTHORIZED
    res = await resolveParentChildContext({ userId: tempParentId })
    assert(res.status === 'AUTHORIZED' && res.childId === String(tempStudent1Id), 'one child + no child_id -> AUTHORIZED automatically')

    // Insert Student 2
    await db.insert(students).values({
      id: tempStudent2Id,
      fullName: `Test Student 2 ${timestamp}`,
      nis: `NIS2${timestamp}`,
      enrollmentDate: new Date(),
      status: 'aktif'
    })

    // Link Student 2
    await db.insert(studentParents).values({
      studentId: tempStudent2Id,
      parentId: tempParentId,
      relationship: 'FATHER',
      isPrimary: true,
      canViewAcademic: true,
      canViewFinance: true,
      isActive: true,
    })

    // 8. multi-child + no child -> CHILD_REQUIRED
    res = await resolveParentChildContext({ userId: tempParentId })
    assert(res.status === 'CHILD_REQUIRED', 'multi-child + no child_id -> CHILD_REQUIRED')

    // 7. multi-child + valid child -> AUTHORIZED correct child
    res = await resolveParentChildContext({ userId: tempParentId, requestedChildId: String(tempStudent2Id) })
    assert(res.status === 'AUTHORIZED' && res.childId === String(tempStudent2Id), 'multi-child + valid child -> AUTHORIZED correct child')

    // 9. unrelated child -> FORBIDDEN_CHILD
    res = await resolveParentChildContext({ userId: tempParentId, requestedChildId: "1" }) // Assume student 1 is not linked to this temp parent
    assert(res.status === 'FORBIDDEN_CHILD', 'unrelated child -> FORBIDDEN_CHILD')

    // 14. malformed child_id -> INVALID_CHILD
    res = await resolveParentChildContext({ userId: tempParentId, requestedChildId: "abc" })
    assert(res.status === 'INVALID_CHILD', 'malformed child_id -> INVALID_CHILD')

    // 10. inactive relationship excluded
    await db.update(studentParents)
      .set({ isActive: false })
      .where(eq(studentParents.studentId, tempStudent2Id))
    
    res = await resolveParentChildContext({ userId: tempParentId })
    // With student 2 inactive, there is only student 1 active -> auto resolve
    assert(res.status === 'AUTHORIZED' && res.childId === String(tempStudent1Id), 'inactive relationship excluded, fallback to remaining one child')

    // 11. deleted relationship excluded
    await db.update(studentParents)
      .set({ isActive: true, deletedAt: new Date() })
      .where(eq(studentParents.studentId, tempStudent2Id))
    
    res = await resolveParentChildContext({ userId: tempParentId })
    assert(res.status === 'AUTHORIZED' && res.childId === String(tempStudent1Id), 'soft-deleted relationship excluded')

  } finally {
    console.log('Cleaning up temporary DB fixtures...')
    await db.delete(studentParents).where(eq(studentParents.parentId, tempParentId))
    await db.delete(users).where(eq(users.id, tempParentId))
    await db.delete(students).where(eq(students.id, tempStudent1Id))
    await db.delete(students).where(eq(students.id, tempStudent2Id))
  }

  if (!passed) {
    console.error('❌ Some context tests failed.')
    process.exit(1)
  }
  console.log('✅ Context logic & DB resolver tests passed.')
}

run().catch(console.error)
