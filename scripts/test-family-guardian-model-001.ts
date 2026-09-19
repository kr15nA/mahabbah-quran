import { db } from '../lib/db/client'
import { studentParents, users, students } from '../drizzle/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { 
  canAccessStudentAcademic, 
  canAccessStudentFinance, 
  canManageStudentLearning, 
  canReceiveStudentNotification 
} from '../lib/guardians/access'

async function run() {
  console.log('--- RUNNING FAMILY GUARDIAN MODEL TESTS ---')

  // 1. Verify rows and defaults
  const allRels = await db.select().from(studentParents)
  console.log(`Total relationships: ${allRels.length} (Expected 29)`)
  
  let activeCount = 0
  let academicCount = 0
  let financeCount = 0
  
  for (const r of allRels) {
    if (r.isActive) activeCount++
    if (r.canViewAcademic) academicCount++
    if (r.canViewFinance) financeCount++
  }
  
  console.log(`Active: ${activeCount}`)
  console.log(`canViewAcademic: ${academicCount}`)
  console.log(`canViewFinance: ${financeCount}`)

  if (allRels.length > 0) {
    const testRel = allRels.find(r => r.canViewFinance) || allRels[0]
    const userId = testRel.parentId
    const studentId = testRel.studentId

    // Test existing relationship preserves academic access
    const academicAccess = await canAccessStudentAcademic(userId, studentId)
    console.log(`Existing relationship academic access: ${academicAccess ? 'PASS' : 'FAIL'}`)

    // Test Finance capability check (helper level)
    const financeAccess = await canAccessStudentFinance(userId, studentId)
    console.log(`Existing relationship finance access: ${financeAccess ? 'PASS' : 'FAIL'}`)
    
    // Test learning/notification (should be false)
    const notifAccess = await canReceiveStudentNotification(userId, studentId)
    console.log(`Notification access (expected false): ${!notifAccess ? 'PASS' : 'FAIL'}`)
    
    const learningAccess = await canManageStudentLearning(userId, studentId)
    console.log(`Learning access (expected false): ${!learningAccess ? 'PASS' : 'FAIL'}`)

    // Find an unrelated student
    const unrelatedStudent = await db.select().from(students)
      .where(eq(students.id, studentId === 1 ? 2 : 1))
      .limit(1)

    if (unrelatedStudent.length) {
      const unrelatedId = unrelatedStudent[0].id
      const idorAcademic = await canAccessStudentAcademic(userId, unrelatedId)
      console.log(`IDOR Academic denied: ${!idorAcademic ? 'PASS' : 'FAIL'}`)
      
      const idorFinance = await canAccessStudentFinance(userId, unrelatedId)
      console.log(`IDOR Finance denied: ${!idorFinance ? 'PASS' : 'FAIL'}`)
    }

    // Test Inactive Deny
    await db.update(studentParents).set({ isActive: false }).where(eq(studentParents.id, testRel.id))
    const inactiveAcademic = await canAccessStudentAcademic(userId, studentId)
    console.log(`Inactive relationship denied: ${!inactiveAcademic ? 'PASS' : 'FAIL'}`)
    
    // Rollback Inactive
    await db.update(studentParents).set({ isActive: true }).where(eq(studentParents.id, testRel.id))

    // Test Soft-Delete Deny
    await db.update(studentParents).set({ deletedAt: new Date() }).where(eq(studentParents.id, testRel.id))
    const deletedAcademic = await canAccessStudentAcademic(userId, studentId)
    console.log(`Soft-deleted relationship denied: ${!deletedAcademic ? 'PASS' : 'FAIL'}`)

    // Rollback Soft-Delete
    await db.update(studentParents).set({ deletedAt: null }).where(eq(studentParents.id, testRel.id))
  }
}

run().catch(console.error).finally(() => process.exit(0))
