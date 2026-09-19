import { uploadProfilePhoto, deleteImage } from '@/lib/media'
import { students } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { financeDb as txDb } from '@/lib/finance/tx'
import { auditLogs } from '@/drizzle/schema'
import { getStudentById } from '@/lib/db/queries/students'

export type UploadStudentPhotoOptions = {
  actorUserId: number
  studentId: number
  file: File
}

export async function uploadStudentPhoto({ actorUserId, studentId, file }: UploadStudentPhotoOptions) {
  // Validate student exists
  const student = await getStudentById(studentId)
  if (!student) {
    throw new Error('Santri tidak ditemukan')
  }
  
  if (student.deleted_at) {
    throw new Error('Santri sudah dihapus')
  }

  // Upload to Vercel Blob
  const newUrl = await uploadProfilePhoto({
    file,
    entityType: 'students',
    entityId: studentId,
    oldUrl: student.photo_url,
    cleanupPrevious: false // We clean up manually after successful DB transaction
  })

  // Update DB and insert audit log
  await txDb.transaction(async (tx) => {
    await tx.update(students)
      .set({ photoUrl: newUrl, updatedAt: new Date() })
      .where(eq(students.id, studentId))

    await tx.insert(auditLogs).values({
      actorUserId,
      action: 'STUDENT_PHOTO_UPDATE',
      entityType: 'STUDENT',
      entityId: studentId,
      oldValues: { hadPhoto: !!student.photo_url, hasPhoto: true },
      newValues: { hadPhoto: !!student.photo_url, hasPhoto: true },
    })
  })

  // Cleanup old file safely
  if (student.photo_url) {
    try {
      await deleteImage(student.photo_url)
    } catch (e) {
      console.warn('Failed to delete old student photo blob:', student.photo_url, e)
    }
  }

  return newUrl
}

export async function removeStudentPhoto({ actorUserId, studentId }: { actorUserId: number, studentId: number }) {
  const student = await getStudentById(studentId)
  if (!student || !student.photo_url || student.deleted_at) {
    return null
  }

  const oldUrl = student.photo_url

  await txDb.transaction(async (tx) => {
    await tx.update(students)
      .set({ photoUrl: null, updatedAt: new Date() })
      .where(eq(students.id, studentId))

    await tx.insert(auditLogs).values({
      actorUserId,
      action: 'STUDENT_PHOTO_REMOVE',
      entityType: 'STUDENT',
      entityId: studentId,
      oldValues: { hadPhoto: true, hasPhoto: false },
      newValues: { hadPhoto: true, hasPhoto: false },
    })
  })

  try {
    await deleteImage(oldUrl)
  } catch (e) {
    console.warn('Failed to delete old student photo blob:', oldUrl, e)
  }

  return null
}
