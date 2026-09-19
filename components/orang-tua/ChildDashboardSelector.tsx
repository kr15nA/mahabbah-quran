import Link from 'next/link'
import Image from 'next/image'
import { SafeChildDisplay, buildParentChildHref } from '@/lib/guardians/parent-context'

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
}

export function ChildDashboardSelector({ 
  childrenList, 
  selectedChildId 
}: { 
  childrenList: SafeChildDisplay[]
  selectedChildId: string
}) {
  if (childrenList.length <= 1) return null

  return (
    <div className="w-full">
      <h2 className="text-sm font-bold text-gray-900 mb-3 px-1">Pilih Santri</h2>
      <div className="flex flex-row overflow-x-auto gap-3 pb-4 snap-x hide-scrollbar px-1">
        {childrenList.map((child) => {
          const isSelected = child.student_id === selectedChildId
          const href = buildParentChildHref('/orang-tua/beranda', child.student_id)
          
          return (
            <Link 
              key={child.student_id}
              href={href}
              className={`
                snap-start flex items-center gap-3 p-2.5 pr-4 rounded-xl border-2 transition-all min-w-[200px] max-w-[280px] shrink-0
                ${isSelected 
                  ? 'border-[#4B21A2] bg-[#F0EDF9] shadow-sm' 
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              {child.student_photo ? (
                <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden relative flex-shrink-0 shadow-sm">
                  <Image src={child.student_photo} alt={child.student_name} fill className="object-cover" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#FBBF24] text-[#18085A] font-bold text-sm flex items-center justify-center border-2 border-white flex-shrink-0 shadow-sm">
                  {getInitials(child.student_name)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className={`font-bold text-sm truncate ${isSelected ? 'text-[#18085A]' : 'text-gray-900'}`}>
                  {child.student_nickname || child.student_name.split(' ')[0]}
                </div>
                <div className="text-xs text-gray-500 truncate mt-0.5">
                  {child.class_name || 'Tanpa Kelas'}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  )
}
