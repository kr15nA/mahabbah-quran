import { sql } from '@/lib/db/client'

/**
 * Normalizes an unknown student identity into a canonical decimal string.
 * This ensures strict equality without relying on JS `===` between numbers and strings,
 * preventing regressions where `child_id="123"` and `student_id=123` fail to match.
 *
 * @param value The raw student ID (e.g. from URL, API, or raw Neon DB output).
 * @returns Canonical decimal string, or null if invalid.
 */
export function normalizeStudentId(value: string | number | undefined | null): string | null {
  if (value === null || value === undefined || value === '') return null
  
  const strValue = String(value).trim()
  
  // Must be composed entirely of digits. Rejects decimals (12.3), negatives (-1), scientific (1e3).
  if (!/^\d+$/.test(strValue)) return null

  // Remove leading zeros to ensure "00123" -> "123"
  const normalized = strValue.replace(/^0+/, '')
  
  // If it was all zeros (e.g., "000"), it would become empty string, which we consider invalid (assuming IDs > 0)
  if (normalized === '') return null

  return normalized
}

/**
 * Converts a canonical string ID back to a numeric representation required by Drizzle boundary.
 *
 * @param value The canonical string ID.
 * @returns Number suitable for Drizzle `mode: 'number'` configuration.
 * @throws Error if value exceeds JS max safe integer.
 */
export function studentIdToDbNumber(value: string): number {
  const normalized = normalizeStudentId(value)
  if (!normalized) {
    throw new Error('Invalid student ID for DB conversion')
  }

  const num = Number(normalized)
  if (!Number.isSafeInteger(num)) {
    throw new Error('Student ID exceeds MAX_SAFE_INTEGER, preventing safe conversion for current schema configuration.')
  }

  return num
}

export type SafeChildDisplay = {
  student_id: string
  student_name: string
  student_nickname: string | null
  student_photo: string | null
  class_name?: string
  program_name?: string
  teacher_name?: string
}

/**
 * Retrieves all authorized academic children for a given parent user.
 * 
 * Rules:
 * - Active relationship (`isActive = true`)
 * - Not soft-deleted (`deletedAt IS NULL`)
 * - Academic access granted (`canViewAcademic = true`)
 */
export async function getAuthorizedAcademicChildren(userId: number): Promise<SafeChildDisplay[]> {
  const rows = await sql`
    SELECT sp.student_id, s.full_name AS student_name, s.nickname AS student_nickname, s.photo_url AS student_photo,
      c.name AS class_name, p.name AS program_name, u.full_name AS teacher_name
    FROM student_parents sp
    JOIN students s ON s.id = sp.student_id
    LEFT JOIN academic_years ay ON ay.is_active = TRUE
    LEFT JOIN enrollments e ON e.student_id = s.id AND e.academic_year_id = ay.id
    LEFT JOIN classes c ON c.id = e.class_id
    LEFT JOIN programs p ON p.id = c.program_id
    LEFT JOIN teacher_assignments ta ON ta.class_id = c.id AND ta.academic_year_id = ay.id
    LEFT JOIN users u ON u.id = ta.teacher_id
    WHERE sp.parent_id = ${userId} 
      AND sp.is_active = TRUE 
      AND sp.deleted_at IS NULL
      AND sp.can_view_academic = TRUE
      AND s.deleted_at IS NULL
  `

  return rows.map((r: any) => ({
    student_id: normalizeStudentId(r.student_id)!,
    student_name: r.student_name,
    student_nickname: r.student_nickname,
    student_photo: r.student_photo,
    class_name: r.class_name,
    program_name: r.program_name,
    teacher_name: r.teacher_name,
  }))
}

// ---------------------------------------------------------
// Resolver Result States
// ---------------------------------------------------------
export type ContextResolutionResult = 
  | { status: 'NO_CHILDREN' }
  | { status: 'CHILD_REQUIRED', children: SafeChildDisplay[] }
  | { status: 'INVALID_CHILD' }
  | { status: 'FORBIDDEN_CHILD', children: SafeChildDisplay[] }
  | { status: 'AUTHORIZED', child: SafeChildDisplay, children: SafeChildDisplay[], childId: string }

/**
 * Resolves the explicit context state for a parent viewing a child-specific module.
 */
export async function resolveParentChildContext(params: {
  userId: number
  requestedChildId?: string | number | null
}): Promise<ContextResolutionResult> {
  
  const authorizedChildren = await getAuthorizedAcademicChildren(params.userId)

  if (authorizedChildren.length === 0) {
    return { status: 'NO_CHILDREN' }
  }

  // Auto-resolve for single child accounts
  if (authorizedChildren.length === 1 && !params.requestedChildId) {
    const singleChild = authorizedChildren[0]
    return { 
      status: 'AUTHORIZED', 
      child: singleChild, 
      children: authorizedChildren, 
      childId: singleChild.student_id 
    }
  }

  // Multiple children, but none requested
  if (!params.requestedChildId) {
    return { status: 'CHILD_REQUIRED', children: authorizedChildren }
  }

  const normalizedRequestedId = normalizeStudentId(params.requestedChildId)
  
  if (!normalizedRequestedId) {
    return { status: 'INVALID_CHILD' }
  }

  const activeChild = authorizedChildren.find(c => c.student_id === normalizedRequestedId)

  if (!activeChild) {
    return { status: 'FORBIDDEN_CHILD', children: authorizedChildren }
  }

  return {
    status: 'AUTHORIZED',
    child: activeChild,
    children: authorizedChildren,
    childId: activeChild.student_id
  }
}

/**
 * Helper to build deterministic URL strings while preserving `child_id`.
 */
export function buildParentChildHref(
  pathname: string, 
  childId: string, 
  currentSearchParams?: URLSearchParams
): string {
  const params = new URLSearchParams(currentSearchParams?.toString() || '')
  params.set('child_id', childId)
  return `${pathname}?${params.toString()}`
}
