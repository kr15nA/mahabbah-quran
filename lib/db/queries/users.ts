import { sql } from '@/lib/db/client'

export type UserRow = {
  id: number
  full_name: string
  email: string | null
  phone: string | null
  password_hash: string
  role: 'guru' | 'orang_tua' | 'admin'
  avatar_url: string | null
  fcm_token: string | null
  is_active: boolean
  last_login_at: Date | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

export type SafeGuruRow = Omit<UserRow, 'password_hash' | 'fcm_token' | 'deleted_at'> & {
  class_count?: number
  student_count?: number
}

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const rows = await sql`
    SELECT * FROM users
    WHERE email = ${email} AND deleted_at IS NULL
    LIMIT 1
  `
  return (rows[0] as UserRow) ?? null
}

export async function getUserByPhone(phone: string): Promise<UserRow | null> {
  const rows = await sql`
    SELECT * FROM users
    WHERE phone = ${phone} AND deleted_at IS NULL
    LIMIT 1
  `
  return (rows[0] as UserRow) ?? null
}

export async function getUserById(id: number): Promise<UserRow | null> {
  const rows = await sql`
    SELECT * FROM users
    WHERE id = ${id} AND deleted_at IS NULL
    LIMIT 1
  `
  return (rows[0] as UserRow) ?? null
}

export async function updateFcmToken(id: number, token: string): Promise<void> {
  await sql`
    UPDATE users
    SET fcm_token = ${token}, updated_at = NOW()
    WHERE id = ${id}
  `
}

export async function updateLastLogin(id: number): Promise<void> {
  await sql`
    UPDATE users
    SET last_login_at = NOW(), updated_at = NOW()
    WHERE id = ${id}
  `
}

export async function insertUser(data: {
  full_name: string
  email?: string | null
  phone?: string | null
  password_hash: string
  role: 'guru' | 'orang_tua' | 'admin'
  avatar_url?: string | null
}): Promise<number> {
  const rows = await sql`
    INSERT INTO users (full_name, email, phone, password_hash, role, avatar_url)
    VALUES (${data.full_name}, ${data.email ?? null}, ${data.phone ?? null}, ${data.password_hash}, ${data.role}, ${data.avatar_url ?? null})
    RETURNING id
  `
  return (rows[0] as { id: number }).id
}

export async function updateGuru(
  id: number,
  data: Partial<{
    full_name: string
    email: string | null
    phone: string | null
    password_hash: string
    is_active: boolean
  }>
): Promise<void> {
  await sql`
    UPDATE users 
    SET 
      full_name = CASE WHEN ${data.full_name !== undefined} THEN ${data.full_name ?? null}::varchar ELSE full_name END,
      email = CASE WHEN ${data.email !== undefined} THEN ${data.email ?? null}::varchar ELSE email END,
      phone = CASE WHEN ${data.phone !== undefined} THEN ${data.phone ?? null}::varchar ELSE phone END,
      password_hash = CASE WHEN ${data.password_hash !== undefined} THEN ${data.password_hash ?? null}::varchar ELSE password_hash END,
      is_active = CASE WHEN ${data.is_active !== undefined} THEN ${data.is_active ?? null}::boolean ELSE is_active END,
      updated_at = CASE WHEN ${Object.keys(data).length > 0} THEN NOW() ELSE updated_at END
    WHERE id = ${id} AND role = 'guru'
  `
}

export async function archiveGuru(id: number): Promise<void> {
  await sql`
    UPDATE users
    SET is_active = FALSE, updated_at = NOW()
    WHERE id = ${id} AND role = 'guru'
  `
}

export async function softDeleteUser(id: number): Promise<void> {
  await sql`
    UPDATE users
    SET deleted_at = NOW(), is_active = FALSE
    WHERE id = ${id}
  `
}

export async function searchGurus(params: {
  search?: string
  isActiveFilter?: boolean | null
  limit: number
  offset: number
}): Promise<{ data: SafeGuruRow[]; total: number }> {
  const searchPattern = params.search ? `%${params.search}%` : null
  const { isActiveFilter, limit, offset } = params

  const dataRows = await sql`
    SELECT 
      u.id, 
      u.full_name, 
      u.email, 
      u.phone, 
      u.role, 
      u.avatar_url, 
      u.is_active, 
      u.last_login_at, 
      u.created_at, 
      u.updated_at,
      COUNT(DISTINCT c.id)::int AS class_count,
      COUNT(DISTINCT s.id)::int AS student_count
    FROM users u
    LEFT JOIN classes c ON c.teacher_id = u.id AND c.is_active = TRUE
    LEFT JOIN students s ON s.class_id = c.id AND s.deleted_at IS NULL
    WHERE u.role = 'guru' 
      AND u.deleted_at IS NULL
      AND (${searchPattern}::text IS NULL OR u.full_name ILIKE ${searchPattern} OR COALESCE(u.email, '') ILIKE ${searchPattern})
      AND (${isActiveFilter}::boolean IS NULL OR u.is_active = ${isActiveFilter})
    GROUP BY u.id
    ORDER BY u.full_name
    LIMIT ${limit} OFFSET ${offset}
  `

  const countRows = await sql`
    SELECT COUNT(*) as total
    FROM users u
    WHERE u.role = 'guru' 
      AND u.deleted_at IS NULL
      AND (${searchPattern}::text IS NULL OR u.full_name ILIKE ${searchPattern} OR COALESCE(u.email, '') ILIKE ${searchPattern})
      AND (${isActiveFilter}::boolean IS NULL OR u.is_active = ${isActiveFilter})
  `

  return {
    data: dataRows as SafeGuruRow[],
    total: Number((countRows[0] as any).total),
  }
}

export async function getAllTeachers(): Promise<SafeGuruRow[]> {
  const rows = await sql`
    SELECT 
      u.id, 
      u.full_name, 
      u.email, 
      u.phone, 
      u.role, 
      u.avatar_url, 
      u.is_active, 
      u.last_login_at, 
      u.created_at, 
      u.updated_at,
      COUNT(DISTINCT c.id)::int AS class_count,
      COUNT(DISTINCT s.id)::int AS student_count
    FROM users u
    LEFT JOIN classes c ON c.teacher_id = u.id AND c.is_active = TRUE
    LEFT JOIN students s ON s.class_id = c.id AND s.deleted_at IS NULL
    WHERE u.role = 'guru' AND u.deleted_at IS NULL AND u.is_active = TRUE
    GROUP BY u.id
    ORDER BY u.full_name
  `
  return rows as SafeGuruRow[]
}

export async function updateUser(
  id: number,
  data: Partial<{
    full_name: string
    email: string | null
    phone: string | null
    password_hash: string
    avatar_url: string | null
  }>
): Promise<void> {
  await sql`
    UPDATE users 
    SET 
      full_name = CASE WHEN ${data.full_name !== undefined} THEN ${data.full_name ?? null}::varchar ELSE full_name END,
      email = CASE WHEN ${data.email !== undefined} THEN ${data.email ?? null}::varchar ELSE email END,
      phone = CASE WHEN ${data.phone !== undefined} THEN ${data.phone ?? null}::varchar ELSE phone END,
      password_hash = CASE WHEN ${data.password_hash !== undefined} THEN ${data.password_hash ?? null}::varchar ELSE password_hash END,
      avatar_url = CASE WHEN ${data.avatar_url !== undefined} THEN ${data.avatar_url ?? null}::varchar ELSE avatar_url END,
      updated_at = CASE WHEN ${Object.keys(data).length > 0} THEN NOW() ELSE updated_at END
    WHERE id = ${id}
  `
}
