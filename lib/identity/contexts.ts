/**
 * lib/identity/contexts.ts
 *
 * Available-context discovery for authenticated users.
 *
 * PHASE A — MULTI-CONTEXT-IDENTITY-001
 *
 * This module determines WHICH portals are available to a given user.
 * It is NOT yet wired into JWT, session, middleware, or login redirect.
 * Those integrations are Phase C.
 *
 * Portal eligibility is derived from:
 *   - Admin:    legacy users.role === 'admin' (transitional — Phase C migrates to permission-based)
 *   - Teacher:  >= 1 active teacher_assignment for an active academic year
 *   - Guardian: >= 1 active, non-deleted student_parents row
 *   - Learner:  students.user_id = userId AND deleted_at IS NULL
 *
 * IMPORTANT CONSTRAINTS:
 *   - Does NOT return guardian child IDs or teacher student IDs
 *   - Does NOT union scopes across portals
 *   - Does NOT modify any existing portal behavior
 *   - Is NOT authority for route access — route namespace remains authoritative
 *   - Uses bounded queries only (EXISTS / LIMIT 1) — O(1) query count
 */

import { db } from '@/lib/db/client'
import { teacherAssignments, academicYears, studentParents } from '@/drizzle/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { type SessionPayload } from '@/lib/auth/session'
import { getSelfStudentProfile } from '@/lib/identity/learner'

// ---------------------------------------------------------------------------
// Public Types
// ---------------------------------------------------------------------------

/**
 * Which portals are available for a given authenticated user.
 *
 * selfStudentId is present and non-null only when learner = true.
 * It is a canonical decimal string — never a raw number.
 *
 * This map deliberately does NOT contain:
 *   - guardian child IDs (queried per-page by guardian portal)
 *   - teacher student IDs (queried per-page by teacher portal)
 *   - class lists or permission details
 */
export type UserContextMap = {
  admin: boolean
  teacher: boolean
  guardian: boolean
  learner: boolean
  selfStudentId?: string
}

// ---------------------------------------------------------------------------
// Context Eligibility Helpers
// ---------------------------------------------------------------------------

/**
 * Admin context exists when the session carries the legacy 'admin' role.
 *
 * TRANSITIONAL: This derives from users.role because that is the current
 * source of truth for administrative access. Phase C will migrate this
 * to a permission-based check (e.g. system.admin.access) once the session
 * and routing are decoupled from the legacy role field.
 *
 * This function deliberately does NOT expand who can access /admin.
 */
export function hasAdminContext(session: SessionPayload): boolean {
  return session.role === 'admin'
}

/**
 * Teacher context exists when the user has at least one active
 * teacher_assignment for an active academic year.
 *
 * This is relationship-based, not legacy-role-based. A user with
 * users.role = 'guru' but no teacher assignments does NOT have teacher context.
 * Conversely, this future-proofs the model for when roles are decoupled.
 *
 * Uses LIMIT 1 (EXISTS pattern) — O(1) regardless of assignment count.
 */
export async function hasTeacherContext(userId: number): Promise<boolean> {
  const rows = await db
    .select({ id: teacherAssignments.id })
    .from(teacherAssignments)
    .innerJoin(
      academicYears,
      and(
        eq(academicYears.id, teacherAssignments.academicYearId),
        eq(academicYears.isActive, true)
      )
    )
    .where(
      and(
        eq(teacherAssignments.teacherId, userId),
        eq(teacherAssignments.status, 'active')
      )
    )
    .limit(1)

  return rows.length > 0
}

/**
 * Guardian context exists when the user has at least one active,
 * non-deleted student_parents row.
 *
 * Per-capability flags (canViewAcademic, canViewFinance, etc.) govern
 * individual resource access within the guardian portal, but are NOT
 * required to establish context eligibility.
 *
 * Reuses released guardian helper — preserves existing behavior exactly.
 */
export async function hasGuardianContext(userId: number): Promise<boolean> {
  const rows = await db
    .select({ id: studentParents.id })
    .from(studentParents)
    .where(
      and(
        eq(studentParents.parentId, userId),
        eq(studentParents.isActive, true),
        isNull(studentParents.deletedAt)
      )
    )
    .limit(1)

  return rows.length > 0
}

// ---------------------------------------------------------------------------
// Composite Context Discovery
// ---------------------------------------------------------------------------

/**
 * Determines which portals are available for an authenticated user.
 *
 * Query profile (bounded, no N+1):
 *   1. Admin:    O(1) — derives from session.role (no DB query)
 *   2. Teacher:  1 query — EXISTS on teacher_assignments + active academic year
 *   3. Guardian: 1 query — active student_parents rows
 *   4. Learner:  1 query — students.user_id match (non-deleted)
 *   5. selfStudentId: 1 query — if learner = true (same row reused)
 *
 * Total: max 4 DB queries. Fixed overhead, not proportional to relationship count.
 *
 * NOTE: This helper is NOT yet wired into JWT, session, middleware, or
 * login redirect. It is infrastructure for Phase C. Calling it has no
 * effect on existing portal behavior.
 */
export async function getAvailableUserContexts(
  session: SessionPayload
): Promise<UserContextMap> {
  const userId = session.userId

  // Admin: O(1), derived from session (no DB query)
  const admin = hasAdminContext(session)

  // Teacher: 1 query (EXISTS pattern)
  const teacher = await hasTeacherContext(userId)

  // Guardian: 1 query (EXISTS pattern via released guardian helper)
  const guardian = await hasGuardianContext(userId)

  // Learner + selfStudentId: 1 query via getSelfStudentProfile
  const selfProfile = await getSelfStudentProfile(userId)
  const learner = selfProfile !== null

  return {
    admin,
    teacher,
    guardian,
    learner,
    ...(selfProfile ? { selfStudentId: selfProfile.id } : {}),
  }
}
