'use server'

import { requireAuth } from '@/lib/auth/rbac'
import { parseAndValidateImport, executeImport, DatasetType } from '@/lib/import-export'

export async function validateImportAction(formData: FormData) {
  try {
    const { role } = await requireAuth()
    if (role !== 'SUPER_ADMIN') {
      return { error: 'Unauthorized' }
    }

    const type = formData.get('type') as DatasetType
    const file = formData.get('file') as File | null

    if (!type || !file) {
      return { error: 'Data tidak lengkap' }
    }
    
    if (file.size > 10 * 1024 * 1024) {
      return { error: 'Ukuran file melebihi 10MB' }
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    
    const result = await parseAndValidateImport(buffer, type)
    
    return { success: true, result }
  } catch (err: any) {
    console.error('Validation error:', err)
    return { error: err.message || 'Gagal memvalidasi data' }
  }
}

export async function executeImportAction(type: DatasetType, validData: any[]) {
  try {
    const { role } = await requireAuth()
    if (role !== 'SUPER_ADMIN') {
      return { error: 'Unauthorized' }
    }

    if (!validData || validData.length === 0) {
      return { error: 'Tidak ada data valid untuk diimpor' }
    }

    const count = await executeImport(type, validData)
    
    return { success: true, count }
  } catch (err: any) {
    console.error('Execution error:', err)
    return { error: 'Gagal mengeksekusi import' }
  }
}
