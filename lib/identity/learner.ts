/**
 * lib/identity/learner.ts
 *
 * Canonical self-learner identity helpers.
 *
 * PHASE A — MULTI-CONTEXT-IDENTITY-001
 *
 * A user linked to a Student profile (via students.user_id) is identified
 * as that learner. This linkage is:
 *   - Explicit (admin-managed, no auto-link)
 *   - 1-to-1 (enforced by UNIQUE constraint on students.user_id)
 *   - Independent of legacy users.role
 *   - Independent of active enrollment
 *
 * IMPORTANT: Self-learner identity does NOT authorize formal academic
 * mutations against the self-linked Student. The assertNotSelfAssessment()
 * guard is a Phase B concern, documented in the audit but not yet implemented.
 */

import { db } from '@/lib/db/client'
import { students } from '@/drizzle/schema'
import { eq, isNull, and } from 'drizzle-orm'
import { normalizeStudentId } from '@/lib/guardians/parent-context'

// ---------------------------------------------------------------------------
// Public Types
// ---------------------------------------------------------------------------

/**
 * Safe external representation of a self-learner Student profile.
 * `id` is a canonical decimal string (not a raw number) for consistent
 * handling across API boundaries. Never scatter Number() conversions from
 * this type — use studentIdToDbNumber() at DB boundaries only.
 */
export type SelfLearnerProfile = {
  id: string        // canonical decimal string
  fullName: string
  status: string
}

// ---------------------------------------------------------------------------
// Query Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the Student profile linked to this user as a self-learner.
 *
 * Rules:
 *   - students.user_id = userId
 *   - students.deleted_at IS NULL
 *   - Active enrollment is NOT required (identity ≠ enrollment)
 *
 * Returns null if no self-learner profile exists or if the linked Student
 * has been soft-deleted.
 */
export async function getSelfStudentProfile(userId: number): Promise<SelfLearnerProfile | null> {
  const rows = await db
    .select({ id: students.id, fullName: students.fullName, status: students.status })
    .from(students)
    .where(
      and(
        eq(students.userId, userId),
        isNull(students.deletedAt),
      )
    )
    .limit(1)

  if (rows.length === 0) return null

  const row = rows[0]
  const canonicalId = normalizeStudentId(row.id)
  if (!canonicalId) return null

  return {
    id: canonicalId,
    fullName: row.fullName,
    status: row.status,
  }
}

/**
 * Like getSelfStudentProfile but throws a structured error if no
 * active self-learner profile is found.
 *
 * Use this in learner-portal server actions where a missing profile
 * is a hard authorization failure.
 *
 * Throws Error('NO_LEARNER_PROFILE: ...')
 */
export async function requireSelfStudentProfile(userId: number): Promise<SelfLearnerProfile> {
  const profile = await getSelfStudentProfile(userId)
  if (!profile) {
    throw new Error('NO_LEARNER_PROFILE: User has no active self-learner Student profile.')
  }
  return profile
}

/**
 * Returns true if the user has an active (non-deleted) self-learner
 * Student profile, regardless of enrollment status.
 *
 * Active enrollment is deliberately NOT required. Identity and enrollment
 * are separate lifecycle concerns. A learner between enrollments still
 * has a learner identity. The learner portal should show "Belum ada
 * program aktif" if enrollment is absent, rather than hiding the context.
 *
 * Uses EXISTS pattern (LIMIT 1) — O(1) regardless of student count.
 */
export async function hasLearnerContext(userId: number): Promise<boolean> {
  const rows = await db
    .select({ id: students.id })
    .from(students)
    .where(
      and(
        eq(students.userId, userId),
        isNull(students.deletedAt),
      )
    )
    .limit(1)

  return rows.length > 0
}
