export function SantriDashboardSkeleton() {
  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 animate-pulse">
      <div>
        <div className="h-8 bg-gray-200 rounded w-64"></div>
        <div className="h-4 bg-gray-200 rounded w-48 mt-2"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Identity Card Skeleton */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
              <div className="w-5 h-5 bg-gray-200 rounded-full"></div>
              <div className="h-6 bg-gray-200 rounded w-32"></div>
            </div>
            <div className="space-y-5">
              <div>
                <div className="h-3 bg-gray-100 rounded w-24 mb-2"></div>
                <div className="h-5 bg-gray-200 rounded w-48"></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="h-3 bg-gray-100 rounded w-16 mb-2"></div>
                  <div className="h-5 bg-gray-200 rounded w-24"></div>
                </div>
                <div>
                  <div className="h-3 bg-gray-100 rounded w-16 mb-2"></div>
                  <div className="h-5 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
            <div className="h-3 bg-gray-100 rounded w-12"></div>
            <div className="h-6 bg-gray-200 rounded-md w-16"></div>
          </div>
        </div>

        {/* Teacher & Scholarship Summary Skeleton */}
        <div className="space-y-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-5 h-5 bg-gray-200 rounded-full"></div>
                <div className="h-6 bg-gray-200 rounded w-40"></div>
              </div>
              <div>
                <div className="h-5 bg-gray-200 rounded w-48 mb-2"></div>
                <div className="h-4 bg-gray-100 rounded w-32"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Academic Summaries Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between h-40">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 bg-gray-200 rounded-full"></div>
                <div className="h-5 bg-gray-200 rounded w-24"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
              <div className="h-3 bg-gray-100 rounded w-20"></div>
            </div>
            <div className="mt-4 flex items-center gap-1">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
