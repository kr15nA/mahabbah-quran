import assert from 'assert'
import { NextRequest } from 'next/server'
import { SignJWT } from 'jose'
import { db } from '../lib/db/client'
import {
  users,
  students,
  studentParents,
  academicYears,
} from '../drizzle/schema'
import { eq, inArray } from 'drizzle-orm'
import { executeImport } from '../lib/import-export'
import { middleware } from '../middleware'
import { GET as parentPaymentGet } from '../app/api/orang-tua/pembayaran/route'
import { GET as cronGet } from '../app/api/cron/recurring-billing/route'
import { getJwtSecretKey } from '../lib/auth/session'
import { assertSafeMutatingDbTestEnvironment } from './lib/assert-safe-mutating-db-test'

async function generateToken(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(getJwtSecretKey())
}

async function runHardeningTests() {
  assertSafeMutatingDbTestEnvironment()
  console.log('=== COVERAGE-SPRINT-04 HARDENING VERIFICATION SUITE ===\n')

  const testId = Date.now().toString().slice(-6)
  const createdUserIds: number[] = []
  const createdStudentIds: number[] = []
  const originalCronSecret = process.env.CRON_SECRET

  try {
    // =========================================================================
    // 1. CRON MIDDLEWARE BOUNDARY HARDENING
    // =========================================================================
    console.log('--- 1. CRON MIDDLEWARE BOUNDARY HARDENING ---')

    // 1.1 Allowlisted recurring billing cron route bypasses middleware without JWT
    const recurringCronReq = new NextRequest('http://localhost:3000/api/cron/recurring-billing')
    const recurringCronRes = await middleware(recurringCronReq)
    assert.strictEqual(
      recurringCronRes.status,
      200,
      'Allowlisted /api/cron/recurring-billing must bypass middleware without JWT session'
    )
    console.log('✅ 1.1 Allowlisted /api/cron/recurring-billing reaches route-level authentication without JWT session')

    // 1.2 Unlisted / arbitrary cron route does NOT bypass middleware (returns 401 Unauthorized)
    const unlistedCronReq = new NextRequest('http://localhost:3000/api/cron/unlisted-maintenance-job')
    const unlistedCronRes = await middleware(unlistedCronReq)
    assert.strictEqual(
      unlistedCronRes.status,
      401,
      'Unlisted /api/cron/* route must NOT bypass middleware; must return 401 when unauthenticated'
    )
    const unlistedJson = await unlistedCronRes.json()
    assert.strictEqual(unlistedJson.error, 'Unauthorized')
    console.log('✅ 1.2 Arbitrary /api/cron/unlisted-maintenance-job is strictly blocked with 401 by middleware')

    // 1.3 Health endpoint continues to bypass middleware without JWT
    const healthReq = new NextRequest('http://localhost:3000/api/health')
    const healthRes = await middleware(healthReq)
    assert.strictEqual(
      healthRes.status,
      200,
      '/api/health must continue to bypass middleware for unauthenticated probes'
    )
    console.log('✅ 1.3 Public health check /api/health continues to bypass middleware')

    // 1.4 Route-level CRON authentication remains strictly enforced on recurring billing
    process.env.CRON_SECRET = 'sprint04-hardening-cron-secret-32ch!'
    const noAuthCronReq = new NextRequest('http://localhost:3000/api/cron/recurring-billing')
    const noAuthCronRes = await cronGet(noAuthCronReq)
    assert.strictEqual(noAuthCronRes.status, 401, 'Recurring billing route must require Bearer CRON_SECRET')

    const authCronReq = new NextRequest('http://localhost:3000/api/cron/recurring-billing?period=1999-01', {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    })
    const authCronRes = await cronGet(authCronReq)
    assert.notStrictEqual(authCronRes.status, 401, 'Valid Bearer token must pass route authentication')
    assert.notStrictEqual(authCronRes.status, 500, 'Configured CRON_SECRET must not return 500')
    console.log('✅ 1.4 Route-level Bearer CRON_SECRET authentication remains fully authoritative')

    // =========================================================================
    // 2. PARENT PAYMENT ROLE BEHAVIOR (CASE A)
    // =========================================================================
    console.log('\n--- 2. PARENT PAYMENT ROLE BEHAVIOR (CASE A) ---')

    // 2.1 Anonymous request (no session) returns 401
    const anonReq = new NextRequest('http://localhost:3000/api/orang-tua/pembayaran')
    const anonRes = await parentPaymentGet(anonReq)
    assert.strictEqual(anonRes.status, 401, 'Anonymous request must return 401')
    console.log('✅ 2.1 Anonymous request returns 401 Unauthorized')

    // 2.2 SUPER_ADMIN / admin role returns explicit 403 pointing to /api/finance/payments
    const [adminUser] = await db
      .insert(users)
      .values({
        fullName: `Admin Hardening ${testId}`,
        email: `admin_hard_${testId}@test.mahabbah.id`,
        passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
        role: 'admin',
      })
      .returning()
    createdUserIds.push(adminUser.id)

    const adminToken = await generateToken({
      userId: adminUser.id,
      role: 'admin',
      fullName: adminUser.fullName,
      email: adminUser.email,
    })

    const adminReq = new NextRequest('http://localhost:3000/api/orang-tua/pembayaran', {
      headers: { cookie: `mq_session=${adminToken}` },
    })
    const adminRes = await parentPaymentGet(adminReq)
    assert.strictEqual(adminRes.status, 403, 'Admin caller must receive explicit 403 on parent payment route')
    const adminJson = await adminRes.json()
    assert.strictEqual(adminJson.code, 'PARENT_CONTEXT_REQUIRED')
    assert.ok(
      adminJson.error.includes('/api/finance/payments'),
      'Admin 403 error must guide caller to /api/finance/payments'
    )
    console.log('✅ 2.2 Admin role returns explicit 403 (PARENT_CONTEXT_REQUIRED) directing to /api/finance/payments')

    // 2.3 Guru / other non-parent role returns 403 FORBIDDEN_ROLE
    const [guruUser] = await db
      .insert(users)
      .values({
        fullName: `Guru Hardening ${testId}`,
        email: `guru_hard_${testId}@test.mahabbah.id`,
        passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
        role: 'guru',
      })
      .returning()
    createdUserIds.push(guruUser.id)

    const guruToken = await generateToken({
      userId: guruUser.id,
      role: 'guru',
      fullName: guruUser.fullName,
      email: guruUser.email,
    })

    const guruReq = new NextRequest('http://localhost:3000/api/orang-tua/pembayaran', {
      headers: { cookie: `mq_session=${guruToken}` },
    })
    const guruRes = await parentPaymentGet(guruReq)
    assert.strictEqual(guruRes.status, 403, 'Guru caller must receive 403 FORBIDDEN_ROLE')
    const guruJson = await guruRes.json()
    assert.strictEqual(guruJson.code, 'FORBIDDEN_ROLE')
    console.log('✅ 2.3 Non-parent role (guru) returns 403 FORBIDDEN_ROLE')

    // 2.4 Legitimate parent with no linked children returns { data: [] }
    const [parentUser] = await db
      .insert(users)
      .values({
        fullName: `Parent Hardening ${testId}`,
        email: `parent_hard_${testId}@test.mahabbah.id`,
        passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
        role: 'orang_tua',
      })
      .returning()
    createdUserIds.push(parentUser.id)

    const parentToken = await generateToken({
      userId: parentUser.id,
      role: 'orang_tua',
      fullName: parentUser.fullName,
      email: parentUser.email,
    })

    const parentNoChildReq = new NextRequest('http://localhost:3000/api/orang-tua/pembayaran', {
      headers: { cookie: `mq_session=${parentToken}` },
    })
    const parentNoChildRes = await parentPaymentGet(parentNoChildReq)
    assert.strictEqual(parentNoChildRes.status, 200, 'Legitimate parent with no linked children receives 200')
    const parentNoChildJson = await parentNoChildRes.json()
    assert.deepStrictEqual(parentNoChildJson.data, [], 'Data array must be empty')
    console.log('✅ 2.4 Parent with no linked children cleanly receives 200 with { data: [] }')

    // 2.5 Link a student to parent and test authorized vs unauthorized child access
    const [studentA] = await db
      .insert(students)
      .values({
        fullName: `Santri Linked ${testId}`,
        gender: 'L',
        dateOfBirth: '2012-01-01',
        enrollmentDate: '2026-01-01',
        status: 'active',
      })
      .returning()
    createdStudentIds.push(studentA.id)

    const [studentB] = await db
      .insert(students)
      .values({
        fullName: `Santri Other ${testId}`,
        gender: 'P',
        dateOfBirth: '2013-02-02',
        enrollmentDate: '2026-01-01',
        status: 'active',
      })
      .returning()
    createdStudentIds.push(studentB.id)

    await db.insert(studentParents).values({
      parentId: parentUser.id,
      studentId: studentA.id,
      relationship: 'ayah',
      isActive: true,
      canViewFinance: true,
    })

    // Request unauthorized child_id -> 403
    const unauthChildReq = new NextRequest(
      `http://localhost:3000/api/orang-tua/pembayaran?child_id=${studentB.id}`,
      { headers: { cookie: `mq_session=${parentToken}` } }
    )
    const unauthChildRes = await parentPaymentGet(unauthChildReq)
    assert.strictEqual(unauthChildRes.status, 403, 'Requesting unauthorized child must return 403')
    console.log('✅ 2.5 Requesting unauthorized child_id strictly blocked with 403')

    // Request authorized child_id -> 200 with array
    const authChildReq = new NextRequest(
      `http://localhost:3000/api/orang-tua/pembayaran?child_id=${studentA.id}`,
      { headers: { cookie: `mq_session=${parentToken}` } }
    )
    const authChildRes = await parentPaymentGet(authChildReq)
    assert.strictEqual(authChildRes.status, 200, 'Requesting authorized child must return 200')
    const authChildJson = await authChildRes.json()
    assert.ok(Array.isArray(authChildJson.data), 'Response data must be array')
    console.log('✅ 2.6 Requesting authorized child_id returns 200 with payments array')

    // =========================================================================
    // 3. IMPORT TRANSACTION ATOMICITY & ROLLBACK INTEGRITY
    // =========================================================================
    console.log('\n--- 3. IMPORT TRANSACTION ATOMICITY & ROLLBACK INTEGRITY ---')

    // 3.1 Successful multi-row import commits all rows and returns credentials
    const successRows = [
      {
        full_name: `Guru Atomic A ${testId}`,
        email: `guru_atom_a_${testId}@test.mahabbah.id`,
        phone: '081299911111',
      },
      {
        full_name: `Guru Atomic B ${testId}`,
        email: `guru_atom_b_${testId}@test.mahabbah.id`,
        phone: '081299922222',
      },
    ]

    const successImport = await executeImport('guru', successRows)
    assert.strictEqual(successImport.count, 2, 'Import count must be 2')
    assert.strictEqual(successImport.credentials?.length, 2, 'Credentials must be returned on commit')

    const dbCommittedUsers = await db
      .select()
      .from(users)
      .where(inArray(users.email, [successRows[0].email, successRows[1].email]))

    assert.strictEqual(dbCommittedUsers.length, 2, 'Both users must be committed')
    for (const u of dbCommittedUsers) {
      createdUserIds.push(u.id)
      assert.strictEqual(u.mustChangePassword, true, 'Imported user must have mustChangePassword = true')
      assert.ok(u.passwordHash.startsWith('$2'), 'Password must be bcrypt hashed')
    }
    console.log('✅ 3.1 Multi-row import commits all rows atomically with mustChangePassword = true')

    // 3.2 Failure in middle of import rolls back all writes and leaves 0 orphaned rows
    // We create a santri import where the second row has an invalid class_id (FK violation on enrollments)
    const [validActiveYear] = await db
      .select({ id: academicYears.id })
      .from(academicYears)
      .where(eq(academicYears.isActive, true))
      .limit(1)

    assert.ok(validActiveYear, 'Active academic year fixture required')

    const rollbackSantriRows = [
      {
        full_name: `Santri Rollback 1 ${testId}`,
        gender: 'L',
        enrollment_date: '2026-01-01',
        class_id: 99999999, // INVALID CLASS ID — causes enrollments FK violation!
      },
    ]

    let importFailed = false
    try {
      await executeImport('santri', rollbackSantriRows)
    } catch (err) {
      importFailed = true
    }

    assert.strictEqual(importFailed, true, 'executeImport with FK violation must throw')

    // Verify student was NOT left in database (rolled back!)
    const orphanedStudents = await db
      .select()
      .from(students)
      .where(eq(students.fullName, rollbackSantriRows[0].full_name))

    assert.strictEqual(
      orphanedStudents.length,
      0,
      'Transaction rollback must leave 0 orphaned students in database'
    )
    console.log('✅ 3.2 Failed import triggers atomic rollback: 0 orphaned rows created, no partial state')

    // 3.3 Existing user password remains unchanged on relationship import
    const existingPwHash = '$2a$10$customPermanentPasswordHashStored12345'
    const [existingParentUser] = await db
      .insert(users)
      .values({
        fullName: `Existing Parent Preserved ${testId}`,
        email: `parent_pres_${testId}@test.mahabbah.id`,
        passwordHash: existingPwHash,
        role: 'orang_tua',
        mustChangePassword: false,
      })
      .returning()
    createdUserIds.push(existingParentUser.id)

    const [testStudentForRel] = await db
      .insert(students)
      .values({
        fullName: `Student For Pres Rel ${testId}`,
        gender: 'L',
        enrollmentDate: '2026-01-01',
        status: 'active',
      })
      .returning()
    createdStudentIds.push(testStudentForRel.id)

    const relImportRes = await executeImport('parent_santri', [
      {
        parent_id: existingParentUser.id,
        student_id: testStudentForRel.id,
        relationship: 'ibu',
        is_primary: true,
      },
    ])
    assert.strictEqual(relImportRes.count, 1, 'Relationship import should succeed')

    const [reloadedParent] = await db
      .select()
      .from(users)
      .where(eq(users.id, existingParentUser.id))

    assert.strictEqual(
      reloadedParent.passwordHash,
      existingPwHash,
      'Existing user passwordHash must remain completely unchanged'
    )
    assert.strictEqual(
      reloadedParent.mustChangePassword,
      false,
      'Existing user mustChangePassword must remain false'
    )
    console.log('✅ 3.3 Relationship import is non-destructive: existing user password and flags preserved')

    console.log('\n🎉 ALL COVERAGE-SPRINT-04 HARDENING VERIFICATION TESTS PASSED!')
  } finally {
    if (originalCronSecret) {
      process.env.CRON_SECRET = originalCronSecret
    } else {
      delete process.env.CRON_SECRET
    }

    // Fixture cleanup
    console.log('\n--- Cleaning up test fixtures ---')
    if (createdStudentIds.length > 0) {
      await db.delete(studentParents).where(inArray(studentParents.studentId, createdStudentIds))
      await db.delete(students).where(inArray(students.id, createdStudentIds))
    }
    if (createdUserIds.length > 0) {
      await db.delete(studentParents).where(inArray(studentParents.parentId, createdUserIds))
      await db.delete(users).where(inArray(users.id, createdUserIds))
    }
    console.log(`Cleaned up: ${createdUserIds.length} users, ${createdStudentIds.length} students.`)
  }
}

runHardeningTests().catch((err) => {
  console.error('\n❌ Test failed:', err)
  process.exit(1)
})
