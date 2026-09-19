'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/rbac'
import { getUserById } from '@/lib/db/queries/users'
import { db } from '@/lib/db/client'
import { financeDb as txDb } from '@/lib/finance/tx'
import { users, auditLogs } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { deleteImage } from '@/lib/media'

export async function updateMyProfile(formData: FormData) {
  try {
    const session = await requireAuth()
    const userId = session.session.userId

    const fullName = formData.get('full_name') as string
    const phone = formData.get('phone') as string | null

    if (!fullName || fullName.trim().length === 0) {
      return { error: 'Nama lengkap wajib diisi' }
    }

    const currentData = await getUserById(userId)
    if (!currentData) return { error: 'User tidak ditemukan' }

    const updates: Partial<typeof currentData> = {}
    const diff: Record<string, any> = {}

    if (currentData.full_name !== fullName.trim()) {
      updates.full_name = fullName.trim()
      diff.full_name = fullName.trim()
    }
    if (currentData.phone !== (phone?.trim() || null)) {
      updates.phone = phone ? phone.trim() : null
      diff.phone = updates.phone
    }

    if (Object.keys(updates).length > 0) {
      const drizzleUpdates: Record<string, any> = { ...updates, updatedAt: new Date() }
      await txDb.transaction(async (tx) => {
        await tx.update(users).set(drizzleUpdates).where(eq(users.id, userId))
        
        await tx.insert(auditLogs).values({
          actorUserId: userId,
          action: 'PROFILE_UPDATED',
          entityType: 'USER',
          entityId: userId,
          oldValues: {
            full_name: currentData.full_name,
            phone: currentData.phone,
          },
          newValues: diff,
        })
      })
    }

    revalidatePath('/admin/akun')
    revalidatePath('/guru/akun')
    revalidatePath('/orang-tua/akun')
    
    return { success: true }
  } catch (err: any) {
    console.error(err)
    return { error: 'Terjadi kesalahan sistem' }
  }
}

import { uploadUserAvatar, removeUserAvatar } from './avatar'

export async function updateMyAvatar(formData: FormData) {
  try {
    const session = await requireAuth()
    const userId = session.session.userId

    const file = formData.get('file') as File | null
    if (!file) {
      return { error: 'Tidak ada file foto' }
    }

    await uploadUserAvatar({
      actorUserId: userId,
      targetUserId: userId,
      file
    })

    revalidatePath('/admin/akun')
    revalidatePath('/guru/akun')
    revalidatePath('/orang-tua/akun')

    return { success: true }
  } catch (err: any) {
    console.error('Upload avatar error:', err)
    return { error: err.message || 'Gagal mengubah foto profil' }
  }
}

export async function removeMyAvatar() {
  try {
    const session = await requireAuth()
    const userId = session.session.userId

    await removeUserAvatar({
      actorUserId: userId,
      targetUserId: userId
    })

    revalidatePath('/admin/akun')
    revalidatePath('/guru/akun')
    revalidatePath('/orang-tua/akun')

    return { success: true }
  } catch (err: any) {
    console.error('Remove avatar error:', err)
    return { error: 'Gagal menghapus foto profil' }
  }
}

export async function changeMyPassword(formData: FormData) {
  try {
    const session = await requireAuth()
    const userId = session.session.userId

    const currentPassword = formData.get('current_password') as string
    const newPassword = formData.get('new_password') as string
    const confirmPassword = formData.get('confirm_password') as string

    if (!currentPassword || !newPassword || !confirmPassword) {
      return { error: 'Semua kolom password wajib diisi' }
    }

    if (newPassword !== confirmPassword) {
      return { error: 'Password baru dan konfirmasi tidak cocok' }
    }

    if (newPassword.length < 8) {
      return { error: 'Password minimal 8 karakter' }
    }

    if (newPassword === currentPassword) {
      return { error: 'Password baru tidak boleh sama dengan password lama' }
    }

    const currentData = await getUserById(userId)
    if (!currentData) return { error: 'User tidak ditemukan' }

    const isMatch = await bcrypt.compare(currentPassword, currentData.password_hash)
    if (!isMatch) {
      return { error: 'Password saat ini salah' }
    }

    const newHash = await bcrypt.hash(newPassword, 10)
    
    await txDb.transaction(async (tx) => {
      await tx.update(users)
        .set({ passwordHash: newHash, updatedAt: new Date() })
        .where(eq(users.id, userId))
        
      await tx.insert(auditLogs).values({
        actorUserId: userId,
        action: 'PASSWORD_CHANGED',
        entityType: 'USER',
        entityId: userId,
        oldValues: null,
        newValues: null,
      })
    })

    return { success: true }
  } catch (err: any) {
    console.error(err)
    return { error: 'Terjadi kesalahan sistem' }
  }
}
