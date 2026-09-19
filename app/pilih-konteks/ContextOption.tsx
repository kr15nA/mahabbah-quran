'use client'

import { setLastContextAndRedirect } from './actions'
import { useTransition } from 'react'
import { ContextIdentifier } from '@/lib/identity/contexts'

export function ContextOption({
  contextId,
  label,
  colorClass,
}: {
  contextId: ContextIdentifier
  label: string
  colorClass: string
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      className={`w-full text-left px-4 h-14 text-lg font-medium rounded-lg transition-colors focus:outline-none focus:ring disabled:opacity-50 ${colorClass}`}
      disabled={isPending}
      onClick={() => {
        startTransition(() => {
          setLastContextAndRedirect(contextId)
        })
      }}
    >
      {label}
    </button>
  )
}
