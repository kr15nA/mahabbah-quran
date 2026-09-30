import { Bookmark } from 'lucide-react'

export function SantriHistorySkeleton({ title, icon: Icon = Bookmark }: { title: string, icon?: any }) {
  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 animate-pulse">
      <div>
        <div className="flex items-center gap-2">
          <Icon className="w-6 h-6 text-gray-300" />
          <div className="h-8 bg-gray-200 rounded w-48"></div>
        </div>
        <div className="h-4 bg-gray-200 rounded w-64 mt-2"></div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-3 w-full sm:w-2/3">
                <div className="flex items-center gap-2">
                  <div className="h-6 bg-gray-200 rounded w-32"></div>
                  <div className="h-4 bg-gray-100 rounded w-20"></div>
                </div>
                <div className="h-4 bg-gray-100 rounded w-40"></div>
                <div className="h-3 bg-gray-100 rounded w-48"></div>
              </div>
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 w-full sm:w-1/3">
                <div className="h-6 bg-gray-200 rounded-md w-24"></div>
                <div className="h-8 bg-gray-200 rounded w-12 mt-1"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
