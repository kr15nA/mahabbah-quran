import { sql } from '@/lib/db/client'

async function checkDb() {
  console.log('--- STARTING PRE-DROP VERIFICATION ---')
  
  // 1. Active students requiring placement: exactly one active-year enrollment each.
  // "active student" = deleted_at IS NULL and status = 'active'
  const activeStudentsNoEnrollment = await sql`
    SELECT s.id, s.full_name 
    FROM students s
    LEFT JOIN enrollments e ON e.student_id = s.id 
      AND e.academic_year_id = (SELECT id FROM academic_years WHERE is_active = TRUE LIMIT 1)
    WHERE s.status = 'active' AND s.deleted_at IS NULL AND e.id IS NULL
  `
  
  if (activeStudentsNoEnrollment.length > 0) {
    console.error('ERROR: Active students with no active enrollment found:', activeStudentsNoEnrollment)
    process.exit(1)
  }
  
  // 2. Active classes requiring primary teacher: exactly one active-year teacher_assignment each.
  const activeClassesNoTeacher = await sql`
    SELECT c.id, c.name 
    FROM classes c
    LEFT JOIN teacher_assignments ta ON ta.class_id = c.id 
      AND ta.academic_year_id = (SELECT id FROM academic_years WHERE is_active = TRUE LIMIT 1)
    WHERE c.is_active = TRUE AND ta.id IS NULL
  `
  
  if (activeClassesNoTeacher.length > 0) {
    console.error('ERROR: Active classes with no active teacher assignment found:', activeClassesNoTeacher)
    process.exit(1)
  }
  
  // 3. No duplicate active enrollment anomaly.
  const duplicateEnrollments = await sql`
    SELECT student_id, COUNT(*)
    FROM enrollments
    WHERE academic_year_id = (SELECT id FROM academic_years WHERE is_active = TRUE LIMIT 1)
    GROUP BY student_id
    HAVING COUNT(*) > 1
  `
  if (duplicateEnrollments.length > 0) {
    console.error('ERROR: Duplicate active enrollments found:', duplicateEnrollments)
    process.exit(1)
  }
  
  // 4. No duplicate primary teacher assignment anomaly.
  const duplicateAssignments = await sql`
    SELECT class_id, COUNT(*)
    FROM teacher_assignments
    WHERE academic_year_id = (SELECT id FROM academic_years WHERE is_active = TRUE LIMIT 1)
    GROUP BY class_id
    HAVING COUNT(*) > 1
  `
  if (duplicateAssignments.length > 0) {
    console.error('ERROR: Duplicate active teacher assignments found:', duplicateAssignments)
    process.exit(1)
  }

  console.log('Pre-drop completeness checks PASSED!')
  process.exit(0)
}

checkDb().catch(e => { console.error(e); process.exit(1) })
