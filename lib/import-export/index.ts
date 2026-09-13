import { db } from '@/lib/db/client'
import { users, students, studentParents, classes, enrollments, academicYears } from '@/drizzle/schema'
import { eq, or, inArray, and, isNull } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import * as xlsx from 'xlsx'

export type DatasetType = 'santri' | 'guru' | 'orang_tua' | 'parent_santri'

export interface ValidationError {
  row: number
  field: string
  error: string
  value?: any
}

export interface ValidationResult<T> {
  isValid: boolean
  errors: ValidationError[]
  data: T[]
  totalRows: number
}

// ---------------------------------------------------------
// TEMPLATES
// ---------------------------------------------------------

export function getTemplate(type: DatasetType): Buffer {
  let headers: string[] = []
  if (type === 'santri') {
    headers = ['full_name', 'nickname', 'gender', 'date_of_birth', 'enrollment_date', 'class_id']
  } else if (type === 'guru' || type === 'orang_tua') {
    headers = ['full_name', 'email', 'phone']
  } else if (type === 'parent_santri') {
    headers = ['parent_email', 'student_id', 'relationship', 'is_primary']
  }

  const wb = xlsx.utils.book_new()
  const ws = xlsx.utils.aoa_to_sheet([headers])
  xlsx.utils.book_append_sheet(wb, ws, 'Template')
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

// ---------------------------------------------------------
// EXPORTS
// ---------------------------------------------------------

export async function exportDataset(type: DatasetType): Promise<Buffer> {
  const wb = xlsx.utils.book_new()
  let data: any[] = []

  if (type === 'santri') {
    const records = await db.select({
      id: students.id,
      full_name: students.fullName,
      nickname: students.nickname,
      gender: students.gender,
      date_of_birth: students.dateOfBirth,
      enrollment_date: students.enrollmentDate,
      class_id: students.classId,
      status: students.status,
    }).from(students).where(isNull(students.deletedAt))

    data = records
  } else if (type === 'guru') {
    const records = await db.select({
      id: users.id,
      full_name: users.fullName,
      email: users.email,
      phone: users.phone,
      is_active: users.isActive,
    }).from(users).where(eq(users.role, 'guru'))
    data = records
  } else if (type === 'orang_tua') {
    const records = await db.select({
      id: users.id,
      full_name: users.fullName,
      email: users.email,
      phone: users.phone,
      is_active: users.isActive,
    }).from(users).where(eq(users.role, 'orang_tua'))
    data = records
  } else if (type === 'parent_santri') {
    const records = await db.select({
      parent_id: studentParents.parentId,
      parent_name: users.fullName,
      parent_email: users.email,
      student_id: studentParents.studentId,
      student_name: students.fullName,
      relationship: studentParents.relationship,
      is_primary: studentParents.isPrimary,
    })
    .from(studentParents)
    .innerJoin(users, eq(users.id, studentParents.parentId))
    .innerJoin(students, eq(students.id, studentParents.studentId))
    data = records
  }

  const ws = xlsx.utils.json_to_sheet(data)
  xlsx.utils.book_append_sheet(wb, ws, 'Export')
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

// ---------------------------------------------------------
// VALIDATION & IMPORT PARSING
// ---------------------------------------------------------

export async function parseAndValidateImport(fileBuffer: Buffer, type: DatasetType): Promise<ValidationResult<any>> {
  const wb = xlsx.read(fileBuffer, { type: 'buffer' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rawData = xlsx.utils.sheet_to_json(ws, { defval: '' }) as any[]

  if (rawData.length > 5000) {
    throw new Error('File melebihi batas maksimal 5000 baris.')
  }

  const errors: ValidationError[] = []
  const validData: any[] = []
  let rowIndex = 2 // 1 is header

  // Extract all emails/phones to batch check DB
  const emails = rawData.map(r => r.email).filter(Boolean)
  const phones = rawData.map(r => r.phone).filter(Boolean)
  
  let existingEmails: string[] = []
  let existingPhones: string[] = []
  let validClassIds: number[] = []
  let existingStudents: Set<number> = new Set()
  let existingParents: Map<string, number> = new Map() // email -> id

  if ((type === 'guru' || type === 'orang_tua') && (emails.length > 0 || phones.length > 0)) {
    const condition = []
    if (emails.length > 0) condition.push(inArray(users.email, emails))
    if (phones.length > 0) condition.push(inArray(users.phone, phones))
    
    if (condition.length > 0) {
      const existing = await db.select({ email: users.email, phone: users.phone }).from(users).where(or(...condition))
      existingEmails = existing.map(u => u.email).filter(Boolean) as string[]
      existingPhones = existing.map(u => u.phone).filter(Boolean) as string[]
    }
  }

  if (type === 'santri') {
    const classRows = await db.select({ id: classes.id }).from(classes)
    validClassIds = classRows.map(c => c.id)
  }

  if (type === 'parent_santri') {
    const parentEmails = rawData.map(r => r.parent_email).filter(Boolean)
    const studentIds = rawData.map(r => parseInt(r.student_id)).filter(id => !isNaN(id))

    if (parentEmails.length > 0) {
      const parentRows = await db.select({ id: users.id, email: users.email }).from(users).where(and(eq(users.role, 'orang_tua'), inArray(users.email, parentEmails)))
      parentRows.forEach(p => p.email && existingParents.set(p.email, p.id))
    }
    if (studentIds.length > 0) {
      const studentRows = await db.select({ id: students.id }).from(students).where(inArray(students.id, studentIds))
      studentRows.forEach(s => existingStudents.add(s.id))
    }
  }

  for (const row of rawData) {
    let rowValid = true

    if (type === 'guru' || type === 'orang_tua') {
      const { full_name, email, phone } = row
      if (!full_name) {
        errors.push({ row: rowIndex, field: 'full_name', error: 'Nama lengkap wajib diisi', value: full_name })
        rowValid = false
      }
      if (!email && !phone) {
        errors.push({ row: rowIndex, field: 'email/phone', error: 'Email atau telepon wajib diisi', value: '' })
        rowValid = false
      }
      if (email && existingEmails.includes(email)) {
        errors.push({ row: rowIndex, field: 'email', error: 'Email sudah terdaftar', value: email })
        rowValid = false
      }
      if (phone && existingPhones.includes(phone)) {
        errors.push({ row: rowIndex, field: 'phone', error: 'Nomor telepon sudah terdaftar', value: phone })
        rowValid = false
      }
      
      if (rowValid) {
        validData.push({ full_name, email: email || null, phone: phone || null })
      }
    }

    if (type === 'santri') {
      const { full_name, nickname, gender, date_of_birth, enrollment_date, class_id } = row
      if (!full_name) {
        errors.push({ row: rowIndex, field: 'full_name', error: 'Nama wajib diisi', value: full_name })
        rowValid = false
      }
      if (!class_id || !validClassIds.includes(parseInt(class_id))) {
        errors.push({ row: rowIndex, field: 'class_id', error: 'ID Kelas tidak valid atau tidak ditemukan', value: class_id })
        rowValid = false
      }
      if (!enrollment_date) {
        errors.push({ row: rowIndex, field: 'enrollment_date', error: 'Tanggal masuk wajib diisi', value: enrollment_date })
        rowValid = false
      }

      if (rowValid) {
        validData.push({ 
          full_name, 
          nickname: nickname || null, 
          gender: gender || null, 
          date_of_birth: date_of_birth || null, 
          enrollment_date, 
          class_id: parseInt(class_id) 
        })
      }
    }

    if (type === 'parent_santri') {
      const { parent_email, student_id, relationship, is_primary } = row
      const sId = parseInt(student_id)

      if (!parent_email) {
        errors.push({ row: rowIndex, field: 'parent_email', error: 'Email orang tua wajib diisi', value: parent_email })
        rowValid = false
      } else if (!existingParents.has(parent_email)) {
        errors.push({ row: rowIndex, field: 'parent_email', error: 'Akun orang tua dengan email ini tidak ditemukan', value: parent_email })
        rowValid = false
      }

      if (isNaN(sId) || !existingStudents.has(sId)) {
        errors.push({ row: rowIndex, field: 'student_id', error: 'ID Santri tidak valid atau tidak ditemukan', value: student_id })
        rowValid = false
      }

      if (rowValid) {
        validData.push({
          parent_id: existingParents.get(parent_email)!,
          student_id: sId,
          relationship: relationship || 'wali',
          is_primary: is_primary?.toString().toLowerCase() === 'true' || is_primary === true || is_primary === 1
        })
      }
    }

    rowIndex++
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: validData,
    totalRows: rawData.length
  }
}

// ---------------------------------------------------------
// EXECUTION
// ---------------------------------------------------------

export async function executeImport(type: DatasetType, validData: any[]) {
  if (validData.length === 0) return 0

  const tx = db
    if (type === 'guru' || type === 'orang_tua') {
      const hashedPw = await bcrypt.hash('Mahabbah123!', 10) // Temporary password
      const inserts = validData.map(d => ({
        fullName: d.full_name,
        email: d.email,
        phone: d.phone,
        role: type,
        passwordHash: hashedPw
      }))
      await tx.insert(users).values(inserts)
    }

    if (type === 'santri') {
      const [activeYear] = await tx.select({ id: academicYears.id })
        .from(academicYears)
        .where(eq(academicYears.isActive, true))
        .limit(1)

      if (!activeYear) {
        throw new Error('Active academic year required for student placement')
      }

      const inserts = validData.map(d => ({
        fullName: d.full_name,
        nickname: d.nickname,
        gender: d.gender,
        dateOfBirth: d.date_of_birth,
        enrollmentDate: d.enrollment_date,
        classId: d.class_id,
        status: 'active' as const
      }))
      const insertedStudents = await tx.insert(students).values(inserts).returning({ id: students.id, classId: students.classId })

      const enrollmentInserts = insertedStudents.map(s => ({
        studentId: s.id,
        academicYearId: activeYear.id,
        classId: s.classId,
        enrollmentDate: new Date().toISOString().split('T')[0]
      }))
      if (enrollmentInserts.length > 0) {
        await tx.insert(enrollments).values(enrollmentInserts)
      }
    }

    if (type === 'parent_santri') {
      const inserts = validData.map(d => ({
        parentId: d.parent_id,
        studentId: d.student_id,
        relationship: d.relationship,
        isPrimary: d.is_primary
      }))
      // Insert ignore is handled in postgres using ON CONFLICT but we can just use normal insert 
      // if we assume validation was clean. 
      // To be strictly safe against unique violations breaking the transaction:
      for (const item of inserts) {
        // We'll check for dupes in TX
        const existing = await tx.select({ id: studentParents.id })
          .from(studentParents)
          .where(and(eq(studentParents.parentId, item.parentId), eq(studentParents.studentId, item.studentId)))
        
        if (existing.length === 0) {
          await tx.insert(studentParents).values(item)
        }
      }
    }
    
  return validData.length
}
