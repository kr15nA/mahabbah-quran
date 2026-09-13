'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Lock, Mail, ArrowRight, CheckCircle2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [roleTab, setRoleTab] = useState<'admin' | 'guru' | 'orang_tua'>('admin')
  const [identifier, setIdentifier] = useState('admin@mahabbahquran.id')
  const [password, setPassword] = useState('Password123!')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRoleTabChange = (role: 'admin' | 'guru' | 'orang_tua') => {
    setRoleTab(role)
    setError('')
    if (role === 'admin') {
      setIdentifier('admin@mahabbahquran.id')
    } else if (role === 'guru') {
      setIdentifier('aldi.solihin@mahabbahquran.id')
    } else {
      setIdentifier('hendra.wijaya@gmail.com')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Gagal masuk')
      }

      router.push(data.redirect)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F0EDF9] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        {/* Header Branding */}
        <div className="bg-[#18085A] p-8 text-center text-white relative">
          <div className="flex items-center justify-center mx-auto mb-3">
            <img src="/icon.png" alt="Mahabbah Qur'an Logo" className="w-16 h-16 object-contain drop-shadow-md" />
          </div>
          <h1 className="text-xl font-extrabold tracking-wider">MAHABBAH QUR'AN</h1>
          <p className="text-xs text-[#FBBF24] font-bold tracking-widest mt-0.5">YAYASAN RUMAH TAHFIZH</p>
          <p className="text-xs text-gray-300 mt-2">Sistem Informasi & Laporan Pembelajaran Santri</p>
        </div>

        {/* Role Toggle Tabs */}
        <div className="p-6 pb-2">
          <div className="grid grid-cols-3 gap-1 bg-[#F0EDF9] p-1 rounded-xl">
            {(['admin', 'guru', 'orang_tua'] as const).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => handleRoleTabChange(role)}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  roleTab === role
                    ? 'bg-[#4B21A2] text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {role === 'admin' ? 'Admin' : role === 'guru' ? 'Guru' : 'Orang Tua'}
              </button>
            ))}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 pt-2 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Email / No. HP</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-[#FAFAFA] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4B21A2]"
                placeholder="nama@email.com atau 0812..."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-[#FAFAFA] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4B21A2]"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#4B21A2] hover:bg-[#3a1880] text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50"
          >
            {loading ? 'Memproses...' : 'Masuk ke Akun'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {/* Demo Credentials Helper Box */}
        <div className="px-6 pb-6 pt-2">
          <div className="bg-[#EDE9FE] border border-[#7B4BD6]/30 p-3 rounded-xl text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-[#4B21A2] font-bold">
              <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
              Akun Uji Coba Default:
            </div>
            <p className="text-gray-700">
              <span className="font-semibold">Email:</span> {identifier}
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">Password:</span> Password123!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
