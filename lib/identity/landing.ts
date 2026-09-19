import { UserContextMap, ContextIdentifier } from '@/lib/identity/contexts'

export type LandingResolution = {
  type: 'direct' | 'chooser' | 'forbidden'
  destination?: string
  context?: ContextIdentifier
}

export const CANONICAL_LANDINGS: Record<ContextIdentifier, string> = {
  admin: '/admin/dashboard',
  teacher: '/guru/dashboard',
  guardian: '/orang-tua/beranda',
  learner: '/santri',
}

/**
 * Pure function to resolve where a user should land upon login or visiting root (/).
 * Does NOT require DB queries, only the derived UserContextMap and an optional preference.
 */
export function resolveContextLanding({
  contexts,
  preferredContext,
}: {
  contexts: UserContextMap
  preferredContext?: string | null
}): LandingResolution {
  const available: ContextIdentifier[] = []
  if (contexts.admin) available.push('admin')
  if (contexts.teacher) available.push('teacher')
  if (contexts.guardian) available.push('guardian')
  if (contexts.learner) available.push('learner')

  // Zero contexts
  if (available.length === 0) {
    return { type: 'forbidden' }
  }

  // Exactly one context
  if (available.length === 1) {
    const singleContext = available[0]
    return {
      type: 'direct',
      context: singleContext,
      destination: CANONICAL_LANDINGS[singleContext],
    }
  }

  // Multiple contexts + valid preference
  if (preferredContext && available.includes(preferredContext as ContextIdentifier)) {
    return {
      type: 'direct',
      context: preferredContext as ContextIdentifier,
      destination: CANONICAL_LANDINGS[preferredContext as ContextIdentifier],
    }
  }

  // Multiple contexts + no/invalid preference
  return { type: 'chooser' }
}
