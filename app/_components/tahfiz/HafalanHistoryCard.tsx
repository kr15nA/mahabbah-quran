import { Bookmark, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export function HafalanHistoryCard({ hafalanHistory, detailLink }: { hafalanHistory: any, detailLink?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-emerald-500" />
          <h3 className="font-bold text-gray-900">Aktivitas Hafalan Terbaru</h3>
        </div>
      </div>
      <div className="divide-y divide-gray-50">
        {hafalanHistory && hafalanHistory.length > 0 ? (
          <>
            {hafalanHistory.map((h: any) => (
              <div key={h.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-gray-900">{h.surahName || h.surah_name_latin}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Ayat {h.startAyah || h.ayah_start} - {h.endAyah || h.ayah_end}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${
                      h.type === 'hafalan_baru' 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {h.type === 'hafalan_baru' ? 'Hafalan Baru' : 'Murajaah'}
                    </span>
                    <span className="text-[10px] text-gray-400">{h.date || new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(h.session_date))}</span>
                  </div>
                </div>
                {h.score !== null && h.score !== undefined && (
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-gray-400 mb-1">Nilai</span>
                    <span className="text-sm font-bold text-gray-700 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">{h.score}</span>
                  </div>
                )}
              </div>
            ))}
            {detailLink && (
              <div className="p-3 bg-gray-50/50 text-center border-t border-gray-100">
                <Link href={detailLink} className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1">
                  Lihat semua hafalan <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-sm text-gray-500">
            Belum ada catatan hafalan.
          </div>
        )}
      </div>
    </div>
  )
}
