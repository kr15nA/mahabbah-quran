import { sql } from '@/lib/db/client'

export async function getUserProfileContext(userId: number) {
  // We need class_count, student_count, dynamic_roles, effective_permissions
  const counts = await sql`
    SELECT 
      (SELECT COUNT(DISTINCT class_id) FROM teacher_assignments ta JOIN academic_years ay ON ta.academic_year_id = ay.id WHERE ta.teacher_id = ${userId} AND ay.is_active = TRUE) as class_count,
      (SELECT COUNT(DISTINCT student_id) FROM student_parents WHERE parent_id = ${userId}) as student_count
  `
  
  const classCount = Number((counts[0] as any).class_count || 0)
  const studentCount = Number((counts[0] as any).student_count || 0)
  
  return { classCount, studentCount }
}
