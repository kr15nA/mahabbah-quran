import { Target } from 'lucide-react'

export function TargetCard({ target, targetProgress }: { target: any, targetProgress: any }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-blue-50/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <Target className="w-4 h-4 text-blue-600" />
          </div>
          <h3 className="font-bold text-gray-900">Target Saat Ini</h3>
        </div>
      </div>
      <div className="p-4 flex-1">
        {target ? (
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-500 mb-1">Mulai</p>
                <p className="font-medium text-sm">{target.startSurahName} : {target.startAyah}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">Selesai</p>
                <p className="font-medium text-sm">{target.endSurahName} : {target.endAyah}</p>
              </div>
            </div>
            
            {targetProgress && (
              <div className="pt-2 border-t border-gray-100">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-gray-500">Progress</span>
                  <span className="text-xs font-bold text-blue-600">
                    {targetProgress.percentage}%
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${Math.min(targetProgress.percentage, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  {targetProgress.completedAyahs} dari {targetProgress.totalAyahsTarget} ayat disetorkan
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-gray-500">
            Belum ada target hafalan aktif.
          </div>
        )}
      </div>
    </div>
  )
}
