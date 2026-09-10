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
  email?: string
  phone?: string
  password_hash: string
  role: 'guru' | 'orang_tua' | 'admin'
  avatar_url?: string
}): Promise<number> {
  const rows = await sql`
    INSERT INTO users (full_name, email, phone, password_hash, role, avatar_url)
    VALUES (${data.full_name}, ${data.email ?? null}, ${data.phone ?? null}, ${data.password_hash}, ${data.role}, ${data.avatar_url ?? null})
    RETURNING id
  `
  return (rows[0] as { id: number }).id
}

export async function softDeleteUser(id: number): Promise<void> {
  await sql`
    UPDATE users
    SET deleted_at = NOW(), is_active = FALSE
    WHERE id = ${id}
  `
}

export async function getAllTeachers(): Promise<UserRow[]> {
  const rows = await sql`
    SELECT u.*,
      COUNT(DISTINCT c.id)::int AS class_count,
      COUNT(DISTINCT s.id)::int AS student_count
    FROM users u
    LEFT JOIN classes c ON c.teacher_id = u.id AND c.is_active = TRUE
    LEFT JOIN students s ON s.class_id = c.id AND s.deleted_at IS NULL
    WHERE u.role = 'guru' AND u.deleted_at IS NULL
    GROUP BY u.id
    ORDER BY u.full_name
  `
  return rows as UserRow[]
}
