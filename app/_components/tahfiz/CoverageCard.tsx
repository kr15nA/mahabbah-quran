import { BookOpen } from 'lucide-react'

export function CoverageCard({ coverage }: { coverage: any }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-indigo-600" />
          </div>
          <h3 className="font-bold text-gray-900">Capaian Hafalan</h3>
        </div>
      </div>
      <div className="p-4 max-h-[300px] overflow-y-auto">
        {coverage && coverage.length > 0 ? (
          <div className="space-y-3">
            {coverage.map((c: any, i: number) => {
              const isFull = (c.ayahEnd - c.ayahStart + 1) === c.totalAyahs
              return (
                <div key={i} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                  <span className="font-medium text-gray-800">{c.surahNameLatin}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Ayat {c.ayahStart}-{c.ayahEnd}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isFull ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {isFull ? 'Selesai' : 'Sebagian'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-gray-500">
            Belum ada capaian hafalan tercatat.
          </div>
        )}
      </div>
    </div>
  )
}
