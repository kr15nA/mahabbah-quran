'use client'

import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import type { SafeChildDisplay } from '@/lib/guardians/parent-context'
import Image from 'next/image'

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
}

type ChildSwitcherProps = {
  childrenData: SafeChildDisplay[]
  activeChildId: string
}

export default function ChildSwitcher({ childrenData, activeChildId }: ChildSwitcherProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  if (childrenData.length <= 1) {
    return null // Auto-hide if there's only one child or no children
  }

  const handleChildSelect = (childId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('child_id', childId)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {childrenData.map(c => {
        const isActive = c.student_id === activeChildId
        return (
          <button
            key={c.student_id}
            onClick={() => handleChildSelect(c.student_id)}
            className={`whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${
              isActive ? 'bg-[#4B21A2] text-white border-[#4B21A2]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {c.student_photo ? (
              <div className="w-5 h-5 rounded-full overflow-hidden relative shrink-0">
                <Image src={c.student_photo} alt={c.student_name} fill className="object-cover" />
              </div>
            ) : (
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                isActive ? 'bg-[#FBBF24] text-[#18085A]' : 'bg-gray-100 text-gray-500'
              }`}>
                {getInitials(c.student_name)}
              </div>
            )}
            <span className="text-xs font-bold">{c.student_nickname || c.student_name}</span>
          </button>
        )
      })}
    </div>
  )
}
