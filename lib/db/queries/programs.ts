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

export async function insertProgram(data: { name: string; description?: string }): Promise<number> {
  const rows = await sql`
    INSERT INTO programs (name, description)
    VALUES (${data.name}, ${data.description ?? null})
    RETURNING id
  `
  return (rows[0] as { id: number }).id
}
