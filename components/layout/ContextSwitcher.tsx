'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { setLastContextAndRedirect } from '@/app/pilih-konteks/actions'
import { ContextIdentifier } from '@/lib/identity/contexts'

type Props = {
  currentContext: ContextIdentifier
  availableContexts: {
    admin: boolean
    teacher: boolean
    guardian: boolean
    learner: boolean
  }
}

export function ContextSwitcher({ currentContext, availableContexts }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const options = [
    { id: 'admin', label: 'Admin', show: availableContexts.admin },
    { id: 'teacher', label: 'Guru', show: availableContexts.teacher },
    { id: 'guardian', label: 'Orang Tua', show: availableContexts.guardian },
    { id: 'learner', label: 'Santri', show: availableContexts.learner },
  ].filter((o) => o.show)

  if (options.length <= 1) {
    return null
  }

  return (
    <div className="relative inline-block">
      <select
        className="appearance-none bg-white border border-gray-300 hover:border-gray-400 px-4 py-2 pr-8 rounded leading-tight focus:outline-none focus:ring text-sm font-medium disabled:opacity-50"
        value={currentContext}
        disabled={isPending}
        onChange={(e) => {
          const selected = e.target.value as ContextIdentifier
          startTransition(() => {
            setLastContextAndRedirect(selected)
          })
        }}
      >
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
        </svg>
      </div>
    </div>
  )
}
