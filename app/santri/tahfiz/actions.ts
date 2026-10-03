'use server'

import { requireAuth } from '@/lib/auth/rbac'
import { requireSelfStudentProfile } from '@/lib/identity/learner'
import { db } from '@/lib/db/client'
import { surahs, hafalanRecords, tasmiSessions } from '@/drizzle/schema'
import { eq, and, desc, inArray, sql } from 'drizzle-orm'
import { getStudentTahfizCoverageQuery, getActiveTahfizTargetQuery } from '@/lib/db/queries/tahfiz'
import { calculateTargetProgress } from '@/lib/tahfiz/progress'
import { studentIdToDbNumber } from '@/lib/guardians/parent-context'

export async function getSantriTahfizOverviewAction() {
  try {
    const { session, role } = await requireAuth()

    // Authorization: Must have a linked learner profile
    const student = await requireSelfStudentProfile(session.userId)
    const dbStudentId = studentIdToDbNumber(student.id)

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
          inArray(tasmiSessions.status, ['PASSED', 'NEEDS_REVIEW'])
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
      success: true,
      data: {
        student,
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
    }
  } catch (error: any) {
    console.error('getSantriTahfizOverviewAction error:', error)
    if (error.message?.includes('NO_LEARNER_PROFILE')) {
      return { success: false, error: 'NO_LEARNER_PROFILE' }
    }
    return { success: false, error: 'Gagal memuat data Tahfiz' }
  }
}

import { getSmartTahfizInsights } from '@/lib/tahfiz/smart-service'

export async function getSantriSmartInsightsAction() {
  try {
    const { session } = await requireAuth()
    const student = await requireSelfStudentProfile(session.userId)
    const dbStudentId = studentIdToDbNumber(student.id)

    const insights = await getSmartTahfizInsights(dbStudentId)

    // Parent/Santri does not need to see stalled target flags, but Santri sees nextFocus
    return {
      success: true,
      data: {
        hasActiveTarget: insights.hasActiveTarget,
        remainingAyahs: insights.remainingAyahs,
        nextFocus: insights.nextFocus,
        activity30d: insights.activity30d,
        murajaahRecency: insights.murajaahRecency
        // stalled deliberately omitted for Santri payload
      }
    }
  } catch (error: any) {
    return { success: false, error: 'Gagal memuat insight' }
  }
}
