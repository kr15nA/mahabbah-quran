import { Award, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export function TasmiCard({ tasmiAchievements, detailLink }: { tasmiAchievements: any, detailLink?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-emerald-50/50 justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <h3 className="font-bold text-gray-900">Pencapaian Tasmi</h3>
        </div>
      </div>
      <div className="divide-y divide-gray-50">
        {tasmiAchievements && tasmiAchievements.length > 0 ? (
          <>
            {tasmiAchievements.map((t: any) => (
              <div key={t.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-gray-900">
                    {t.mode === 'SURAH' ? (t.surahName || t.surahNameLatin) : `Juz ${t.startJuz}${t.endJuz > t.startJuz ? `-${t.endJuz}` : ''}`}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {t.status === 'PASSED' ? (
                      <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        Lulus
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-orange-100 text-orange-700 rounded-md font-medium">
                        <AlertCircle className="w-3 h-3" />
                        Perlu Ditinjau
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400">{t.date || new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(t.sessionDate))}</span>
                  </div>
                </div>
                {t.score !== null && t.score !== undefined && (
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-gray-400 mb-1">Nilai</span>
                    <span className={`text-sm font-bold bg-gray-50 px-2 py-1 rounded-md border ${t.status === 'PASSED' ? 'text-emerald-700 border-emerald-100' : 'text-orange-700 border-orange-100'}`}>
                      {t.score}
                    </span>
                  </div>
                )}
              </div>
            ))}
            {detailLink && (
              <div className="p-3 bg-gray-50/50 text-center border-t border-gray-100">
                <Link href={detailLink} className="text-xs font-medium text-emerald-600 hover:text-emerald-800 flex items-center justify-center gap-1">
                  Lihat semua Tasmi <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-sm text-gray-500">
            Belum ada riwayat Tasmi.
          </div>
        )}
      </div>
    </div>
  )
}
