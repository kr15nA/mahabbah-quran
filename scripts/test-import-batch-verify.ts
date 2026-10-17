import assert from 'assert'
import * as xlsx from 'xlsx'
import { db } from '../lib/db/client'
import { classes, programs, academicYears, students, users, enrollments } from '../drizzle/schema'
import { eq, inArray } from 'drizzle-orm'
import { parseAndValidateImport, executeImport } from '../lib/import-export'
import { assertSafeMutatingDbTestEnvironment } from './lib/assert-safe-mutating-db-test'

function createExcelBuffer(sheetName: string, rows: Record<string, any>[]): Buffer {
  const wb = xlsx.utils.book_new()
  const ws = xlsx.utils.json_to_sheet(rows)
  xlsx.utils.book_append_sheet(wb, ws, sheetName)
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

async function runBatchImportVerification() {
  assertSafeMutatingDbTestEnvironment()
  console.log('=== STABILIZATION-SPRINT-01: IMPORT-BATCH-VERIFY-001 ===\n')

  const testId = Date.now().toString().slice(-6)
  const createdUserIds: number[] = []
  const createdStudentIds: number[] = []
  let createdClassId: number | undefined
  let createdProgramId: number | undefined

  try {
    // 0. Setup Fixtures: Active Academic Year, Program, Class
    const [activeYear] = await db
      .select({ id: academicYears.id })
      .from(academicYears)
      .where(eq(academicYears.isActive, true))
      .limit(1)

    assert.ok(activeYear, 'Active academic year is required for import testing')

    const [testProgram] = await db
      .insert(programs)
      .values({
        name: `Program Batch Test ${testId}`,
        description: 'Temporary program for batch verification',
      })
      .returning({ id: programs.id })

    createdProgramId = testProgram.id

    const [testClass] = await db
      .insert(classes)
      .values({
        name: `Class Batch Test ${testId}`,
        programId: testProgram.id,
        level: 'Takhassus',
      })
      .returning({ id: classes.id })

    createdClassId = testClass.id
    console.log(`[SETUP] Created test class id=${testClass.id} under active academic year id=${activeYear.id}`)

    // =========================================================================
    // 1. 100+ ROW BATCH VALIDATION & SPECIAL CHARACTER RESILIENCE
    // =========================================================================
    console.log('\n--- 1. 100+ ROW BATCH VALIDATION & SPECIAL CHARACTERS ---')

    const initialMem = process.memoryUsage().heapUsed
    const startTime = Date.now()

    const specialNames = [
      "Abdullah Syafi'i",
      "Ma'ruf Amin Al-Bantani",
      "Nurul Huda (Pusat)",
      "Khadijah binti 'Ali",
      "Siti Fatimah-Zahra",
      "Muhammad ʿUmar",
      "Ahmad Dahlan, M.Pd.",
      "Zainal 'Abidin & Partners",
      "Thariq bin Ziyad (Hafiz)",
      "Abu Bakr Ash-Shiddiq",
    ]

    const batchSize = 105
    const santriRows: Record<string, any>[] = []

    for (let i = 1; i <= batchSize; i++) {
      const specialNamePattern = specialNames[(i - 1) % specialNames.length]
      santriRows.push({
        full_name: `  ${specialNamePattern} ${testId} #${i}  `, // Include leading and trailing whitespace to test trimming
        nickname: `Nick-${i}`,
        gender: i % 2 === 0 ? 'L' : 'P',
        date_of_birth: '2012-05-15',
        enrollment_date: '2026-07-01',
        class_id: testClass.id,
      })
    }

    const xlsxBuffer = createExcelBuffer('Santri', santriRows)
    const validationResult = await parseAndValidateImport(xlsxBuffer, 'santri')

    const durationMs = Date.now() - startTime
    const finalMem = process.memoryUsage().heapUsed
    const memDeltaMb = ((finalMem - initialMem) / (1024 * 1024)).toFixed(2)

    assert.strictEqual(validationResult.isValid, true, '105-row santri batch must be completely valid')
    assert.strictEqual(validationResult.totalRows, 105, 'Total rows parsed must equal 105')
    assert.strictEqual(validationResult.data.length, 105, 'Valid rows must equal 105')
    assert.strictEqual(validationResult.errors.length, 0, 'There must be 0 validation errors')

    // Verify whitespace trimming on special character names
    assert.ok(
      !validationResult.data[0].full_name.startsWith(' ') && !validationResult.data[0].full_name.endsWith(' '),
      'Leading and trailing whitespace must be safely trimmed'
    )
    assert.ok(
      validationResult.data[0].full_name.includes("Syafi'i"),
      'Single quotes and special punctuation in names must be preserved'
    )

    console.log(`✅ 1.1 Successfully validated 105-row batch with special characters in ${durationMs}ms (Heap Delta: ${memDeltaMb} MB)`)

    // =========================================================================
    // 2. 100+ ROW EXECUTION & ATOMIC COMMIT
    // =========================================================================
    console.log('\n--- 2. 100+ ROW EXECUTION & DATABASE COMMIT ---')

    const execStartTime = Date.now()
    const execResult = await executeImport('santri', validationResult.data)
    const execDurationMs = Date.now() - execStartTime

    assert.strictEqual(execResult.count, 105, 'executeImport must commit 105 records')

    // Query committed students and enrollments to verify integrity
    const committedStudents = await db
      .select({ id: students.id, fullName: students.fullName })
      .from(students)
      .where(eq(students.dateOfBirth, '2012-05-15'))

    const committedIds = committedStudents.map(s => s.id)
    committedIds.forEach(id => createdStudentIds.push(id))

    assert.ok(committedIds.length >= 105, 'At least 105 students committed to database')

    const committedEnrollments = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(eq(enrollments.classId, testClass.id))

    assert.ok(committedEnrollments.length >= 105, 'At least 105 enrollment records committed with active year and class')
    console.log(`✅ 2.1 Successfully executed and committed 105 rows atomically in ${execDurationMs}ms`)

    // =========================================================================
    // 3. DUPLICATE & INVALID ROWS WITHIN SPREADSHEET
    // =========================================================================
    console.log('\n--- 3. DUPLICATE & INVALID ROWS WITHIN SPREADSHEET ---')

    const mixedBatch = [
      {
        full_name: 'Valid Guru A',
        email: `valid_guru_a_${testId}@test.mahabbah.id`,
        phone: '081211110001',
      },
      {
        full_name: '', // INVALID: missing full_name
        email: `invalid_guru_b_${testId}@test.mahabbah.id`,
        phone: '081211110002',
      },
      {
        full_name: 'Duplicate Email Guru',
        email: `valid_guru_a_${testId}@test.mahabbah.id`, // DUPLICATE IN BATCH!
        phone: '081211110003',
      },
      {
        full_name: 'Duplicate Phone Guru',
        email: `guru_d_${testId}@test.mahabbah.id`,
        phone: '081211110001', // DUPLICATE PHONE IN BATCH!
      },
      {
        full_name: 'No Email Or Phone Guru',
        email: '',
        phone: '', // INVALID: neither email nor phone
      },
    ]

    const mixedBuffer = createExcelBuffer('Guru', mixedBatch)
    const mixedResult = await parseAndValidateImport(mixedBuffer, 'guru')

    assert.strictEqual(mixedResult.isValid, false, 'Batch with duplicates and missing fields must be invalid')
    assert.strictEqual(mixedResult.data.length, 1, 'Only 1 row should be valid')
    assert.strictEqual(mixedResult.errors.length, 4, 'Exactly 4 errors must be reported')

    // Check specific error messages and 1-indexed row numbers (headers are row 1)
    const emptyNameError = mixedResult.errors.find(e => e.row === 3 && e.field === 'full_name')
    assert.ok(emptyNameError, 'Empty full_name error at row 3 must be captured')

    const dupEmailError = mixedResult.errors.find(e => e.row === 4 && e.field === 'email')
    assert.ok(dupEmailError && dupEmailError.error.includes('duplikat'), 'Within-batch duplicate email error at row 4 must be captured')

    const dupPhoneError = mixedResult.errors.find(e => e.row === 5 && e.field === 'phone')
    assert.ok(dupPhoneError && dupPhoneError.error.includes('duplikat'), 'Within-batch duplicate phone error at row 5 must be captured')

    const noContactError = mixedResult.errors.find(e => e.row === 6 && e.field === 'email/phone')
    assert.ok(noContactError, 'Missing contact error at row 6 must be captured')

    console.log('✅ 3.1 All invalid and within-batch duplicate rows accurately caught with 1-indexed row numbers')

    // =========================================================================
    // 4. MAXIMUM ROW LIMIT SAFE ENFORCEMENT (5000 ROWS)
    // =========================================================================
    console.log('\n--- 4. EXPLICIT MAXIMUM ROW LIMIT ENFORCEMENT ---')

    const oversizedRows: Record<string, any>[] = []
    for (let i = 1; i <= 5001; i++) {
      oversizedRows.push({
        full_name: `Santri ${i}`,
        enrollment_date: '2026-01-01',
        class_id: testClass.id,
      })
    }

    const oversizedBuffer = createExcelBuffer('Oversized', oversizedRows)
    let limitExceeded = false
    try {
      await parseAndValidateImport(oversizedBuffer, 'santri')
    } catch (err: any) {
      if (err.message.includes('5000 baris')) {
        limitExceeded = true
      }
    }

    assert.strictEqual(limitExceeded, true, 'File with >5000 rows must be rejected with safe maximum error')
    console.log('✅ 4.1 Safe explicit maximum row limit (5000 rows) correctly enforced')

    console.log('\n🎉 ALL IMPORT-BATCH-VERIFY-001 TESTS PASSED SUCCESSFULLY!')
  } finally {
    // Deterministic Cleanup
    console.log('\n[CLEANUP] Cleaning up test fixtures...')
    if (createdClassId) {
      await db.delete(enrollments).where(eq(enrollments.classId, createdClassId))
      await db.delete(classes).where(eq(classes.id, createdClassId))
    }
    if (createdProgramId) {
      await db.delete(programs).where(eq(programs.id, createdProgramId))
    }
    if (createdStudentIds.length > 0) {
      await db.delete(students).where(inArray(students.id, createdStudentIds))
      console.log(`[CLEANUP] Deleted ${createdStudentIds.length} test students.`)
    }
    if (createdUserIds.length > 0) {
      await db.delete(users).where(inArray(users.id, createdUserIds))
      console.log(`[CLEANUP] Deleted ${createdUserIds.length} test users.`)
    }
  }
}

runBatchImportVerification().catch((err) => {
  console.error('\n❌ IMPORT-BATCH-VERIFY-001 TEST SUITE FAILED:', err)
  process.exit(1)
})
