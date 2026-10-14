'use server'

import { requireAuth } from '@/lib/auth/rbac'
import { createSession } from '@/lib/auth/session'
import { getUserById } from '@/lib/db/queries/users'
import { financeDb as txDb } from '@/lib/finance/tx'
import { users, auditLogs } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

export async function forceChangePasswordAction(formData: FormData) {
  try {
    const { session } = await requireAuth({ allowPasswordChange: true })
    const userId = session.userId

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
      return { error: 'Password baru tidak boleh sama dengan password saat ini' }
    }

    const currentData = await getUserById(userId)
    if (!currentData) {
      return { error: 'Pengguna tidak ditemukan' }
    }

    const isMatch = await bcrypt.compare(currentPassword, currentData.password_hash)
    if (!isMatch) {
      return { error: 'Password saat ini / sementara salah' }
    }

    const newHash = await bcrypt.hash(newPassword, 10)

    await txDb.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          passwordHash: newHash,
          mustChangePassword: false,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))

      await tx.insert(auditLogs).values({
        actorUserId: userId,
        action: 'PASSWORD_CHANGED',
        entityType: 'USER',
        entityId: userId,
        oldValues: null,
        newValues: null,
        metadata: {
          forcedChange: true,
        },
      })
    })

    // Re-issue active session cookie with mustChangePassword = false
    await createSession({
      userId: session.userId,
      role: session.role,
      fullName: session.fullName,
      email: session.email,
      mustChangePassword: false,
    })

    return { success: true, redirect: '/auth/landing' }
  } catch (err: any) {
    console.error('forceChangePasswordAction error:', err)
    return { error: err.message || 'Terjadi kesalahan sistem saat mengubah password' }
  }
}
