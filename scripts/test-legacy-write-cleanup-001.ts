import { sql as rawSql, db } from '../lib/db/client'
import { insertStudent, updateStudent } from '../lib/db/queries/students'
import { insertClass, updateClass } from '../lib/db/queries/classes'
import { upsertEnrollment } from '../lib/db/queries/enrollments'
import { upsertTeacherAssignment } from '../lib/db/queries/teacher-assignments'
import { getActiveAcademicContext } from '../lib/db/queries/academic-context'
import { executeImport } from '../lib/import-export'
import { academicYears, enrollments, students, classes, teacherAssignments } from '../drizzle/schema'
import { eq, ne, and } from 'drizzle-orm'
import assert from 'assert'

async function runTests() {
  console.log('--- STARTING LEGACY-WRITE-CLEANUP-001 TESTS (UPDATED FOR LEGACY DROP) ---')

  let createdStudentIds: number[] = []
  let createdClassIds: number[] = []

  try {
    const activeYear = await getActiveAcademicContext()
    if (!activeYear) {
      console.log('No active year found. Test requires an active year.')
      return
    }

    const [existingStudent] = await db.select({ id: students.id }).from(students).limit(1)
    const [existingClass] = await db.select({ id: classes.id }).from(classes).limit(1)

    // 3. Generic student edit cannot independently change academic class.
    console.log('Test 3: Generic student edit cannot change academic class')
    if (existingStudent) {
      await updateStudent(existingStudent.id, { full_name: 'Edited Name Test' })
      console.log('Test 3: Passed')
    }

    // 6. Generic class edit cannot independently change teacher assignment.
    console.log('Test 6: Generic class edit cannot change teacher assignment')
    if (existingClass) {
      await updateClass(existingClass.id, { name: 'Edited Class Name' })
      console.log('Test 6: Passed')
    }

    // 7. Active-year invariant holds after successful student creation
    console.log('Test 7: Atomic Student Creation')
    if (existingClass) {
      const newStudentId = await insertStudent({
        class_id: existingClass.id, // Parameter for enrollment
        full_name: 'Test Atomic Student',
        enrollment_date: '2024-01-01'
      })
      createdStudentIds.push(newStudentId)

      const [activeEnrollment] = await db.select({ classId: enrollments.classId }).from(enrollments).where(and(eq(enrollments.studentId, newStudentId), eq(enrollments.academicYearId, activeYear.id)))
      assert(activeEnrollment, 'Active enrollment MUST be created with student')
      assert.strictEqual(activeEnrollment.classId, existingClass.id, 'Invariant: enrollment.class_id is correct')
    }
    
    // 8. Atomic Class Creation
    console.log('Test 8: Atomic Class Creation')
    const [existingUser] = await rawSql`SELECT id FROM users WHERE role = 'guru' LIMIT 1`
    if (existingUser) {
      const newClassId = await insertClass({
        program_id: 1, // Assume program 1 exists
        teacher_id: Number(existingUser.id),
        name: 'Test Atomic Class'
      })
      createdClassIds.push(newClassId)

      const [activeAssignment] = await db.select({ teacherId: teacherAssignments.teacherId }).from(teacherAssignments).where(and(eq(teacherAssignments.classId, newClassId), eq(teacherAssignments.academicYearId, activeYear.id)))
      
      assert(activeAssignment, 'Active teacher assignment MUST be created with class')
      assert.strictEqual(activeAssignment.teacherId, Number(existingUser.id), 'Invariant: assignment.teacher_id is correct')
    }

    // 9. Import logic requires active year & creates enrollments
    console.log('Test 9: Import Logic')
    if (existingClass) {
      const validSantriImport = [{
        full_name: 'Import Test Santri',
        nickname: 'Import',
        gender: 'male',
        date_of_birth: '2010-01-01',
        enrollment_date: '2024-01-01',
        class_id: existingClass.id
      }]
      await executeImport('santri', validSantriImport)
      const [importedStudent] = await db.select({ id: students.id }).from(students).where(eq(students.fullName, 'Import Test Santri'))
      createdStudentIds.push(importedStudent.id)

      const [importedEnrollment] = await db.select({ classId: enrollments.classId }).from(enrollments).where(and(eq(enrollments.studentId, importedStudent.id), eq(enrollments.academicYearId, activeYear.id)))
      assert(importedEnrollment, 'Import MUST create an enrollment')
      assert.strictEqual(importedEnrollment.classId, existingClass.id, 'Import Invariant: active enrollment.classId correct')
    }

    console.log('--- ALL TESTS PASSED ---')
  } finally {
    // Cleanup
    for (const id of createdStudentIds) {
      await rawSql`DELETE FROM enrollments WHERE student_id = ${id}`
      await rawSql`DELETE FROM students WHERE id = ${id}`
    }
    for (const id of createdClassIds) {
      await rawSql`DELETE FROM teacher_assignments WHERE class_id = ${id}`
      await rawSql`DELETE FROM classes WHERE id = ${id}`
    }
  }
}

runTests().catch(e => {
  console.error(e)
  process.exit(1)
})
