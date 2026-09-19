'use server'

import { requirePermission } from '@/lib/auth/rbac'
import { createTasmiSession, updateTasmiSession, deleteTasmiSession } from '@/lib/tasmi/service'
import { db } from '@/lib/db/client'
import { tasmiSessions, students, enrollments, classes, academicYears, teacherAssignments } from '@/drizzle/schema'
import { eq, and } from 'drizzle-orm'

async function checkGuruStudentScope(teacherId: number, studentId: number) {
  const isAssigned = await db.select({ id: students.id })
    .from(students)
    .innerJoin(enrollments, eq(enrollments.studentId, students.id))
    .innerJoin(classes, eq(classes.id, enrollments.classId))
    .innerJoin(academicYears, and(eq(academicYears.id, enrollments.academicYearId), eq(academicYears.isActive, true)))
    .innerJoin(teacherAssignments, and(
      eq(teacherAssignments.classId, classes.id),
      eq(teacherAssignments.academicYearId, academicYears.id),
      eq(teacherAssignments.teacherId, teacherId)
    ))
    .where(eq(students.id, studentId))
    .limit(1)

  if (isAssigned.length === 0) {
    throw new Error('Forbidden: Student not assigned to you')
  }
}

export async function createGuruTasmiAction(data: {
  studentId: number
  mode: 'SURAH' | 'JUZ_RANGE'
  sessionDate: string
  score?: number | null
  status: 'PASSED' | 'NEEDS_REVIEW'
  notes?: string | null
  surahId?: number | null
  startJuz?: number | null
  endJuz?: number | null
}) {
  try {
    const auth = await requirePermission('academic.tasmi.manage')
    await checkGuruStudentScope(auth.session.userId, data.studentId)
    
    await createTasmiSession({
      studentIdRaw: data.studentId,
      mode: data.mode,
      sessionDate: data.sessionDate,
      score: data.score,
      status: data.status,
      notes: data.notes,
      ...(data.mode === 'SURAH' 
        ? { surahId: data.surahId! }
        : { startJuz: data.startJuz!, endJuz: data.endJuz! })
    } as any)
    
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menyimpan tasmi' }
  }
}

export async function updateGuruTasmiAction(id: number, data: {
  sessionDate?: string
  score?: number | null
  status?: 'PASSED' | 'NEEDS_REVIEW'
  notes?: string | null
  surahId?: number | null
  startJuz?: number | null
  endJuz?: number | null
}) {
  try {
    const auth = await requirePermission('academic.tasmi.manage')
    
    const records = await db.select({ studentId: tasmiSessions.studentId, mode: tasmiSessions.mode })
      .from(tasmiSessions)
      .where(eq(tasmiSessions.id, id))
      .limit(1)

    if (records.length === 0) throw new Error('Record not found')
    const record = records[0]

    await checkGuruStudentScope(auth.session.userId, record.studentId)

    await updateTasmiSession(id, {
      studentIdRaw: record.studentId,
      mode: record.mode as 'SURAH' | 'JUZ_RANGE', // Locked
      sessionDate: data.sessionDate || new Date().toISOString(),
      score: data.score,
      status: data.status || 'PASSED',
      notes: data.notes,
      ...(record.mode === 'SURAH' 
        ? { surahId: data.surahId! }
        : { startJuz: data.startJuz!, endJuz: data.endJuz! })
    } as any)
    
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengupdate tasmi' }
  }
}

export async function deleteGuruTasmiAction(id: number) {
  try {
    const auth = await requirePermission('academic.tasmi.manage')
    
    const records = await db.select({ studentId: tasmiSessions.studentId })
      .from(tasmiSessions)
      .where(eq(tasmiSessions.id, id))
      .limit(1)

    if (records.length === 0) throw new Error('Record not found')
    const record = records[0]

    await checkGuruStudentScope(auth.session.userId, record.studentId)

    await deleteTasmiSession(id, record.studentId)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menghapus tasmi' }
  }
}
