'use server'

import { getSession } from '@/lib/auth/session'
import { resolveParentChildContext, studentIdToDbNumber } from '@/lib/guardians/parent-context'
import { db } from '@/lib/db/client'
import { surahs, hafalanRecords, tasmiSessions } from '@/drizzle/schema'
import { eq, and, desc, sql } from 'drizzle-orm'
import { getStudentTahfizCoverageQuery, getActiveTahfizTargetQuery } from '@/lib/db/queries/tahfiz'
import { calculateTargetProgress } from '@/lib/tahfiz/progress'

export async function getParentTahfizOverviewAction(childId?: string) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'orang_tua') {
      return { error: 'Gagal memuat data Tahfiz: Sesi tidak valid' }
    }

    const resolution = await resolveParentChildContext({
      userId: session.userId,
      requestedChildId: childId,
    })

    if (resolution.status !== 'AUTHORIZED') {
      return { resolutionStatus: resolution.status }
    }

    const dbStudentId = studentIdToDbNumber(resolution.childId)

    // Parallel fetch target, coverage, hafalan, tasmi, surahs
    const [target, coverage, hafalanRows, tasmiRows, allSurahs] = await Promise.all([
      getActiveTahfizTargetQuery(dbStudentId),
      getStudentTahfizCoverageQuery(dbStudentId),
      db.select({
        id: hafalanRecords.id,
        date: sql<string>`TO_CHAR(${hafalanRecords.sessionDate}, 'YYYY-MM-DD')`,
        surahName: surahs.nameLatin,
        startAyah: hafalanRecords.ayahStart,
        endAyah: hafalanRecords.ayahEnd,
        type: hafalanRecords.type,
        score: hafalanRecords.score,
      })
      .from(hafalanRecords)
      .innerJoin(surahs, eq(surahs.id, hafalanRecords.surahId))
      .where(eq(hafalanRecords.studentId, dbStudentId))
      .orderBy(desc(hafalanRecords.sessionDate), desc(hafalanRecords.id))
      .limit(10),
      db.select({
        id: tasmiSessions.id,
        date: sql<string>`TO_CHAR(${tasmiSessions.sessionDate}, 'YYYY-MM-DD')`,
        mode: tasmiSessions.mode,
        surahName: surahs.nameLatin,
        startJuz: tasmiSessions.startJuz,
        endJuz: tasmiSessions.endJuz,
        score: tasmiSessions.score,
        status: tasmiSessions.status
      })
      .from(tasmiSessions)
      .leftJoin(surahs, eq(tasmiSessions.surahId, surahs.id))
      .where(
        and(
          eq(tasmiSessions.studentId, dbStudentId),
          eq(tasmiSessions.status, 'PASSED')
        )
      )
      .orderBy(desc(tasmiSessions.sessionDate), desc(tasmiSessions.id))
      .limit(5),
      db.select({ id: surahs.id, number: surahs.number, totalAyahs: surahs.totalAyahs, nameLatin: surahs.nameLatin }).from(surahs)
    ])

    // Calculate Target Progress
    let targetProgress = null
    let targetDetails = null
    if (target) {
      targetProgress = calculateTargetProgress(target, allSurahs, coverage)

      targetDetails = {
        ...target,
        startSurahName: allSurahs.find((s: any) => s.id === target.startSurahId)?.nameLatin || '',
        endSurahName: allSurahs.find((s: any) => s.id === target.endSurahId)?.nameLatin || ''
      }
    }

    return {
      resolutionStatus: 'AUTHORIZED',
      child: resolution.child,
      children: resolution.children,
      target: targetDetails,
      targetProgress: targetProgress ? {
        percentage: targetProgress.percentage,
        completedAyahs: targetProgress.coveredAyahs,
        totalAyahsTarget: targetProgress.totalTargetAyahs
      } : null,
      coverage,
      hafalanHistory: hafalanRows,
      tasmiAchievements: tasmiRows,
      surahs: allSurahs
    }
  } catch (e) {
    console.error('getParentTahfizOverviewAction error:', e)
    return { error: 'Gagal memuat data Tahfiz' }
  }
}

import { getSmartTahfizInsights } from '@/lib/tahfiz/smart-service'

export async function getParentSmartInsightsAction(childId?: string) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'orang_tua') {
      return { success: false, error: 'Sesi tidak valid' }
    }

    const resolution = await resolveParentChildContext({
      userId: session.userId,
      requestedChildId: childId,
    })

    if (resolution.status !== 'AUTHORIZED') {
      return { success: false, error: 'Tidak ada akses' }
    }

    const dbStudentId = studentIdToDbNumber(resolution.childId)
    const insights = await getSmartTahfizInsights(dbStudentId)

    // Parent receives the most minimal insight. No nextFocus, no stalled target.
    return {
      success: true,
      data: {
        hasActiveTarget: insights.hasActiveTarget,
        remainingAyahs: insights.remainingAyahs,
        activity30d: insights.activity30d,
        murajaahRecency: insights.murajaahRecency
      }
    }
  } catch (error: any) {
    return { success: false, error: 'Gagal memuat insight' }
  }
}

import { getGuardianRelationship } from '@/lib/guardians/access'
import { getSurahById } from '@/lib/db/queries/surahs'
import { validateSurahAyahRange } from '@/lib/quran/validators'
import { createHomeMurajaah, getHomeMurajaahByStudent } from '@/lib/db/queries/home-murajaah'
import { createAuditLog } from '@/lib/audit/logger'
import { AuditAction, AuditEntityType } from '@/lib/audit/types'

export type RecordHomeMurajaahInput = {
  childId?: string
  studentId?: number
  surahId: number
  sessionDate: string
  ayahStart: number
  ayahEnd: number
  notes?: string
}

export async function recordHomeMurajaahAction(input: RecordHomeMurajaahInput) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'orang_tua') {
      return { success: false, error: 'Akses ditolak: Sesi orang tua tidak valid' }
    }

    let resolvedStudentId: number
    if (input.childId) {
      const resolution = await resolveParentChildContext({
        userId: session.userId,
        requestedChildId: input.childId,
      })
      if (resolution.status !== 'AUTHORIZED') {
        return { success: false, error: 'Akses ditolak: Santri tidak terhubung dengan akun Anda' }
      }
      resolvedStudentId = studentIdToDbNumber(resolution.childId)
    } else if (input.studentId) {
      const rel = await getGuardianRelationship(session.userId, Number(input.studentId))
      if (!rel) {
        return { success: false, error: 'Akses ditolak: Santri tidak terhubung dengan akun Anda' }
      }
      resolvedStudentId = Number(input.studentId)
    } else {
      return { success: false, error: 'Santri wajib dipilih' }
    }

    // Validate date format & validity
    if (!input.sessionDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.sessionDate)) {
      return { success: false, error: 'Format tanggal harus YYYY-MM-DD' }
    }
    const parsedDate = new Date(input.sessionDate)
    if (isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== input.sessionDate) {
      return { success: false, error: 'Tanggal muroja\'ah tidak valid' }
    }

    // Validate surah & ayah boundaries
    const surahId = Number(input.surahId)
    const surah = await getSurahById(surahId)
    if (!surah) {
      return { success: false, error: 'Surah tidak ditemukan dalam database master' }
    }

    const ayahStart = Number(input.ayahStart)
    const ayahEnd = Number(input.ayahEnd)
    const rangeError = validateSurahAyahRange(surah, ayahStart, ayahEnd)
    if (rangeError) {
      return { success: false, error: rangeError }
    }

    const newId = await createHomeMurajaah({
      studentId: resolvedStudentId,
      parentUserId: session.userId,
      surahId,
      sessionDate: input.sessionDate,
      ayahStart,
      ayahEnd,
      notes: input.notes?.trim() || null,
    })

    await createAuditLog({
      action: AuditAction.HOME_MURAJAAH_CREATED,
      entityType: AuditEntityType.HOME_MURAJAAH,
      entityId: newId,
      actorUserId: session.userId,
      newValues: {
        studentId: resolvedStudentId,
        surahId,
        sessionDate: input.sessionDate,
        ayahStart,
        ayahEnd,
        notes: input.notes?.trim() || null,
        status: 'PENDING',
      },
    })

    return { success: true, id: newId }
  } catch (error: any) {
    console.error('recordHomeMurajaahAction error:', error)
    return { success: false, error: error.message || 'Gagal menyimpan catatan muroja\'ah' }
  }
}

export async function getHomeMurajaahListAction(childId?: string, studentId?: number) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'orang_tua') {
      return { success: false, error: 'Sesi tidak valid' }
    }

    let resolvedStudentId: number
    if (childId) {
      const resolution = await resolveParentChildContext({
        userId: session.userId,
        requestedChildId: childId,
      })
      if (resolution.status !== 'AUTHORIZED') {
        return { success: false, error: 'Tidak ada akses ke data santri ini' }
      }
      resolvedStudentId = studentIdToDbNumber(resolution.childId)
    } else if (studentId) {
      const rel = await getGuardianRelationship(session.userId, Number(studentId))
      if (!rel) {
        return { success: false, error: 'Tidak ada akses ke data santri ini' }
      }
      resolvedStudentId = Number(studentId)
    } else {
      return { success: false, error: 'Santri wajib ditentukan' }
    }

    const records = await getHomeMurajaahByStudent(resolvedStudentId)
    return { success: true, data: records }
  } catch (error: any) {
    return { success: false, error: 'Gagal memuat riwayat muroja\'ah' }
  }
}

