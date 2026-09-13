import { sql, db } from '../lib/db/client'
import { getActiveAcademicContext } from '../lib/db/queries/academic-context'
import { insertStudent } from '../lib/db/queries/students'
import { insertClass } from '../lib/db/queries/classes'
import { executeImport } from '../lib/import-export'
import { students, classes, enrollments, teacherAssignments } from '../drizzle/schema'
import { eq, and } from 'drizzle-orm'
import assert from 'assert'

async function runTests() {
  console.log('--- STARTING LEGACY-DEPRECATION-001 TESTS ---')
  
  let createdStudentIds: number[] = []
  let createdClassIds: number[] = []

  try {
    const activeYear = await getActiveAcademicContext()
    if (!activeYear) {
      console.log('No active year found. Test requires an active year.')
      return
    }

    const [existingClass] = await db.select({ id: classes.id, teacherId: classes.teacherId }).from(classes).limit(1)
    if (!existingClass) throw new Error('No class found to test against')

    // 3. Student create creates enrollment
    console.log('Test 3: Student create creates enrollment')
    const newStudentId = await insertStudent({
      class_id: existingClass.id,
      full_name: 'Test Deprecation Student',
      enrollment_date: '2024-01-01'
    })
    createdStudentIds.push(newStudentId)

    const [activeEnrollment] = await db.select({ classId: enrollments.classId }).from(enrollments).where(and(eq(enrollments.studentId, newStudentId), eq(enrollments.academicYearId, activeYear.id)))
    assert(activeEnrollment, 'Student create MUST create active enrollment')

    // 6. Class create creates teacher_assignment
    console.log('Test 6: Class create creates teacher_assignment')
    const newClassId = await insertClass({
      program_id: 1, // Assume program 1 exists
      teacher_id: existingClass.teacherId,
      name: 'Test Deprecation Class'
    })
    createdClassIds.push(newClassId)

    const [activeAssignment] = await db.select({ teacherId: teacherAssignments.teacherId }).from(teacherAssignments).where(and(eq(teacherAssignments.classId, newClassId), eq(teacherAssignments.academicYearId, activeYear.id)))
    assert(activeAssignment, 'Class create MUST create active teacher assignment')

    // 15. Import Santri still creates enrollment
    console.log('Test 15: Import Santri creates enrollment')
    const validSantriImport = [{
      full_name: 'Import Deprecation Santri',
      nickname: 'Import',
      gender: 'male',
      date_of_birth: '2010-01-01',
      enrollment_date: '2024-01-01',
      class_id: existingClass.id
    }]
    await executeImport('santri', validSantriImport)
    const [importedStudent] = await db.select({ id: students.id }).from(students).where(eq(students.fullName, 'Import Deprecation Santri'))
    createdStudentIds.push(importedStudent.id)

    const [importedEnrollment] = await db.select({ classId: enrollments.classId }).from(enrollments).where(and(eq(enrollments.studentId, importedStudent.id), eq(enrollments.academicYearId, activeYear.id)))
    assert(importedEnrollment, 'Import MUST create an enrollment')

    console.log('✅ ALL TESTS PASSED')
  } finally {
    // Cleanup
    for (const id of createdStudentIds) {
      await db.delete(enrollments).where(eq(enrollments.studentId, id))
      await db.delete(students).where(eq(students.id, id))
    }
    for (const id of createdClassIds) {
      await db.delete(teacherAssignments).where(eq(teacherAssignments.classId, id))
      await db.delete(classes).where(eq(classes.id, id))
    }
  }
}

runTests().catch(e => {
  console.error(e)
  process.exit(1)
})
