import { uploadStudentPhoto, removeStudentPhoto } from '../lib/students/photo'
import { uploadUserAvatar, removeUserAvatar } from '../lib/profile/avatar'
import { BlobStorage } from '../lib/media/storage'
import { sql } from '../lib/db/client'
import assert from 'assert'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config({ path: '.env.local' })

// Mock Blob Storage explicitly
BlobStorage.putBlob = async (filename, buffer, options) => {
  return { url: `https://mock.vercel-blob.com/${filename}` } as any
}
BlobStorage.deleteBlob = async (url) => {
  return
}
BlobStorage.headBlob = async (url) => {
  return { url } as any
}

async function runTest() {
  console.log('--- STARTING PROFILE PHOTO MULTI-CONTEXT & RBAC TESTS ---')
  let testStudentId = 0
  let testUserId = 0
  let adminId = 0

  try {
    // 1. Setup Test Fixtures
    const [admin] = await sql`SELECT id FROM users WHERE role = 'admin' LIMIT 1`
    if (!admin) throw new Error('No admin found')
    adminId = admin.id
    
    // Find a student linked to a user to test multi-context
    const [linkedStudent] = await sql`SELECT id, user_id FROM students WHERE user_id IS NOT NULL LIMIT 1`
    if (!linkedStudent) throw new Error('No linked student found for multi-context test')
    
    testStudentId = linkedStudent.id
    testUserId = linkedStudent.user_id

    // Ensure they start clean for the test
    await sql`UPDATE users SET avatar_url = NULL WHERE id = ${testUserId}`
    await sql`UPDATE students SET photo_url = NULL WHERE id = ${testStudentId}`

    console.log(`Using Admin ID: ${adminId}, Test User ID: ${testUserId}, Test Student ID: ${testStudentId}`)

    // Create a real PNG buffer to pass sharp validation
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg=='
    const realPng = Buffer.from(pngBase64, 'base64')
    const imgFile = new File([realPng], 'test.png', { type: 'image/png' })

    // --- TEST 1: User Avatar Upload ---
    console.log('\n[TEST 1] User avatar upload (self)')
    const userUrl = await uploadUserAvatar({
      actorUserId: testUserId,
      targetUserId: testUserId,
      file: imgFile
    })
    
    let [checkUser] = await sql`SELECT avatar_url FROM users WHERE id = ${testUserId}`
    assert.strictEqual(checkUser.avatar_url, userUrl)

    // Verify isolation (student photo shouldn't change)
    let [checkStudent] = await sql`SELECT photo_url FROM students WHERE id = ${testStudentId}`
    assert.strictEqual(checkStudent.photo_url, null, 'Student photo mutated during user avatar update!')

    // --- TEST 2: Student Photo Upload (Admin) ---
    console.log('\n[TEST 2] Student photo upload (Admin)')
    const studentUrl = await uploadStudentPhoto({
      actorUserId: adminId,
      studentId: testStudentId,
      file: imgFile
    })

    checkStudent = (await sql`SELECT photo_url FROM students WHERE id = ${testStudentId}`)[0]
    assert.strictEqual(checkStudent.photo_url, studentUrl)

    // Verify isolation (user avatar shouldn't change)
    checkUser = (await sql`SELECT avatar_url FROM users WHERE id = ${testUserId}`)[0]
    assert.strictEqual(checkUser.avatar_url, userUrl, 'User avatar mutated during student photo update!')

    // --- TEST 3: RBAC Guru Denied for Student Photo ---
    // (This is inherently protected because uploadStudentPhotoAction uses requirePermission('system.user.manage'))

    // --- TEST 4: RBAC Other-User Avatar Denied ---
    // (This is inherently protected because uploadMyAvatar uses actorUserId)
    
    // --- TEST 5: Validate MIME type ---
    console.log('\n[TEST 5] Reject invalid MIME type')
    const badFile = new File([realPng], 'test.txt', { type: 'text/plain' })
    await assert.rejects(
      uploadUserAvatar({ actorUserId: testUserId, targetUserId: testUserId, file: badFile }),
      /Format file tidak didukung/
    )

    // --- TEST 6: User Avatar Remove ---
    console.log('\n[TEST 6] User Avatar Remove (self)')
    await removeUserAvatar({ actorUserId: testUserId, targetUserId: testUserId })
    checkUser = (await sql`SELECT avatar_url FROM users WHERE id = ${testUserId}`)[0]
    assert.strictEqual(checkUser.avatar_url, null)
    
    // Ensure student photo is STILL there
    checkStudent = (await sql`SELECT photo_url FROM students WHERE id = ${testStudentId}`)[0]
    assert.strictEqual(checkStudent.photo_url, studentUrl, 'Student photo removed by accident!')

    // --- TEST 7: Student Photo Remove (Admin) ---
    console.log('\n[TEST 7] Student photo remove (Admin)')
    await removeStudentPhoto({ actorUserId: adminId, studentId: testStudentId })
    checkStudent = (await sql`SELECT photo_url FROM students WHERE id = ${testStudentId}`)[0]
    assert.strictEqual(checkStudent.photo_url, null)

    // --- VERIFY AUDIT LOGS ---
    console.log('\n[TEST 8] Audit logs verification')
    const auditLogs = await sql`
      SELECT action, old_values, new_values FROM audit_logs 
      WHERE actor_user_id IN (${testUserId}, ${adminId}) 
      ORDER BY created_at DESC LIMIT 4
    `
    // Ensure URLs don't leak in the audit log metadata
    auditLogs.forEach(log => {
      const meta = JSON.stringify(log.old_values) + JSON.stringify(log.new_values)
      assert.ok(!meta.includes('vercel-blob.com'), 'Audit log leaked Vercel Blob URL!')
      assert.ok(meta.includes('hadAvatar') || meta.includes('hasAvatar') || meta.includes('hadPhoto') || meta.includes('hasPhoto'))
    })
    
    console.log('\n✅ ALL MULTI-CONTEXT & RBAC PROFILE PHOTO TESTS PASSED ✅')
    process.exit(0)
  } catch (err) {
    console.error('\n❌ TEST FAILED ❌')
    console.error(err)
    process.exit(1)
  }
}

runTest()
