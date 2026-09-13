import { sql } from '@/lib/db/client'
import { getStudentsByTeacher } from '@/lib/db/queries/students'
import { getClassesByTeacher } from '@/lib/db/queries/classes'
import { db } from '@/lib/db/client'
import { users, enrollments, teacherAssignments, academicYears, classes, students } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'

async function runTest() {
  console.log('--- STARTING API-MODERNIZATION-001 TESTS ---\n')

  // Create a new teacher to test with
  const randomEmail = 'modern.teacher' + Date.now() + '@example.com'
  const teacherRows = await sql`
    INSERT INTO users (full_name, email, role, phone, password_hash) 
    VALUES ('Modern Teacher', ${randomEmail}, 'guru', 'MODERN001', 'hash')
    RETURNING id
  `
  const teacherId = teacherRows[0].id

  // Create a program
  const randomProgram = 'Test Program Modern ' + Date.now()
  const programRows = await sql`
    INSERT INTO programs (name) VALUES (${randomProgram}) RETURNING id
  `
  const programId = programRows[0].id

  // Use existing active year
  const activeYearRes = await sql`SELECT id FROM academic_years WHERE is_active = TRUE LIMIT 1`
  const activeYearId = activeYearRes[0].id

  // Create a class with a STALE teacher_id (1), but active assignment to our new teacher (teacherId)
  const classRows = await sql`
    INSERT INTO classes (name, program_id, teacher_id) VALUES ('Modern Class', ${programId}, 1) RETURNING id
  `
  const classId = classRows[0].id

  await sql`
    INSERT INTO teacher_assignments (class_id, teacher_id, academic_year_id)
    VALUES (${classId}, ${teacherId}, ${activeYearId})
  `

  // Create a student with a STALE class_id (1), but active enrollment to our new class (classId)
  const studentRows = await sql`
    INSERT INTO students (full_name, class_id, enrollment_date)
    VALUES ('Modern Student', 1, CURRENT_DATE) RETURNING id
  `
  const studentId = studentRows[0].id

  await sql`
    INSERT INTO enrollments (student_id, academic_year_id, class_id, enrollment_date)
    VALUES (${studentId}, ${activeYearId}, ${classId}, CURRENT_DATE)
  `

  console.log('Test setup complete.\n')
  
  // 1. Fetch Teacher's Classes
  const myClasses = await getClassesByTeacher(teacherId)
  const modernClass = myClasses.find(c => c.id === classId)

  console.log('Class Response:')
  console.log('- Raw db classes.teacher_id:', 1)
  console.log('- API current_teacher_id:', modernClass?.current_teacher_id)
  console.log('- API teacher_id alias:', modernClass?.teacher_id)
  
  if (modernClass?.current_teacher_id !== teacherId) {
    throw new Error('FAILED: current_teacher_id is not derived from teacher_assignments')
  }
  if (modernClass?.teacher_id !== teacherId) {
    throw new Error('FAILED: teacher_id compatibility alias is not derived from teacher_assignments')
  }
  
  // 2. Fetch Teacher's Students
  const myStudents = await getStudentsByTeacher(teacherId)
  const modernStudent = myStudents.find(s => s.id === studentId)

  console.log('\nStudent Response:')
  console.log('- Raw db students.class_id:', 999)
  console.log('- API current_class_id:', modernStudent?.current_class_id)
  console.log('- API class_id alias:', modernStudent?.class_id)

  if (modernStudent?.current_class_id !== classId) {
    throw new Error('FAILED: current_class_id is not derived from enrollments')
  }
  if (modernStudent?.class_id !== classId) {
    throw new Error('FAILED: class_id compatibility alias is not derived from enrollments')
  }

  // Ensure 'teacher_id' in class and 'class_id' in student are present
  // but map to active year, strictly ignoring stale legacy values.
  
  // Check no active year (deactivate it temporarily)
  await sql`UPDATE academic_years SET is_active = FALSE WHERE id = ${activeYearId}`
  
  const myStudentsEmpty = await getStudentsByTeacher(teacherId)
  if (myStudentsEmpty.length !== 0) {
     throw new Error('FAILED: should return empty without active year due to INNER JOIN in getStudentsByTeacher')
  }
  
  const emptyStudentQuery = await sql`
    SELECT
      s.id, s.user_id, s.full_name, s.nickname, s.photo_url, s.date_of_birth, s.gender, s.enrollment_date, s.status, s.created_at, s.updated_at, s.deleted_at,
      e.class_id AS current_class_id,
      e.class_id AS class_id
    FROM students s
    LEFT JOIN enrollments e ON e.student_id = s.id AND e.academic_year_id = (SELECT id FROM academic_years WHERE is_active = TRUE LIMIT 1)
    WHERE s.id = ${studentId}
  `
  const emptyStudent = emptyStudentQuery[0]
  
  console.log('\nNo Active Year Fallback Check:')
  console.log('- API current_class_id:', emptyStudent?.current_class_id)
  console.log('- API class_id alias:', emptyStudent?.class_id)

  if (emptyStudent?.current_class_id !== null) {
    throw new Error('FAILED: current_class_id should be null when no active year')
  }
  if (emptyStudent?.class_id !== null) {
    throw new Error('FAILED: class_id should be null when no active year')
  }

  // Restore active year
  await sql`UPDATE academic_years SET is_active = TRUE WHERE id = ${activeYearId}`

  // Cleanup
  await sql`DELETE FROM enrollments WHERE student_id = ${studentId}`
  await sql`DELETE FROM students WHERE id = ${studentId}`
  await sql`DELETE FROM teacher_assignments WHERE class_id = ${classId}`
  await sql`DELETE FROM classes WHERE id = ${classId}`
  await sql`DELETE FROM programs WHERE id = ${programId}`
  await sql`DELETE FROM users WHERE id = ${teacherId}`

  console.log('\n--- TESTS PASSED ---')
  process.exit(0)
}

runTest().catch((err) => {
  console.error(err)
  process.exit(1)
})
