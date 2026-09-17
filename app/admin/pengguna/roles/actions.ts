'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth, hasPermission } from '@/lib/auth/rbac'
import { insertRoleWithPermissions, updateRoleWithPermissions, getRoleByCode } from '@/lib/db/queries/rbac'

export async function createRole(formData: FormData) {
  try {
    const session = await requireAuth()
    const allowed = await hasPermission(session.session, 'system.role.manage')
    if (!allowed) return { error: 'Unauthorized' }

    const code = formData.get('code') as string
    const name = formData.get('name') as string
    const description = formData.get('description') as string || undefined
    const permissionIdsRaw = formData.getAll('permissionIds') as string[]
    
    if (!code?.trim() || !name?.trim()) return { error: 'Kode dan Nama wajib diisi' }
    
    // Normalize format to UPPER_SNAKE_CASE conventionally
    const normalizedCode = code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_')
    if (!normalizedCode) return { error: 'Format kode tidak valid' }

    const existing = await getRoleByCode(normalizedCode)
    if (existing) return { error: 'Kode role sudah digunakan' }

    const permissionIds = permissionIdsRaw.map(Number).filter(n => !isNaN(n))

    await insertRoleWithPermissions({
      code: normalizedCode,
      name: name.trim(),
      description: description?.trim(),
      permissionIds
    }, session.session.userId)

    revalidatePath('/admin/pengguna/roles')
    return { success: true }
  } catch (err: any) {
    console.error(err)
    return { error: 'Gagal membuat role' }
  }
}

export async function editRole(id: number, formData: FormData) {
  try {
    const session = await requireAuth()
    const allowed = await hasPermission(session.session, 'system.role.manage')
    if (!allowed) return { error: 'Unauthorized' }

    const name = formData.get('name') as string
    const description = formData.get('description') as string || undefined
    const permissionIdsRaw = formData.getAll('permissionIds') as string[]
    
    if (!name?.trim()) return { error: 'Nama wajib diisi' }

    const permissionIds = permissionIdsRaw.map(Number).filter(n => !isNaN(n))

    await updateRoleWithPermissions(id, {
      name: name.trim(),
      description: description?.trim(),
      permissionIds
    }, session.session.userId)

    revalidatePath('/admin/pengguna/roles')
    return { success: true }
  } catch (err: any) {
    console.error(err)
    return { error: 'Gagal mengubah role' }
  }
}
