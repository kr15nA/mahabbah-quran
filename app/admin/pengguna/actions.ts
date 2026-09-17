'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/rbac'
import { getUserByEmail, getUserByPhone, getUserById, insertUser, updateSystemUser } from '@/lib/db/queries/users'
import { syncUserRoles } from '@/lib/db/queries/rbac'
import bcrypt from 'bcryptjs'

const ALLOWED_ROLES = ['admin', 'guru', 'orang_tua']

export async function createUser(formData: FormData) {
  try {
    const session = await requireAuth()
    if (session.role !== 'SUPER_ADMIN') {
      return { error: 'Unauthorized' }
    }

    const full_name = formData.get('full_name') as string
    const email = formData.get('email') as string || null
    const phone = formData.get('phone') as string || null
    const role = formData.get('role') as string
    const dynamicRolesRaw = formData.getAll('dynamicRoles') as string[]
    const password = formData.get('password') as string

    if (!full_name?.trim()) return { error: 'Nama lengkap wajib diisi' }
    if (!password || password.length < 8) return { error: 'Password minimal 8 karakter' }
    if (!ALLOWED_ROLES.includes(role)) return { error: 'Role tidak valid' }
    if (role === 'SUPER_ADMIN') return { error: 'Tidak dapat membuat role SUPER_ADMIN' }

    if (email) {
      const existing = await getUserByEmail(email)
      if (existing) return { error: 'Email sudah terdaftar' }
    }

    if (phone) {
      const existing = await getUserByPhone(phone)
      if (existing) return { error: 'Nomor telepon sudah terdaftar' }
    }

    const password_hash = await bcrypt.hash(password, 10)

    const userId = await insertUser({
      full_name: full_name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      role: role as any,
      password_hash
    })

    const dynamicRoles = dynamicRolesRaw.map(Number).filter(n => !isNaN(n))
    if (dynamicRoles.length > 0) {
      await syncUserRoles(userId, dynamicRoles, session.session.userId)
    }

    revalidatePath('/admin/pengguna')
    return { success: true }
  } catch (err: any) {
    console.error(err)
    return { error: 'Gagal membuat pengguna' }
  }
}

export async function editUser(id: number, formData: FormData) {
  try {
    const session = await requireAuth()
    if (session.role !== 'SUPER_ADMIN') {
      return { error: 'Unauthorized' }
    }

    const currentData = await getUserById(id)
    if (!currentData) return { error: 'Pengguna tidak ditemukan' }

    // Admin cannot edit a SUPER_ADMIN unless they are SUPER_ADMIN, but since the system relies on legacy roles, we just prevent altering self-role for safety.
    if (currentData.id === session.session.userId) {
      const newRole = formData.get('role') as string
      if (newRole && newRole !== currentData.role) {
        return { error: 'Tidak dapat mengubah role sendiri' }
      }
    }

    const full_name = formData.get('full_name') as string
    const email = formData.get('email') as string || null
    const phone = formData.get('phone') as string || null
    const role = formData.get('role') as string
    const dynamicRolesRaw = formData.getAll('dynamicRoles') as string[]
    const is_active = formData.get('is_active') === 'true'

    if (!full_name?.trim()) return { error: 'Nama lengkap wajib diisi' }
    if (role && !ALLOWED_ROLES.includes(role)) return { error: 'Role tidak valid' }

    if (email && email !== currentData.email) {
      const existing = await getUserByEmail(email)
      if (existing) return { error: 'Email sudah terdaftar' }
    }

    if (phone && phone !== currentData.phone) {
      const existing = await getUserByPhone(phone)
      if (existing) return { error: 'Nomor telepon sudah terdaftar' }
    }

    const updatePayload: any = {
      full_name: full_name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      is_active
    }

    if (role && currentData.id !== session.session.userId) {
      updatePayload.role = role
    }

    await updateSystemUser(id, updatePayload)
    
    // User cannot alter their own dynamic roles to prevent self-lockout of admin privileges
    if (currentData.id !== session.session.userId) {
      const dynamicRoles = dynamicRolesRaw.map(Number).filter(n => !isNaN(n))
      await syncUserRoles(id, dynamicRoles, session.session.userId)
    }

    revalidatePath('/admin/pengguna')
    return { success: true }
  } catch (err: any) {
    console.error(err)
    return { error: 'Gagal mengubah pengguna' }
  }
}

export async function toggleUserActive(id: number, currentStatus: boolean) {
  try {
    const session = await requireAuth()
    if (session.role !== 'SUPER_ADMIN') {
      return { error: 'Unauthorized' }
    }
    if (id === session.session.userId) {
      return { error: 'Tidak dapat menonaktifkan akun sendiri' }
    }
    
    await updateSystemUser(id, { is_active: !currentStatus })
    revalidatePath('/admin/pengguna')
    return { success: true }
  } catch (err: any) {
    console.error(err)
    return { error: 'Gagal mengubah status' }
  }
}
