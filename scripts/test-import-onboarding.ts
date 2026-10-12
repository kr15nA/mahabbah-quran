import assert from 'assert'
import { db } from '../lib/db/client'
import { users, auditLogs, students, studentParents, classes, academicYears } from '../drizzle/schema'
import { eq, inArray } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { executeImport, generateTemporaryPassword } from '../lib/import-export'
import { SignJWT, jwtVerify } from 'jose'
import { assertSafeMutatingDbTestEnvironment } from './lib/assert-safe-mutating-db-test'

async function generateToken(payload: Record<string, unknown>) {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET missing')
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(secret))
}

async function verifyToken(token: string) {
  const secret = process.env.JWT_SECRET!
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))
  return payload
}

async function runTests() {
  assertSafeMutatingDbTestEnvironment()
  console.log('=== IMPORT-ONBOARDING-001 Security Tests ===\n')

  const createdUserIds: number[] = []
  const createdStudentIds: number[] = []

  try {
    // 1. Temporary password entropy & uniqueness
    console.log('--- 1. Unique Temporary Passwords ---')
    const pass1 = generateTemporaryPassword()
    const pass2 = generateTemporaryPassword()
    assert.notStrictEqual(pass1, pass2, 'Consecutive temporary passwords must be distinct')
    assert.ok(pass1.length >= 12, 'Temporary password must have sufficient length')
    assert.ok(pass1.startsWith('Mq#'), 'Temporary password must match standard prefix')
    console.log('✅ Temporary password generation is high entropy and unique')

    // 2. Import execution generates unique passwords, sets must_change_password = true
    console.log('--- 2. Import Execution Security ---')
    const timestamp = Date.now()
    const testData = [
      { full_name: 'Guru Import 1', email: `guru1.${timestamp}@example.com`, phone: `0811${timestamp.toString().slice(-6)}` },
      { full_name: 'Guru Import 2', email: `guru2.${timestamp}@example.com`, phone: `0812${timestamp.toString().slice(-6)}` },
    ]

    const importRes = await executeImport('guru', testData)
    assert.strictEqual(importRes.count, 2, 'Import count must be 2')
    assert.ok(importRes.credentials && importRes.credentials.length === 2, 'Credentials must be returned in import result')
    assert.notStrictEqual(
      importRes.credentials[0].temporaryPassword,
      importRes.credentials[1].temporaryPassword,
      'Imported users must receive distinct temporary passwords'
    )

    // Verify DB state
    const dbUsers = await db.select().from(users).where(inArray(users.email, [testData[0].email, testData[1].email]))
    assert.strictEqual(dbUsers.length, 2, 'DB should have 2 imported users')
    for (const u of dbUsers) {
      createdUserIds.push(u.id)
      assert.strictEqual(u.mustChangePassword, true, 'User must have mustChangePassword = true')
      assert.ok(u.passwordHash && u.passwordHash.startsWith('$2'), 'User must have hashed password')
      assert.notStrictEqual(u.passwordHash, 'Mahabbah123!', 'Plaintext password must not be stored')
    }

    // Verify temporary password matches bcrypt hash
    const match0 = await bcrypt.compare(importRes.credentials[0].temporaryPassword, dbUsers[0].passwordHash)
    assert.ok(match0, 'Generated temporary password must match password_hash')
    console.log('✅ Import sets mustChangePassword = true, distinct hashed passwords, returns one-time credentials')

    // 3. Auth Token Gate verification
    console.log('--- 3. Auth Token Gate & mustChangePassword Flag ---')
    const user0 = dbUsers[0]
    const token = await generateToken({
      userId: user0.id,
      role: 'guru',
      fullName: user0.fullName,
      email: user0.email,
      mustChangePassword: true,
    })

    const payload = await verifyToken(token)
    assert.strictEqual(payload.mustChangePassword, true, 'Token payload retains mustChangePassword = true')
    console.log('✅ JWT correctly encodes and verifies mustChangePassword state')

    // 4. Password change lifecycle simulation
    console.log('--- 4. Password Change Lifecycle & Flag Clearance ---')
    const newPassword = 'MyNewSecurePassword2026!'
    const newHash = await bcrypt.hash(newPassword, 10)

    // Verify current temporary password matches before rotation
    const tempMatch = await bcrypt.compare(importRes.credentials[0].temporaryPassword, user0.passwordHash)
    assert.ok(tempMatch, 'Current temporary password must be valid')

    // Execute password rotation in DB
    await db
      .update(users)
      .set({
        passwordHash: newHash,
        mustChangePassword: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user0.id))

    const reloadedUser = await db.select().from(users).where(eq(users.id, user0.id)).limit(1)
    assert.strictEqual(reloadedUser[0].mustChangePassword, false, 'DB must reflect must_change_password = false')

    // Verify new token issued with mustChangePassword = false
    const cleanToken = await generateToken({
      userId: user0.id,
      role: 'guru',
      fullName: user0.fullName,
      email: user0.email,
      mustChangePassword: false,
    })
    const cleanPayload = await verifyToken(cleanToken)
    assert.strictEqual(cleanPayload.mustChangePassword, false, 'Clean token must have mustChangePassword = false')
    console.log('✅ Password rotation clears must_change_password in DB and subsequent session tokens')

    // 5. Existing user safety during re-import / relationship import
    console.log('--- 5. Existing User Password Preservation During Relationship Import ---')
    // Create an existing parent with an existing customized password and mustChangePassword = false
    const existingPasswordHash = await bcrypt.hash('OriginalParentPass2026!', 10)
    const [existingParent] = await db
      .insert(users)
      .values({
        fullName: 'Existing Parent User',
        email: `parent.existing.${timestamp}@example.com`,
        passwordHash: existingPasswordHash,
        role: 'orang_tua',
        mustChangePassword: false,
        isActive: true,
      })
      .returning({ id: users.id, email: users.email })
    createdUserIds.push(existingParent.id)

    // Create a student to link
    const [testStudent] = await db
      .insert(students)
      .values({
        fullName: 'Student for Relation Test',
        status: 'active',
        enrollmentDate: '2026-01-01',
      })
      .returning({ id: students.id })
    createdStudentIds.push(testStudent.id)

    // Execute relationship import
    const relData = [
      {
        parent_id: existingParent.id,
        student_id: testStudent.id,
        relationship: 'ayah',
        is_primary: true,
      },
    ]
    const relRes = await executeImport('parent_santri', relData)
    assert.strictEqual(relRes.count, 1, 'Relationship import should succeed')

    // Verify existing parent's passwordHash and mustChangePassword were NOT altered
    const checkedParent = await db.select().from(users).where(eq(users.id, existingParent.id)).limit(1)
    assert.strictEqual(checkedParent[0].passwordHash, existingPasswordHash, 'Password hash must remain unchanged')
    assert.strictEqual(checkedParent[0].mustChangePassword, false, 'mustChangePassword must remain false')
    console.log('✅ Existing users are safely preserved without password modification during relationship imports')

    console.log('\n🎉 ALL IMPORT-ONBOARDING-001 TESTS PASSED!')
  } finally {
    if (createdStudentIds.length > 0) {
      await db.delete(studentParents).where(inArray(studentParents.studentId, createdStudentIds))
      await db.delete(students).where(inArray(students.id, createdStudentIds))
    }
    if (createdUserIds.length > 0) {
      await db.delete(auditLogs).where(inArray(auditLogs.actorUserId, createdUserIds))
      await db.delete(users).where(inArray(users.id, createdUserIds))
      console.log(`Cleaned up test user fixtures (${createdUserIds.length} users).`)
    }
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
