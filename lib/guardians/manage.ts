'use server'

import { requirePermission } from '@/lib/auth/rbac'
import {
  guardianInputSchema,
  GuardianCandidate,
  _searchGuardianCandidatesCore,
  _listStudentGuardiansCore,
  _createGuardianRelationshipCore,
  _reactivateGuardianRelationshipCore,
  _updateGuardianRelationshipCore,
  _deactivateGuardianRelationshipCore,
} from './internal/manage-core'
import { z } from 'zod'

/* =====================================================================
 * SERVER ACTIONS (With Authorization)
 * ===================================================================== */

export async function searchGuardianCandidates(query: string): Promise<GuardianCandidate[]> {
  await requirePermission('system.user.manage')
  return _searchGuardianCandidatesCore(query)
}

export async function listStudentGuardians(studentId: number) {
  await requirePermission('system.user.manage')
  return _listStudentGuardiansCore(studentId)
}

export async function createGuardianRelationship(input: z.infer<typeof guardianInputSchema>) {
  const { session } = await requirePermission('system.user.manage')
  return _createGuardianRelationshipCore(session.userId, input)
}

export async function reactivateGuardianRelationship(input: z.infer<typeof guardianInputSchema>) {
  const { session } = await requirePermission('system.user.manage')
  return _reactivateGuardianRelationshipCore(session.userId, input)
}

export async function updateGuardianRelationship(id: number, input: Omit<z.infer<typeof guardianInputSchema>, 'studentId' | 'parentId'>) {
  const { session } = await requirePermission('system.user.manage')
  return _updateGuardianRelationshipCore(session.userId, id, input)
}

export async function deactivateGuardianRelationship(id: number) {
  const { session } = await requirePermission('system.user.manage')
  return _deactivateGuardianRelationshipCore(session.userId, id)
}
