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
      tasmiAchievements: tasmiRows
    }
  } catch (e) {
    console.error('getParentTahfizOverviewAction error:', e)
    return { error: 'Gagal memuat data Tahfiz' }
  }
}
