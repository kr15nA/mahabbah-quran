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
    const avatarUrl = formData.get('avatar_url') as string | null

    if (!fullName || fullName.trim().length === 0) {
      return { error: 'Nama lengkap wajib diisi' }
    }

    const currentData = await getUserById(userId)
    if (!currentData) return { error: 'User tidak ditemukan' }

    const updates: Partial<typeof currentData> = {}
    const diff: Record<string, any> = {}
    let avatarChanged = false

    if (currentData.full_name !== fullName.trim()) {
      updates.full_name = fullName.trim()
      diff.full_name = fullName.trim()
    }
    if (currentData.phone !== (phone?.trim() || null)) {
      updates.phone = phone ? phone.trim() : null
      diff.phone = updates.phone
    }
    if (currentData.avatar_url !== (avatarUrl || null)) {
      updates.avatar_url = avatarUrl || null
      diff.avatar_url = updates.avatar_url
      avatarChanged = true
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
            avatar_url: currentData.avatar_url,
          },
          newValues: diff,
        })
        
        if (avatarChanged) {
          await tx.insert(auditLogs).values({
            actorUserId: userId,
            action: 'AVATAR_UPDATED',
            entityType: 'USER',
            entityId: userId,
            oldValues: { avatar_url: currentData.avatar_url },
            newValues: { avatar_url: updates.avatar_url },
          })
        }
      })
      
      // Safely cleanup old avatar only AFTER successful DB update
      if (avatarChanged && currentData.avatar_url) {
        try {
          await deleteImage(currentData.avatar_url)
        } catch (e) {
          console.warn('Failed to cleanup old avatar', e)
        }
      }
    }

    // Revalidate across all possible profile domains
    revalidatePath('/admin/akun')
    revalidatePath('/guru/akun')
    revalidatePath('/orang-tua/akun')
    
    return { success: true }
  } catch (err: any) {
    console.error(err)
    return { error: 'Terjadi kesalahan sistem' }
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
