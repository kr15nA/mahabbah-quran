'use server'

import { requirePermission } from '@/lib/auth/rbac'
import { createTasmiSession, updateTasmiSession, deleteTasmiSession } from '@/lib/tasmi/service'
import { db } from '@/lib/db/client'
import { tasmiSessions } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'

export async function createTasmiAction(data: {
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

export async function updateTasmiAction(id: number, data: {
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

export async function deleteTasmiAction(id: number) {
  try {
    const auth = await requirePermission('academic.tasmi.manage')
    
    const records = await db.select({ studentId: tasmiSessions.studentId })
      .from(tasmiSessions)
      .where(eq(tasmiSessions.id, id))
      .limit(1)
      
    if (records.length === 0) throw new Error('Record not found')

    await deleteTasmiSession(id, records[0].studentId)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menghapus tasmi' }
  }
}
