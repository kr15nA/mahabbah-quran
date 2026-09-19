import { db } from '@/lib/db/client'
import { studentParents, students, users, enrollments, classes, programs, academicYears } from '@/drizzle/schema'
import { eq, and, isNull, ilike, sql, or, desc, asc, notInArray, count, inArray } from 'drizzle-orm'

export type ExplorerSummaryDTO = {
  totalActiveGuardians: number
  multiStudentGuardians: number
  studentsWithoutGuardian: number
  studentsWithoutPrimary: number
  studentsWithMultiGuardians: number
}

export type StudentExplorerParams = {
  page: number
  pageSize: number
  search?: string
  quality?: 'all' | 'no_guardian' | 'multi_guardian' | 'no_primary'
}

export type GuardianExplorerParams = {
  page: number
  pageSize: number
  search?: string
  status?: 'active' | 'inactive' | 'all'
  multiStudent?: boolean
}

export async function getGuardianExplorerSummary(): Promise<ExplorerSummaryDTO> {
  const activeRels = and(eq(studentParents.isActive, true), isNull(studentParents.deletedAt))
  const activeStudents = and(eq(students.status, 'active'), isNull(students.deletedAt))

  const q1 = await db.select({ count: sql<number>`count(distinct ${studentParents.parentId})::int` })
    .from(studentParents)
    .where(activeRels)

  const sq2 = db.select({ parentId: studentParents.parentId })
    .from(studentParents)
    .where(activeRels)
    .groupBy(studentParents.parentId)
    .having(sql`count(distinct ${studentParents.studentId}) > 1`)
    .as('sq2')
  
  const q2 = await db.select({ count: sql<number>`count(*)::int` }).from(sq2)

  const studentStats = db.select({
    studentId: studentParents.studentId,
    guardianCount: sql<number>`count(distinct ${studentParents.parentId})::int`.as('guardian_count'),
    primaryCount: sql<number>`sum(case when ${studentParents.isPrimary} = true then 1 else 0 end)::int`.as('primary_count')
  })
  .from(studentParents)
  .where(activeRels)
  .groupBy(studentParents.studentId)
  .as('student_stats')

  const studentMetricsQuery = await db.select({
    withoutGuardian: sql<number>`sum(case when coalesce(${studentStats.guardianCount}, 0) = 0 then 1 else 0 end)::int`,
    withoutPrimary: sql<number>`sum(case when coalesce(${studentStats.guardianCount}, 0) > 0 and coalesce(${studentStats.primaryCount}, 0) = 0 then 1 else 0 end)::int`,
    multiGuardian: sql<number>`sum(case when coalesce(${studentStats.guardianCount}, 0) > 1 then 1 else 0 end)::int`
  })
  .from(students)
  .leftJoin(studentStats, eq(students.id, studentStats.studentId))
  .where(activeStudents)

  return {
    totalActiveGuardians: q1[0]?.count || 0,
    multiStudentGuardians: q2[0]?.count || 0,
    studentsWithoutGuardian: studentMetricsQuery[0]?.withoutGuardian || 0,
    studentsWithoutPrimary: studentMetricsQuery[0]?.withoutPrimary || 0,
    studentsWithMultiGuardians: studentMetricsQuery[0]?.multiGuardian || 0,
  }
}

export async function getStudentGuardianExplorer(params: StudentExplorerParams) {
  const { page, pageSize, search, quality } = params
  const limit = pageSize
  const offset = (page - 1) * pageSize

  const activeRels = and(eq(studentParents.isActive, true), isNull(studentParents.deletedAt))
  
  const studentStats = db.select({
    studentId: studentParents.studentId,
    activeGuardianCount: sql<number>`count(distinct ${studentParents.parentId})::int`.as('active_guardian_count'),
    hasPrimaryGuardian: sql<boolean>`bool_or(${studentParents.isPrimary})`.as('has_primary_guardian')
  })
  .from(studentParents)
  .where(activeRels)
  .groupBy(studentParents.studentId)
  .as('student_stats')

  const currentEnrollment = db.select({
    studentId: enrollments.studentId,
    className: sql<string>`${classes.name}`.as('class_name'),
    programName: sql<string>`${programs.name}`.as('program_name')
  })
  .from(enrollments)
  .innerJoin(classes, eq(classes.id, enrollments.classId))
  .innerJoin(programs, eq(programs.id, classes.programId))
  .innerJoin(academicYears, and(eq(academicYears.id, enrollments.academicYearId), eq(academicYears.isActive, true)))
  .where(eq(enrollments.status, 'active'))
  .as('current_enrollment')

  const baseWhere = and(eq(students.status, 'active'), isNull(students.deletedAt))
  
  const searchFilter = search ? ilike(students.fullName, `%${search}%`) : undefined
  
  let qualityFilter = undefined
  if (quality === 'no_guardian') {
    qualityFilter = sql`coalesce(${studentStats.activeGuardianCount}, 0) = 0`
  } else if (quality === 'multi_guardian') {
    qualityFilter = sql`coalesce(${studentStats.activeGuardianCount}, 0) > 1`
  } else if (quality === 'no_primary') {
    qualityFilter = sql`coalesce(${studentStats.activeGuardianCount}, 0) >= 1 AND coalesce(${studentStats.hasPrimaryGuardian}, false) = false`
  }

  const filters = and(baseWhere, searchFilter, qualityFilter)

  const countRes = await db.select({ count: sql<number>`count(*)::int` })
    .from(students)
    .leftJoin(studentStats, eq(students.id, studentStats.studentId))
    .where(filters)
  
  const totalItems = countRes[0]?.count || 0
  const totalPages = Math.ceil(totalItems / pageSize)

  const dataQuery = await db.select({
    studentId: students.id,
    studentName: students.fullName,
    className: sql<string>`coalesce(${currentEnrollment.className}, '-')`,
    programName: sql<string>`coalesce(${currentEnrollment.programName}, '-')`,
    activeGuardianCount: sql<number>`coalesce(${studentStats.activeGuardianCount}, 0)`,
    hasPrimaryGuardian: sql<boolean>`coalesce(${studentStats.hasPrimaryGuardian}, false)`
  })
  .from(students)
  .leftJoin(studentStats, eq(students.id, studentStats.studentId))
  .leftJoin(currentEnrollment, eq(students.id, currentEnrollment.studentId))
  .where(filters)
  .orderBy(asc(students.fullName), asc(students.id))
  .limit(limit)
  .offset(offset)

  const studentIds = dataQuery.map(d => d.studentId)
  
  let relationsDetails: any[] = []
  if (studentIds.length > 0) {
    relationsDetails = await db.select({
      id: studentParents.id,
      studentId: studentParents.studentId,
      guardianUserId: users.id,
      guardianName: users.fullName,
      relationship: studentParents.relationship,
      isPrimary: studentParents.isPrimary,
      canViewAcademic: studentParents.canViewAcademic,
      canViewFinance: studentParents.canViewFinance,
      isActive: studentParents.isActive
    })
    .from(studentParents)
    .innerJoin(users, eq(users.id, studentParents.parentId))
    .where(
      and(
        inArray(studentParents.studentId, studentIds),
        isNull(studentParents.deletedAt),
        eq(studentParents.isActive, true) 
      )
    )
    .orderBy(asc(users.fullName), asc(users.id))
  }

  const data = dataQuery.map(row => ({
    ...row,
    relations: relationsDetails.filter(r => r.studentId === row.studentId)
  }))

  return {
    data,
    meta: {
      totalItems,
      totalPages,
      page,
      pageSize
    }
  }
}

export async function getGuardianExplorer(params: GuardianExplorerParams) {
  const { page, pageSize, search, status, multiStudent } = params
  const limit = pageSize
  const offset = (page - 1) * pageSize

  const activeRels = and(eq(studentParents.isActive, true), isNull(studentParents.deletedAt))
  
  const guardianStats = db.select({
    guardianId: studentParents.parentId,
    activeStudentCount: sql<number>`count(distinct ${studentParents.studentId})::int`.as('active_student_count')
  })
  .from(studentParents)
  .where(activeRels)
  .groupBy(studentParents.parentId)
  .as('guardian_stats')
  
  let statusFilter = undefined
  if (status === 'active') {
    statusFilter = and(eq(studentParents.isActive, true), isNull(studentParents.deletedAt))
  } else if (status === 'inactive') {
    statusFilter = and(eq(studentParents.isActive, false), isNull(studentParents.deletedAt))
  } else {
    statusFilter = isNull(studentParents.deletedAt)
  }

  const matchingGuardians = db.select({
    guardianId: studentParents.parentId
  })
  .from(studentParents)
  .where(statusFilter)
  .groupBy(studentParents.parentId)
  .as('matching_guardians')

  const searchFilter = search ? or(
    ilike(users.fullName, `%${search}%`),
    ilike(users.email, `%${search}%`)
  ) : undefined

  let multiFilter = undefined
  if (multiStudent) {
    multiFilter = sql`coalesce(${guardianStats.activeStudentCount}, 0) > 1`
  }

  const filters = and(searchFilter, multiFilter)

  const countRes = await db.select({ count: sql<number>`count(*)::int` })
    .from(users)
    .innerJoin(matchingGuardians, eq(users.id, matchingGuardians.guardianId))
    .leftJoin(guardianStats, eq(users.id, guardianStats.guardianId))
    .where(filters)
  
  const totalItems = countRes[0]?.count || 0
  const totalPages = Math.ceil(totalItems / pageSize)

  const dataQuery = await db.select({
    guardianUserId: users.id,
    guardianName: users.fullName,
    guardianEmail: users.email,
    activeStudentCount: sql<number>`coalesce(${guardianStats.activeStudentCount}, 0)`
  })
  .from(users)
  .innerJoin(matchingGuardians, eq(users.id, matchingGuardians.guardianId))
  .leftJoin(guardianStats, eq(users.id, guardianStats.guardianId))
  .where(filters)
  .orderBy(asc(users.fullName), asc(users.id))
  .limit(limit)
  .offset(offset)

  const guardianIds = dataQuery.map(d => d.guardianUserId)
  
  let relationsDetails: any[] = []
  if (guardianIds.length > 0) {
    const currentEnrollment = db.select({
      studentId: enrollments.studentId,
      className: sql<string>`${classes.name}`.as('class_name'),
      programName: sql<string>`${programs.name}`.as('program_name')
    })
    .from(enrollments)
    .innerJoin(classes, eq(classes.id, enrollments.classId))
    .innerJoin(programs, eq(programs.id, classes.programId))
    .innerJoin(academicYears, and(eq(academicYears.id, enrollments.academicYearId), eq(academicYears.isActive, true)))
    .where(eq(enrollments.status, 'active'))
    .as('current_enrollment')

    relationsDetails = await db.select({
      id: studentParents.id,
      guardianUserId: studentParents.parentId,
      studentId: students.id,
      studentName: students.fullName,
      className: sql<string>`coalesce(${currentEnrollment.className}, '-')`,
      programName: sql<string>`coalesce(${currentEnrollment.programName}, '-')`,
      relationship: studentParents.relationship,
      isPrimary: studentParents.isPrimary,
      canViewAcademic: studentParents.canViewAcademic,
      canViewFinance: studentParents.canViewFinance,
      isActive: studentParents.isActive
    })
    .from(studentParents)
    .innerJoin(students, eq(students.id, studentParents.studentId))
    .leftJoin(currentEnrollment, eq(students.id, currentEnrollment.studentId))
    .where(
      and(
        inArray(studentParents.parentId, guardianIds),
        statusFilter 
      )
    )
    .orderBy(asc(students.fullName), asc(students.id))
  }

  const data = dataQuery.map(row => ({
    ...row,
    relations: relationsDetails.filter(r => r.guardianUserId === row.guardianUserId)
  }))

  return {
    data,
    meta: {
      totalItems,
      totalPages,
      page,
      pageSize
    }
  }
}
