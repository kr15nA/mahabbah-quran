import assert from 'assert'
import { resolveParentChildContext, studentIdToDbNumber } from '../lib/guardians/parent-context'
import { getAcademicYears } from '../lib/db/queries/academic-years'
import { getLearningReportsByStudent } from '../lib/db/queries/learning-reports'
import { getAttendanceSummaryByStudent, getAttendanceByStudentMonth } from '../lib/db/queries/attendance'
import { sql } from '../lib/db/client'

async function run() {
  console.log('--- STARTING PARENT-HIST-001 VERIFICATION ---')

  // 1. Get an existing parent with linked children
  const parentRows = await sql`
    SELECT sp.parent_id, sp.student_id, u.full_name as parent_name, s.full_name as student_name
    FROM student_parents sp
    JOIN users u ON u.id = sp.parent_id
    JOIN students s ON s.id = sp.student_id
    WHERE sp.is_active = TRUE AND sp.can_view_academic = TRUE AND sp.deleted_at IS NULL
    LIMIT 1
  `

  assert(parentRows.length > 0, 'Must have at least one active parent-student link')
  const parentId = Number(parentRows[0].parent_id)
  const childId = String(parentRows[0].student_id)
  console.log(`Testing with Parent ${parentId} (${parentRows[0].parent_name}), Child ${childId} (${parentRows[0].student_name})`)

  // 2. Test Academic Years retrieval
  const years = await getAcademicYears()
  assert(years.length > 0, 'Academic years list must not be empty')
  console.log(`Found ${years.length} academic years:`, years.map(y => `${y.name} (id:${y.id}, active:${y.isActive})`).join(', '))

  // 3. Test Authorized access with active academic year
  const activeYear = years.find(y => y.isActive) || years[0]
  const authRes = await resolveParentChildContext({
    userId: parentId,
    requestedChildId: childId,
    academicYearId: activeYear.id,
  })
  assert.strictEqual(authRes.status, 'AUTHORIZED', 'Should authorize linked child with active year')
  if (authRes.status === 'AUTHORIZED') {
    assert.strictEqual(authRes.childId, childId, 'Resolved childId should match requested child')
  }
  console.log('PASS: Authorized access with active academic year')

  // 4. Test Authorized access with historical/inactive academic year (if exists)
  const historicalYear = years.find(y => !y.isActive)
  if (historicalYear) {
    const histRes = await resolveParentChildContext({
      userId: parentId,
      requestedChildId: childId,
      academicYearId: historicalYear.id,
    })
    assert.strictEqual(histRes.status, 'AUTHORIZED', 'Should authorize linked child with historical year')
    console.log(`PASS: Authorized access with historical academic year ${historicalYear.name}`)
  }

  // 5. Test IDOR prevention: Non-linked child MUST return FORBIDDEN_CHILD
  const unlinkedChildRes = await sql`
    SELECT id FROM students WHERE id != ${Number(childId)} AND deleted_at IS NULL LIMIT 1
  `
  if (unlinkedChildRes.length > 0) {
    const forbiddenStudentId = String(unlinkedChildRes[0].id)
    const forbiddenRes = await resolveParentChildContext({
      userId: parentId,
      requestedChildId: forbiddenStudentId,
      academicYearId: activeYear.id,
    })
    assert.strictEqual(forbiddenRes.status, 'FORBIDDEN_CHILD', 'Non-linked student must be rejected with FORBIDDEN_CHILD')
    console.log(`PASS: IDOR attack blocked for unlinked student ${forbiddenStudentId} -> FORBIDDEN_CHILD`)
  }

  // 6. Test Query filtering by date range
  const dbStudentId = studentIdToDbNumber(childId)
  const reports = await getLearningReportsByStudent(dbStudentId, 10, {
    startDate: activeYear.startDate,
    endDate: activeYear.endDate,
  })
  assert(Array.isArray(reports), 'getLearningReportsByStudent should return an array')
  console.log(`PASS: getLearningReportsByStudent with year date bounds returned ${reports.length} records`)

  const summary = await getAttendanceSummaryByStudent(dbStudentId, {
    startDate: activeYear.startDate,
    endDate: activeYear.endDate,
  })
  assert(typeof summary.hadir === 'number', 'Summary should include numeric counts')
  console.log('PASS: getAttendanceSummaryByStudent with year bounds:', summary)

  const attendance = await getAttendanceByStudentMonth(dbStudentId, {
    startDate: activeYear.startDate,
    endDate: activeYear.endDate,
  })
  assert(Array.isArray(attendance), 'getAttendanceByStudentMonth should return an array')
  console.log(`PASS: getAttendanceByStudentMonth with year bounds returned ${attendance.length} records`)

  console.log('--- ALL PARENT-HIST-001 TESTS PASSED ---')
}

run().catch((e) => {
  console.error('Test failed:', e)
  process.exit(1)
})
