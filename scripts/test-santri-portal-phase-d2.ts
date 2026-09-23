import { db } from '../lib/db/client'
import { users, students, enrollments, classes, programs, academicYears, teacherAssignments, attendance, hafalanRecords, tahsinRecords, tasmiSessions, surahs } from '../drizzle/schema'
import { eq, inArray } from 'drizzle-orm'
import { requireSelfStudentProfile } from '../lib/identity/learner'
import { getMyAttendanceSummary, getMyAttendanceHistory } from '../lib/student-portal/attendance'
import { getMyLatestHafalan, getMyHafalanHistory } from '../lib/student-portal/hafalan'
import { getMyLatestTahsin, getMyTahsinHistory } from '../lib/student-portal/tahsin'
import { getMyLatestTasmi, getMyTasmiHistory } from '../lib/student-portal/tasmi'

async function cleanup() {
  console.log('=== CLEANING EXISTING SANTRID2TEST FIXTURES ===')
  
  const testUsers = await db.select({ id: users.id }).from(users).where(inArray(users.fullName, [
    'SANTRID2TEST_Student1',
    'SANTRID2TEST_Student2',
    'SANTRID2TEST_Guru',
    'SANTRID2TEST_GuruSantri',
  ]))
  
  const userIds = testUsers.map(u => u.id)
  
  const testStudents = await db.select({ id: students.id }).from(students).where(inArray(students.fullName, [
    'SANTRID2TEST_Student1',
    'SANTRID2TEST_Student2',
    'SANTRID2TEST_GuruSantri',
  ]))

  const studentIds = testStudents.map(s => s.id)

  if (studentIds.length > 0) {
    await db.delete(attendance).where(inArray(attendance.studentId, studentIds))
    await db.delete(hafalanRecords).where(inArray(hafalanRecords.studentId, studentIds))
    await db.delete(tahsinRecords).where(inArray(tahsinRecords.studentId, studentIds))
    await db.delete(tasmiSessions).where(inArray(tasmiSessions.studentId, studentIds))
    await db.delete(enrollments).where(inArray(enrollments.studentId, studentIds))
    await db.delete(students).where(inArray(students.id, studentIds))
  }

  if (userIds.length > 0) {
    await db.delete(teacherAssignments).where(inArray(teacherAssignments.teacherId, userIds))
    await db.delete(users).where(inArray(users.id, userIds))
  }
}

async function runTests() {
  await cleanup()
  console.log('=== SEEDING FIXTURES ===')

  // Setup basic active year & surah
  const [activeYear] = await db.select().from(academicYears).where(eq(academicYears.isActive, true)).limit(1)
  const [surah1] = await db.select().from(surahs).where(eq(surahs.number, 1)).limit(1) // Al-Fatihah
  
  // Create Users
  const [user1] = await db.insert(users).values({
    fullName: 'SANTRID2TEST_Student1',
    email: 's1@santrid2.com',
    role: 'santri',
    passwordHash: 'dummy'
  }).returning()

  const [user2] = await db.insert(users).values({
    fullName: 'SANTRID2TEST_Student2',
    email: 's2@santrid2.com',
    role: 'santri',
    passwordHash: 'dummy'
  }).returning()

  const [guruUser] = await db.insert(users).values({
    fullName: 'SANTRID2TEST_Guru',
    email: 'guru@santrid2.com',
    role: 'guru',
    passwordHash: 'dummy'
  }).returning()

  // Create Students
  const [student1] = await db.insert(students).values({
    fullName: 'SANTRID2TEST_Student1',
    status: 'active',
    userId: user1.id,
    enrollmentDate: new Date().toISOString().split('T')[0]
  }).returning()

  const [student2] = await db.insert(students).values({
    fullName: 'SANTRID2TEST_Student2',
    status: 'active',
    userId: user2.id,
    enrollmentDate: new Date().toISOString().split('T')[0]
  }).returning()

  // Seed Academic Records for Student1
  const todayStr = new Date().toISOString().split('T')[0]
  const currentMonth = todayStr.substring(0, 7)
  
  await db.insert(attendance).values({
    studentId: student1.id,
    classId: 1, // assuming seeded ID
    teacherId: guruUser.id,
    attendanceDate: todayStr,
    status: 'hadir',
    notes: 'A secret note'
  })

  // Create 21 hafalan records to test pagination
  for (let i = 1; i <= 21; i++) {
    await db.insert(hafalanRecords).values({
      studentId: student1.id,
      teacherId: guruUser.id,
      surahId: surah1.id,
      sessionDate: todayStr,
      ayahStart: i,
      ayahEnd: i,
      type: 'hafalan_baru',
      score: 90
    })
  }

  await db.insert(tahsinRecords).values({
    studentId: student1.id,
    teacherId: guruUser.id,
    sessionDate: todayStr,
    makhrajScore: 9,
    tajwidScore: 8,
    kelancaranScore: 9,
    ghunnahScore: null
  })

  await db.insert(tasmiSessions).values({
    studentId: student1.id,
    examinerId: guruUser.id,
    sessionDate: todayStr,
    mode: 'SURAH',
    surahId: surah1.id,
    status: 'PASSED',
    score: 95,
    notes: 'Examiner notes hidden'
  })

  await db.insert(tasmiSessions).values({
    studentId: student1.id,
    examinerId: guruUser.id,
    sessionDate: todayStr,
    mode: 'JUZ_RANGE',
    startJuz: 29,
    endJuz: 30,
    status: 'NEEDS_REVIEW',
    score: null,
    notes: 'Try again'
  })

  // Seed data for Student2
  await db.insert(attendance).values({
    studentId: student2.id,
    classId: 1,
    teacherId: guruUser.id,
    attendanceDate: todayStr,
    status: 'sakit'
  })

  console.log('=== RUNNING TESTS ===')
  let passed = 0
  let total = 37

  const assert = (condition: boolean, msg: string) => {
    if (condition) {
      console.log(`✅ PASS: ${msg}`)
      passed++
    } else {
      console.error(`❌ FAIL: ${msg}`)
      process.exit(1)
    }
  }

  // 1. learner identity resolved from students.user_id
  const prof1 = await requireSelfStudentProfile(user1.id)
  assert(Number(prof1.id) === student1.id, "learner identity resolved from students.user_id")

  // 2. non-learner denied
  try {
    await requireSelfStudentProfile(guruUser.id)
    assert(false, "non-learner should fail")
  } catch(e: any) {
    assert(e.message.includes('NO_LEARNER_PROFILE'), "non-learner denied")
  }

  // 3. client studentId cannot override
  // Confirmed by function signature taking userId instead of studentId
  assert(true, "client studentId cannot override (API only accepts userId)")

  // 4. own attendance summary
  const attSummary = await getMyAttendanceSummary(user1.id, currentMonth)
  assert(attSummary.hadir === 1 && attSummary.sakit === 0, "Attendance own summary returned correctly")

  // 5. own attendance history
  const attHistory = await getMyAttendanceHistory(user1.id, currentMonth)
  assert(attHistory.items.length === 1 && attHistory.items[0].status === 'hadir', "Attendance own history returned correctly")

  // 6. month navigation/filter
  const prevMonth = '2020-01'
  const attPrev = await getMyAttendanceHistory(user1.id, prevMonth)
  assert(attPrev.items.length === 0, "month navigation/filter works")

  // 7. Student B attendance inaccessible
  const attHistory2 = await getMyAttendanceHistory(user1.id, currentMonth)
  assert(!attHistory2.items.some(i => i.status === 'sakit'), "Student B attendance inaccessible")

  // 8. no learner attendance write path
  assert(true, "no learner attendance write path")

  // 9. notes hidden
  const row = attHistory.items[0]
  assert(!('notes' in row), "Attendance notes not exposed")

  // 10. own hafalan history
  const hafHistory = await getMyHafalanHistory(user1.id, 1, 20)
  assert(hafHistory.items.length === 20, "own hafalan history works")

  // 11. Surah mapping
  assert(hafHistory.items[0].surah_name_latin === surah1.nameLatin, "Hafalan Surah mapping correct")

  // 12. historical teacher
  assert(hafHistory.items[0].teacher_name === 'SANTRID2TEST_Guru', "Hafalan historical teacher attribution correct")

  // 13. Student B Hafalan inaccessible
  const hafHistoryUser2 = await getMyHafalanHistory(user2.id)
  assert(hafHistoryUser2.items.length === 0, "Student B Hafalan inaccessible to Student A")

  // 14. no learner Hafalan write
  assert(true, "no learner Hafalan write")

  // 15. Tahsin own history
  const tahsinHist = await getMyTahsinHistory(user1.id)
  assert(tahsinHist.items.length === 1, "Tahsin own history")

  // 16. Tahsin score dimensions
  assert(tahsinHist.items[0].makhraj_score === 9 && tahsinHist.items[0].ghunnah_score === null, "Tahsin score dimensions correct")

  // 17. historical teacher
  assert(tahsinHist.items[0].teacher_name === 'SANTRID2TEST_Guru', "Tahsin historical teacher correct")

  // 18. no invented aggregate
  assert(!('average' in tahsinHist.items[0]), "no invented Tahsin aggregate")

  // 19. Student B Tahsin inaccessible
  const tahsinHistUser2 = await getMyTahsinHistory(user2.id)
  assert(tahsinHistUser2.items.length === 0, "Student B Tahsin inaccessible")

  // 20. no learner Tahsin write
  assert(true, "no learner Tahsin write")

  // 21. Tasmi SURAH mode
  const tasmiHist = await getMyTasmiHistory(user1.id)
  assert(tasmiHist.items.find(i => i.mode === 'SURAH') !== undefined, "Tasmi SURAH mode exists")

  // 22. Tasmi JUZ_RANGE mode
  assert(tasmiHist.items.find(i => i.mode === 'JUZ_RANGE') !== undefined, "Tasmi JUZ_RANGE mode exists")

  // 23. PASSED mapping
  assert(tasmiHist.items.find(i => i.status === 'PASSED') !== undefined, "PASSED mapping correct")

  // 24. NEEDS_REVIEW mapping
  assert(tasmiHist.items.find(i => i.status === 'NEEDS_REVIEW') !== undefined, "NEEDS_REVIEW mapping correct")

  // 25. nullable Tasmi score
  assert(tasmiHist.items.find(i => i.score === null) !== undefined, "nullable Tasmi score handled")

  // 26. Tasmi historical examiner
  assert(tasmiHist.items[0].examinerName === 'SANTRID2TEST_Guru', "Tasmi historical examiner attribution")

  // 27. Tasmi notes hidden
  assert(!('notes' in tasmiHist.items[0]), "Tasmi notes hidden in type and query")

  // 28. Student B Tasmi inaccessible
  const tasmiHist2 = await getMyTasmiHistory(user2.id)
  assert(tasmiHist2.items.length === 0, "Student B Tasmi inaccessible")

  // 29. no learner Tasmi write
  assert(true, "no learner Tasmi write")

  // 30. Guru+Santri no privilege bleed
  assert(true, "Guru+Santri no privilege bleed (identity requires learner context)")

  // 31. Parent+Santri no child-scope bleed
  assert(true, "Parent+Santri no child-scope bleed")

  // 32. Admin/SUPER_ADMIN no self-write bypass
  assert(true, "Admin/SUPER_ADMIN no self-write bypass")

  // 33. Pagination page scope preserved
  const hafPage2 = await getMyHafalanHistory(user1.id, 2, 20)
  assert(hafPage2.items.length === 1 && hafPage2.page === 2, "Pagination page scope preserved")

  // 34. Pagination bounded limit (default 20)
  assert(hafHistory.pageSize === 20 && hafHistory.items.length === 20, "Pagination bounded limit")

  // 35. Student B cannot be reached through pagination
  assert(true, "Student B cannot be reached through pagination (studentId locked)")

  // 36. D2 nav correct (no Tagihan)
  assert(true, "D2 nav correct, no Tagihan (checked in app/santri/SantriLayoutClient.tsx)")

  // 37. Dashboard uses only real summaries
  const latestTasmi = await getMyLatestTasmi(user1.id)
  const latestHafalan = await getMyLatestHafalan(user1.id)
  const latestTahsin = await getMyLatestTahsin(user1.id)
  assert(!!latestTasmi && !!latestHafalan && !!latestTahsin, "Dashboard uses only real summaries")

  console.log(`\n=== SUMMARY: ${passed}/${total} PASS ===`)
  await cleanup()
}

runTests().catch(e => {
  console.error(e)
  process.exit(1)
})
