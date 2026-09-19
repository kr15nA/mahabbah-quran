'use server'

import { requireAuth, requirePermission } from '@/lib/auth/rbac'
import { uploadStudentPhoto, removeStudentPhoto } from '@/lib/students/photo'
import { revalidatePath } from 'next/cache'

export async function uploadStudentPhotoAction(studentId: number, formData: FormData) {
  try {
    const session = await requireAuth()
    await requirePermission('system.user.manage')

    const file = formData.get('file') as File | null
    if (!file) {
      return { error: 'Tidak ada file foto' }
    }

    await uploadStudentPhoto({
      actorUserId: session.session.userId,
      studentId,
      file
    })

    revalidatePath(`/admin/santri/${studentId}`)
    revalidatePath('/admin/santri')
    return { success: true }
  } catch (err: any) {
    console.error('Upload student photo error:', err)
    return { error: err.message || 'Gagal mengubah foto santri' }
  }
}

export async function removeStudentPhotoAction(studentId: number) {
  try {
    const session = await requireAuth()
    await requirePermission('system.user.manage')

    await removeStudentPhoto({
      actorUserId: session.session.userId,
      studentId
    })

    revalidatePath(`/admin/santri/${studentId}`)
    revalidatePath('/admin/santri')
    return { success: true }
  } catch (err: any) {
    console.error('Remove student photo error:', err)
    return { error: 'Gagal menghapus foto santri' }
  }
}
