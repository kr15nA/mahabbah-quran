/**
 * Audit Log — typed constants for action and entity types.
 *
 * server-only — do not import in client components.
 */

/** Actions that can be audited. */
export const AuditAction = {
  CREATE:      'CREATE',
  UPDATE:      'UPDATE',
  DELETE:      'DELETE',
  ARCHIVE:     'ARCHIVE',
  ACTIVATE:    'ACTIVATE',
  DEACTIVATE:  'DEACTIVATE',
  ASSIGN:      'ASSIGN',
  UNASSIGN:    'UNASSIGN',
  GUARDIAN_RELATIONSHIP_CREATED: 'GUARDIAN_RELATIONSHIP_CREATED',
  GUARDIAN_RELATIONSHIP_UPDATED: 'GUARDIAN_RELATIONSHIP_UPDATED',
  GUARDIAN_DEACTIVATED: 'GUARDIAN_DEACTIVATED',
  GUARDIAN_REACTIVATED: 'GUARDIAN_REACTIVATED',
  STUDENT_USER_LINK: 'STUDENT_USER_LINK',
  STUDENT_USER_UNLINK: 'STUDENT_USER_UNLINK',
  STUDENT_USER_RELINK: 'STUDENT_USER_RELINK',
} as const

export type AuditAction = typeof AuditAction[keyof typeof AuditAction]

/** Entity types that can be audited. */
export const AuditEntityType = {
  USER:               'USER',
  STUDENT:            'STUDENT',
  PROGRAM:            'PROGRAM',
  CLASS:              'CLASS',
  ACADEMIC_YEAR:      'ACADEMIC_YEAR',
  ENROLLMENT:         'ENROLLMENT',
  TEACHER_ASSIGNMENT: 'TEACHER_ASSIGNMENT',
  student_parents:    'student_parents',
} as const

export type AuditEntityType = typeof AuditEntityType[keyof typeof AuditEntityType]
