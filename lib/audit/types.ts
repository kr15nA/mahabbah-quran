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
} as const

export type AuditEntityType = typeof AuditEntityType[keyof typeof AuditEntityType]
