import { db } from '@/lib/db/client'
import { tasmiSessions, surahs, users, students, enrollments, classes, teacherAssignments, academicYears } from '@/drizzle/schema'
import { eq, desc, and, ilike, SQL, sql } from 'drizzle-orm'

export type TasmiHistoryRow = {
  id: number
  student_id: number
  student_name: string
  class_name: string | null
  mode: 'SURAH' | 'JUZ_RANGE'
  surah_name_latin: string | null
  start_juz: number | null
  end_juz: number | null
  session_date: string | Date
  score: number | null
  status: 'PASSED' | 'NEEDS_REVIEW'
  examiner_name: string
  notes: string | null
  surah_id: number | null
}

export async function getGlobalTasmiHistory({
  page = 1,
  pageSize = 10,
  search = '',
  mode = 'all',
  status = 'all',
  teacherId = null // If provided, limits to students assigned to this teacher
}: {
  page?: number
  pageSize?: number
  search?: string
  mode?: string
  status?: string
  teacherId?: number | null
}): Promise<{ data: TasmiHistoryRow[]; total: number }> {
  
  const conditions: SQL[] = []
  
  if (search) {
    conditions.push(ilike(students.fullName, `%${search}%`))
  }
  
  if (mode === 'SURAH' || mode === 'JUZ_RANGE') {
    conditions.push(eq(tasmiSessions.mode, mode))
  }
  
  if (status === 'PASSED' || status === 'NEEDS_REVIEW') {
    conditions.push(eq(tasmiSessions.status, status))
  }
  
  // Scoping for Guru
  if (teacherId) {
    const assignedStudentsQuery = db.select({ id: students.id })
      .from(students)
      .innerJoin(enrollments, eq(enrollments.studentId, students.id))
      .innerJoin(classes, eq(classes.id, enrollments.classId))
      .innerJoin(academicYears, and(eq(academicYears.id, enrollments.academicYearId), eq(academicYears.isActive, true)))
      .innerJoin(teacherAssignments, and(
        eq(teacherAssignments.classId, classes.id),
        eq(teacherAssignments.academicYearId, academicYears.id),
        eq(teacherAssignments.teacherId, teacherId)
      ))
      
    conditions.push(sql`${tasmiSessions.studentId} IN (${assignedStudentsQuery})`)
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined
  
  // Count
  const countRow = await db.select({ count: sql<number>`count(*)` })
    .from(tasmiSessions)
    .innerJoin(students, eq(tasmiSessions.studentId, students.id))
    .where(whereClause)
    
  const total = Number(countRow[0]?.count || 0)
  
  // Data
  const offset = (page - 1) * pageSize
  
  // Note: For class name, we might just fetch the current class or omit it if complex.
  // We can join classes through enrollments for current active academic year if we want, or just omit if null is fine.
  // To keep it bounded and safe from duplicates, we will just use a lateral join or simple subquery for className.
  const currentClassSubquery = db.select({ name: classes.name })
    .from(enrollments)
    .innerJoin(classes, eq(classes.id, enrollments.classId))
    .innerJoin(academicYears, and(eq(academicYears.id, enrollments.academicYearId), eq(academicYears.isActive, true)))
    .where(eq(enrollments.studentId, students.id))
    .limit(1)

  const dataRows = await db.select({
    id: tasmiSessions.id,
    student_id: tasmiSessions.studentId,
    student_name: students.fullName,
    class_name: sql<string>`(${currentClassSubquery})`,
    mode: tasmiSessions.mode,
    surah_name_latin: surahs.nameLatin,
    surah_id: tasmiSessions.surahId,
    start_juz: tasmiSessions.startJuz,
    end_juz: tasmiSessions.endJuz,
    session_date: sql<string>`TO_CHAR(${tasmiSessions.sessionDate}, 'YYYY-MM-DD')`,
    score: tasmiSessions.score,
    status: tasmiSessions.status,
    examiner_name: users.fullName,
    notes: tasmiSessions.notes
  })
  .from(tasmiSessions)
  .innerJoin(students, eq(tasmiSessions.studentId, students.id))
  .leftJoin(surahs, eq(tasmiSessions.surahId, surahs.id))
  .innerJoin(users, eq(tasmiSessions.examinerId, users.id))
  .where(whereClause)
  .orderBy(desc(tasmiSessions.sessionDate), desc(tasmiSessions.id))
  .limit(pageSize)
  .offset(offset)
  
  return {
    data: dataRows as TasmiHistoryRow[],
    total
  }
}
