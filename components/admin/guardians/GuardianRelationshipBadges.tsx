import React from 'react'

type GuardianRelationshipBadgesProps = {
  isPrimary: boolean
  canViewAcademic: boolean
  canViewFinance: boolean
  isActive: boolean
}

export default function GuardianRelationshipBadges({
  isPrimary,
  canViewAcademic,
  canViewFinance,
  isActive
}: GuardianRelationshipBadgesProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[10px]">
      {/* Primary Badge */}
      {isPrimary && (
        <span 
          className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full"
          title="Wali Utama"
        >
          Wali Utama
        </span>
      )}
      
      {/* Status Badge */}
      <span 
        className={`${isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'} font-bold px-2 py-0.5 rounded-full`}
        title={isActive ? 'Status Relasi Aktif' : 'Status Relasi Nonaktif'}
      >
        {isActive ? 'Aktif' : 'Nonaktif'}
      </span>

      {/* Academic Access */}
      <div 
        className="flex items-center gap-1 border rounded px-1.5 py-0.5 border-gray-200 bg-gray-50 text-gray-700 font-medium"
        title={canViewAcademic ? 'Memiliki akses Akademik' : 'Tidak memiliki akses Akademik'}
      >
        <span className="text-gray-500">Akademik:</span>
        <span className={canViewAcademic ? 'text-green-600 font-bold' : 'text-red-500'}>
          {canViewAcademic ? 'Ya' : 'Tidak'}
        </span>
      </div>

      {/* Finance Access */}
      <div 
        className="flex items-center gap-1 border rounded px-1.5 py-0.5 border-gray-200 bg-gray-50 text-gray-700 font-medium"
        title={canViewFinance ? 'Memiliki akses Keuangan' : 'Tidak memiliki akses Keuangan'}
      >
        <span className="text-gray-500">Keuangan:</span>
        <span className={canViewFinance ? 'text-green-600 font-bold' : 'text-red-500'}>
          {canViewFinance ? 'Ya' : 'Tidak'}
        </span>
      </div>
    </div>
  )
}
