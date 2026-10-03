import { txDb as db } from '@/lib/db/tx'
import { hafalanRecords, tahfizSurahCoverage, tahfizTargets, auditLogs, students, surahs } from '@/drizzle/schema'
import { eq, and, asc, desc } from 'drizzle-orm'
import { requirePermission, requireStudentAccess, CanonicalRole, authorizePermission, authorizeStudentAccess, AuthError } from '@/lib/auth/rbac'
import { SessionPayload } from '@/lib/auth/session'
import { assertNotSelfAssessment } from '@/lib/identity/self-assessment'
import { normalizeCoverageRanges, AyahRange } from './normalize'
import { getSurahById } from '@/lib/db/queries/surahs'
import { validateSurahAyahRange } from '@/lib/quran/validators'

// 1. Coverage Rebuild (Server Only)
export async function rebuildStudentSurahCoverage(studentId: number, surahId: number, txClient = db) {
  return await txClient.transaction(async (tx) => {
    // Lock parent student row for concurrency safety
    await tx.select({ id: students.id }).from(students).where(eq(students.id, studentId)).for('update')

    const records = await tx.select().from(hafalanRecords).where(
      and(eq(hafalanRecords.studentId, studentId), eq(hafalanRecords.surahId, surahId))
    )

    const ranges = records.map(r => ({ ayahStart: r.ayahStart, ayahEnd: r.ayahEnd }))
    const normalized = normalizeCoverageRanges(ranges)

    await tx.delete(tahfizSurahCoverage).where(
      and(eq(tahfizSurahCoverage.studentId, studentId), eq(tahfizSurahCoverage.surahId, surahId))
    )

    if (normalized.length > 0) {
      const inserts = normalized.map(r => ({
        studentId,
        surahId,
        ayahStart: r.ayahStart,
        ayahEnd: r.ayahEnd,
        updatedAt: new Date(),
      }))
      await tx.insert(tahfizSurahCoverage).values(inserts)
    }
  })
}

// 2. Transactional Hafalan Write
export async function addHafalanRecord(data: {
  student_id: number
  teacher_id: number
  surah_id: number
  session_date: string
  ayah_start: number
  ayah_end: number
  type: 'hafalan_baru' | 'muraja_ah'
  score?: number
}) {
  const surah = await getSurahById(data.surah_id)
  const validationError = validateSurahAyahRange(surah, data.ayah_start, data.ayah_end)
  if (validationError) {
    throw new Error(validationError)
  }

  return await db.transaction(async (tx) => {
    const [inserted] = await tx.insert(hafalanRecords).values({
      studentId: data.student_id,
      teacherId: data.teacher_id,
      surahId: data.surah_id,
      sessionDate: data.session_date,
      ayahStart: data.ayah_start,
      ayahEnd: data.ayah_end,
      type: data.type,
      score: data.score,
    }).returning({ id: hafalanRecords.id })

    await rebuildStudentSurahCoverage(data.student_id, data.surah_id, tx as any)

    return inserted.id
  })
}

// 3. Targets
export async function createTahfizTarget(data: {
  studentId: number
  academicYearId: number
  startSurahId: number
  startAyah: number
  endSurahId: number
  endAyah: number
}, auth: { session: SessionPayload; role: CanonicalRole }) {
  if (!(await authorizePermission('academic.tahfiz.manage', auth))) throw new AuthError(403, 'Forbidden: Missing permission')
  if (!(await authorizeStudentAccess(data.studentId, auth))) throw new AuthError(403, 'Forbidden: Student not accessible')

  // Validate boundaries using surah limits
  const startSurah = await getSurahById(data.startSurahId)
  const endSurah = await getSurahById(data.endSurahId)
  if (!startSurah || !endSurah) throw new Error('Invalid surah')

  if (data.startAyah < 1 || data.startAyah > startSurah.total_ayahs) throw new Error('Invalid start ayah')
  if (data.endAyah < 1 || data.endAyah > endSurah.total_ayahs) throw new Error('Invalid end ayah')

  // Validate cross-surah textual order: smaller surah_id means LATER in Quran textual order (since 1=Fatihah, 114=An-Nas)
  // Wait: The canonical Quran order implies smaller surah number = earlier. 
  // Let's assume surah number matches ID in our DB, so An-Nas is 114, Fatihah is 1.
  if (startSurah.number > endSurah.number) {
    throw new Error('Start surah must come before end surah textually')
  } else if (startSurah.number === endSurah.number) {
    if (data.startAyah > data.endAyah) throw new Error('Start ayah must be <= end ayah')
  }

  return await db.transaction(async (tx) => {
    const activeTarget = await tx.select().from(tahfizTargets).where(
      and(
        eq(tahfizTargets.studentId, data.studentId),
        eq(tahfizTargets.academicYearId, data.academicYearId),
        eq(tahfizTargets.status, 'ACTIVE')
      )
    ).limit(1)

    if (activeTarget.length > 0) {
      throw new Error('Student already has an active target for this academic year. Use revise instead.')
    }

    const [inserted] = await tx.insert(tahfizTargets).values({
      ...data,
      status: 'ACTIVE'
    }).returning()

    await tx.insert(auditLogs).values({
      actorUserId: auth.session.userId,
      action: 'TAHFIZ_TARGET_CREATE',
      entityType: 'tahfiz_targets',
      entityId: inserted.id,
      newValues: inserted
    })

    return inserted
  })
}

export async function completeTahfizTarget(targetId: number, auth: { session: SessionPayload; role: CanonicalRole }) {
  if (!(await authorizePermission('academic.tahfiz.manage', auth))) throw new AuthError(403, 'Forbidden: Missing permission')
  
  return await db.transaction(async (tx) => {
    const target = await tx.select().from(tahfizTargets).where(eq(tahfizTargets.id, targetId)).limit(1)
    if (target.length === 0) throw new Error('Target not found')
    if (target[0].status !== 'ACTIVE') throw new Error('Can only complete ACTIVE targets')

    if (!(await authorizeStudentAccess(target[0].studentId, auth))) throw new AuthError(403, 'Forbidden: Student not accessible')

    const [updated] = await tx.update(tahfizTargets)
      .set({ status: 'COMPLETED', updatedAt: new Date() })
      .where(eq(tahfizTargets.id, targetId))
      .returning()

    await tx.insert(auditLogs).values({
      actorUserId: auth.session.userId,
      action: 'TAHFIZ_TARGET_COMPLETE',
      entityType: 'tahfiz_targets',
      entityId: targetId,
      oldValues: target[0],
      newValues: updated
    })

    return updated
  })
}

export async function cancelTahfizTarget(targetId: number, auth: { session: SessionPayload; role: CanonicalRole }) {
  if (!(await authorizePermission('academic.tahfiz.manage', auth))) throw new AuthError(403, 'Forbidden: Missing permission')
  
  return await db.transaction(async (tx) => {
    const target = await tx.select().from(tahfizTargets).where(eq(tahfizTargets.id, targetId)).limit(1)
    if (target.length === 0) throw new Error('Target not found')
    if (target[0].status !== 'ACTIVE') throw new Error('Can only cancel ACTIVE targets')

    if (!(await authorizeStudentAccess(target[0].studentId, auth))) throw new AuthError(403, 'Forbidden: Student not accessible')

    const [updated] = await tx.update(tahfizTargets)
      .set({ status: 'CANCELLED', updatedAt: new Date() })
      .where(eq(tahfizTargets.id, targetId))
      .returning()

    await tx.insert(auditLogs).values({
      actorUserId: auth.session.userId,
      action: 'TAHFIZ_TARGET_CANCEL',
      entityType: 'tahfiz_targets',
      entityId: targetId,
      oldValues: target[0],
      newValues: updated
    })

    return updated
  })
}

export async function reviseTahfizTarget(
  targetId: number,
  newData: {
    startSurahId: number
    startAyah: number
    endSurahId: number
    endAyah: number
  },
  auth: { session: SessionPayload; role: CanonicalRole }
) {
  if (!(await authorizePermission('academic.tahfiz.manage', auth))) throw new AuthError(403, 'Forbidden: Missing permission')

  const startSurah = await getSurahById(newData.startSurahId)
  const endSurah = await getSurahById(newData.endSurahId)
  if (!startSurah || !endSurah) throw new Error('Invalid surah')

  if (newData.startAyah < 1 || newData.startAyah > startSurah.total_ayahs) throw new Error('Invalid start ayah')
  if (newData.endAyah < 1 || newData.endAyah > endSurah.total_ayahs) throw new Error('Invalid end ayah')

  if (startSurah.number > endSurah.number) {
    throw new Error('Start surah must come before end surah textually')
  } else if (startSurah.number === endSurah.number) {
    if (newData.startAyah > newData.endAyah) throw new Error('Start ayah must be <= end ayah')
  }

  return await db.transaction(async (tx) => {
    const target = await tx.select().from(tahfizTargets).where(eq(tahfizTargets.id, targetId)).for('update').limit(1)
    if (target.length === 0) throw new Error('Target not found')
    if (target[0].status !== 'ACTIVE') throw new Error('Can only revise ACTIVE targets')

    if (!(await authorizeStudentAccess(target[0].studentId, auth))) throw new AuthError(403, 'Forbidden: Student not accessible')

    const [updatedOld] = await tx.update(tahfizTargets)
      .set({ status: 'SUPERSEDED', updatedAt: new Date() })
      .where(eq(tahfizTargets.id, targetId))
      .returning()

    const [newTarget] = await tx.insert(tahfizTargets).values({
      studentId: target[0].studentId,
      academicYearId: target[0].academicYearId,
      startSurahId: newData.startSurahId,
      startAyah: newData.startAyah,
      endSurahId: newData.endSurahId,
      endAyah: newData.endAyah,
      status: 'ACTIVE',
      supersedesTargetId: targetId
    }).returning()

    await tx.insert(auditLogs).values({
      actorUserId: auth.session.userId,
      action: 'TAHFIZ_TARGET_REVISE',
      entityType: 'tahfiz_targets',
      entityId: newTarget.id,
      oldValues: target[0],
      newValues: newTarget,
      metadata: { supersedes: targetId }
    })

    return newTarget
  })
}
