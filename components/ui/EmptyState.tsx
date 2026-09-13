import { SearchX } from 'lucide-react'

type EmptyStateProps = {
  title?: string
  description?: string
}

export default function EmptyState({ 
  title = 'Tidak Ada Data', 
  description = 'Belum ada data yang dapat ditampilkan untuk saat ini.' 
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center" role="status">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-4">
        <SearchX className="h-6 w-6 text-gray-400" />
      </div>
      <h3 className="text-sm font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-xs text-gray-500 max-w-sm">{description}</p>
    </div>
  )
}
