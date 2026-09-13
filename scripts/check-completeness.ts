import { db } from '../lib/db/client'
import { getActiveAcademicContext } from '../lib/db/queries/academic-context'
import { sql } from 'drizzle-orm'

async function checkCompleteness() {
  const activeYear = await getActiveAcademicContext()
  if (!activeYear) {
    console.error('No active academic year found')
    process.exit(1)
  }

  console.log(`Active Year ID: ${activeYear.id}`)

  // Students missing enrollment
  const result1 = await db.execute(sql`
    SELECT id, full_name, class_id 
    FROM students s
    WHERE s.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM enrollments e 
      WHERE e.student_id = s.id AND e.academic_year_id = ${activeYear.id}
    )
  `)
  console.log(`Students missing active enrollment: ${result1.rows.length}`)
  if (result1.rows.length > 0) console.log(result1.rows)

  // Students with duplicate enrollments
  const result2 = await db.execute(sql`
    SELECT student_id, count(*)
    FROM enrollments
    WHERE academic_year_id = ${activeYear.id}
    GROUP BY student_id
    HAVING count(*) > 1
  `)
  console.log(`Students with duplicate enrollments: ${result2.rows.length}`)

  // Classes missing teacher assignment
  const result3 = await db.execute(sql`
    SELECT id, name, teacher_id
    FROM classes c
    WHERE c.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM teacher_assignments ta
      WHERE ta.class_id = c.id AND ta.academic_year_id = ${activeYear.id}
    )
  `)
  console.log(`Classes missing active teacher assignment: ${result3.rows.length}`)
  if (result3.rows.length > 0) console.log(result3.rows)

  // Classes with duplicate assignments
  const result4 = await db.execute(sql`
    SELECT class_id, count(*)
    FROM teacher_assignments
    WHERE academic_year_id = ${activeYear.id}
    GROUP BY class_id
    HAVING count(*) > 1
  `)
  console.log(`Classes with duplicate assignments: ${result4.rows.length}`)
}

checkCompleteness().catch(console.error).then(() => process.exit(0))
