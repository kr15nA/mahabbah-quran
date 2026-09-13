import { eq, desc } from 'drizzle-orm'
import { db } from '../client'
import { academicYears } from '../../../drizzle/schema'

export type AcademicYear = typeof academicYears.$inferSelect
export type NewAcademicYear = typeof academicYears.$inferInsert

/**
 * Get all academic years, ordered by start date descending.
 */
export async function getAcademicYears(): Promise<AcademicYear[]> {
  return await db
    .select()
    .from(academicYears)
    .orderBy(desc(academicYears.startDate))
}

/**
 * Get the currently active academic year.
 */
export async function getActiveAcademicYear(): Promise<AcademicYear | null> {
  const [active] = await db
    .select()
    .from(academicYears)
    .where(eq(academicYears.isActive, true))
    .limit(1)

  return active || null
}

/**
 * Create a new academic year.
 */
export async function createAcademicYear(data: Pick<NewAcademicYear, 'name' | 'startDate' | 'endDate' | 'isActive'>): Promise<AcademicYear> {
  if (data.isActive) {
    // Neon HTTP does not support transactions. Execute sequentially.
    await db.update(academicYears).set({ isActive: false }).where(eq(academicYears.isActive, true))
  }
  const [newYear] = await db.insert(academicYears).values(data).returning()
  return newYear
}

/**
 * Update an existing academic year's dates or name.
 */
export async function updateAcademicYear(
  id: number,
  data: Partial<Pick<NewAcademicYear, 'name' | 'startDate' | 'endDate'>>
): Promise<AcademicYear | null> {
  const [updated] = await db
    .update(academicYears)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(academicYears.id, id))
    .returning()

  return updated || null
}

/**
 * Activate a specific academic year (and safely deactivate all others).
 */
export async function activateAcademicYear(id: number): Promise<{ activated: AcademicYear, deactivatedYearId: number | null } | null> {
  // Check if it exists
  const [target] = await db.select().from(academicYears).where(eq(academicYears.id, id)).limit(1)
  if (!target) return null

  // Neon HTTP does not support transactions. Execute sequentially.
  const deactivated = await db.update(academicYears).set({ isActive: false }).where(eq(academicYears.isActive, true)).returning()
  const deactivatedYearId = deactivated.length > 0 ? deactivated[0].id : null

  // Activate the target
  const [activated] = await db
    .update(academicYears)
    .set({ isActive: true, updatedAt: new Date() })
    .where(eq(academicYears.id, id))
    .returning()

  return { activated: activated || target, deactivatedYearId }
}
