'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, Lock, AlertCircle, CheckCircle2, LogOut } from 'lucide-react'
import { forceChangePasswordAction } from './actions'

interface Props {
  fullName: string
  role: string
  mustChangePassword: boolean
}

export default function UbahPasswordClient({ fullName, role, mustChangePassword }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await forceChangePasswordAction(formData)
      if (res.error) {
        setError(res.error)
      } else if (res.success) {
        setSuccess('Password berhasil diperbarui. Mengalihkan ke dashboard...')
        setTimeout(() => {
          router.push(res.redirect || '/auth/landing')
          router.refresh()
        }, 1200)
      }
    })
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch {
      router.push('/login')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8F9FC] via-[#F3E8FF]/30 to-[#F8F9FC] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-14 h-14 bg-[#4B21A2] text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-[#4B21A2]/20 mb-4">
          <KeyRound className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">
          {mustChangePassword ? 'Aktivasi Akun & Ubah Password' : 'Ganti Password Akun'}
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Selamat datang, <span className="font-bold text-gray-900">{fullName}</span> ({role})
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-xl shadow-gray-200/50 rounded-2xl border border-gray-100 sm:px-8">
          {mustChangePassword && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 leading-relaxed">
                <span className="font-bold block mb-1">Perhatian Keamanan:</span>
                Akun Anda dibuat menggunakan password sementara. Anda wajib membuat password baru sebelum dapat mengakses layanan Mahabbah Qur&apos;an.
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-700 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Password Saat Ini / Sementara
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  name="current_password"
                  required
                  placeholder="Masukkan password saat ini / sementara"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4B21A2]/20 focus:border-[#4B21A2] transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Password Baru (Minimal 8 Karakter)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  name="new_password"
                  required
                  minLength={8}
                  placeholder="Masukkan password baru"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4B21A2]/20 focus:border-[#4B21A2] transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Konfirmasi Password Baru
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  name="confirm_password"
                  required
                  minLength={8}
                  placeholder="Ketik ulang password baru"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4B21A2]/20 focus:border-[#4B21A2] transition"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3 px-4 bg-[#4B21A2] hover:bg-[#3d1a85] text-white font-bold rounded-xl shadow-md shadow-[#4B21A2]/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Memperbarui Password...</span>
                  </>
                ) : (
                  <span>Simpan & Lanjutkan ke Dashboard</span>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 flex justify-center">
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs font-semibold text-gray-500 hover:text-red-600 transition flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar dari Akun</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
