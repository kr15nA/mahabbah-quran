import Link from 'next/link'

export default function ForbiddenPage() {
  return (
    <div className="flex h-screen w-full items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-red-600">Akses Ditolak</h2>
        </div>
        <div className="space-y-4 text-center">
          <p className="text-gray-500">
            Akun Anda belum memiliki akses portal aktif. Silakan hubungi administrator.
          </p>
          <div className="pt-4">
            <Link href="/login" className="inline-flex items-center justify-center w-full px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors">
              Kembali ke Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
