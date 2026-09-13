'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/rbac'
import { getUserById, getUserByEmail, getUserByPhone, updateUser } from '@/lib/db/queries/users'
import bcrypt from 'bcryptjs'

export async function updateProfile(formData: FormData) {
  try {
    const session = await requireAuth()
    if (session.role !== 'SUPER_ADMIN') {
      return { error: 'Unauthorized' }
    }

    const fullName = formData.get('full_name') as string
    const email = formData.get('email') as string || null
    const phone = formData.get('phone') as string || null
    const avatarUrl = formData.get('avatar_url') as string || null

    if (!fullName || fullName.trim().length === 0) {
      return { error: 'Nama lengkap wajib diisi' }
    }

    const currentData = await getUserById(session.session.userId)
    if (!currentData) return { error: 'User tidak ditemukan' }

    if (email && email !== currentData.email) {
      const existing = await getUserByEmail(email)
      if (existing) return { error: 'Email sudah terdaftar' }
    }

    if (phone && phone !== currentData.phone) {
      const existing = await getUserByPhone(phone)
      if (existing) return { error: 'Nomor telepon sudah terdaftar' }
    }

    await updateUser(session.session.userId, {
      full_name: fullName.trim(),
      email: email ? email.trim() : null,
      phone: phone ? phone.trim() : null,
      avatar_url: avatarUrl
    })

    revalidatePath('/admin/akun')
    revalidatePath('/admin/dashboard')
    
    return { success: true }
  } catch (err: any) {
    console.error(err)
    return { error: 'Terjadi kesalahan sistem' }
  }
}

export async function changePassword(formData: FormData) {
  try {
    const session = await requireAuth()
    if (session.role !== 'SUPER_ADMIN') {
      return { error: 'Unauthorized' }
    }

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

    const currentData = await getUserById(session.session.userId)
    if (!currentData) return { error: 'User tidak ditemukan' }

    const isMatch = await bcrypt.compare(currentPassword, currentData.password_hash)
    if (!isMatch) {
      return { error: 'Password saat ini salah' }
    }

    const newHash = await bcrypt.hash(newPassword, 10)
    await updateUser(session.session.userId, { password_hash: newHash })

    return { success: true }
  } catch (err: any) {
    console.error(err)
    return { error: 'Terjadi kesalahan sistem' }
  }
}
