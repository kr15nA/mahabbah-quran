import { sql } from '@/lib/db/client'

export type ProgramRow = {
  id: number
  name: string
  description: string | null
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export async function getAllPrograms(): Promise<ProgramRow[]> {
  const rows = await sql`
    SELECT * FROM programs
    WHERE is_active = TRUE
    ORDER BY id ASC
  `
  return rows as ProgramRow[]
}

export async function getProgramById(id: number): Promise<ProgramRow | null> {
  const rows = await sql`
    SELECT * FROM programs
    WHERE id = ${id}
    LIMIT 1
  `
  return (rows[0] as ProgramRow) ?? null
}

export async function searchPrograms(query?: string, filters?: {
  status?: string
}, pagination?: {
  limit: number
  offset: number
}): Promise<{ data: ProgramRow[], total: number }> {
  const q = query ? `%${query}%` : null
  const limit = pagination?.limit ?? null
  const offset = pagination?.offset ?? null
  
  // Convert status filter to boolean logic
  let isActiveFilter: boolean | null = null
  if (filters?.status === 'active') isActiveFilter = true
  if (filters?.status === 'archived') isActiveFilter = false
  // if 'all', leave as null
  
  const rows = await sql`
    SELECT
      *,
      COUNT(*) OVER() AS total_count
    FROM programs
    WHERE (${q}::text IS NULL OR name ILIKE ${q}::text)
      AND (${isActiveFilter}::boolean IS NULL OR is_active = ${isActiveFilter}::boolean)
    ORDER BY created_at DESC, id DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `
  
  const total = rows.length > 0 ? Number(rows[0].total_count) : 0
  return { data: rows as ProgramRow[], total }
}

export async function insertProgram(data: { name: string; description?: string }): Promise<number> {
  const rows = await sql`
    INSERT INTO programs (name, description)
    VALUES (${data.name}, ${data.description ?? null})
    RETURNING id
  `
  return (rows[0] as { id: number }).id
}

export async function updateProgram(id: number, data: { name: string; description?: string }): Promise<void> {
  await sql`
    UPDATE programs
    SET 
      name = ${data.name}, 
      description = ${data.description ?? null},
      updated_at = NOW()
    WHERE id = ${id}
  `
}

export async function archiveProgram(id: number): Promise<void> {
  await sql`
    UPDATE programs
    SET 
      is_active = FALSE,
      updated_at = NOW()
    WHERE id = ${id}
  `
}

