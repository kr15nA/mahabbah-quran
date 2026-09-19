import { Edit, Trash2 } from 'lucide-react'
import { TasmiStatusBadge } from './TasmiStatusBadge'
import { TasmiTargetBadge } from './TasmiTargetBadge'
import type { TasmiHistoryRow } from '@/lib/tasmi/list'

interface TasmiHistoryTableProps {
  data: TasmiHistoryRow[]
  canManage: boolean
  onEdit?: (row: TasmiHistoryRow) => void
  onDelete?: (row: TasmiHistoryRow) => void
}

export function TasmiHistoryTable({ data, canManage, onEdit, onDelete }: TasmiHistoryTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-gray-500 bg-white rounded-2xl border border-gray-200 shadow-sm">
        Belum ada data Tasmi.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs whitespace-nowrap min-w-[800px]">
          <thead>
            <tr className="bg-[#F0EDF9] text-gray-500 font-bold border-b border-gray-200">
              <th className="p-3.5 px-4">Tanggal</th>
              <th className="p-3.5">Santri</th>
              <th className="p-3.5">Jenis</th>
              <th className="p-3.5">Target</th>
              <th className="p-3.5">Nilai</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5">Penguji</th>
              {canManage && <th className="p-3.5 px-4 text-right">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-800">
            {data.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50 transition-colors even:bg-gray-50/50 odd:bg-white">
                <td className="p-3.5 px-4 text-gray-500">
                  {new Date(r.session_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="p-3.5 font-bold text-gray-900">
                  {r.student_name}
                  {r.class_name && <div className="text-[10px] font-normal text-gray-500">{r.class_name}</div>}
                </td>
                <td className="p-3.5 font-medium text-gray-600">
                  {r.mode === 'SURAH' ? 'Tasmi Surat' : 'Tasmi Sekali Duduk'}
                </td>
                <td className="p-3.5">
                  <TasmiTargetBadge 
                    mode={r.mode} 
                    surahNameLatin={r.surah_name_latin} 
                    startJuz={r.start_juz} 
                    endJuz={r.end_juz} 
                  />
                </td>
                <td className="p-3.5 font-bold text-gray-900">
                  {r.score !== null ? r.score : <span className="text-gray-400 font-normal">-</span>}
                </td>
                <td className="p-3.5">
                  <TasmiStatusBadge status={r.status} />
                </td>
                <td className="p-3.5 text-gray-600">
                  {r.examiner_name}
                </td>
                {canManage && (
                  <td className="p-3.5 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => onEdit?.(r)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Tasmi"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onDelete?.(r)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Hapus Tasmi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
