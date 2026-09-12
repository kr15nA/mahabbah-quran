'use client'

import { useState, useRef, useTransition } from 'react'
import { User, Key, Save, Camera, Upload, CheckCircle2, AlertCircle } from 'lucide-react'
import { updateProfile, changePassword } from './actions'

type UserData = {
  id: number
  full_name: string
  email: string
  phone: string
  avatar_url: string
}

export default function AccountClient({ user }: { user: UserData }) {
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile')
  const [isPending, startTransition] = useTransition()
  
  // Profile state
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profileMsg, setProfileMsg] = useState<{type: 'success'|'error', text: string} | null>(null)
  const [passwordMsg, setPasswordMsg] = useState<{type: 'success'|'error', text: string} | null>(null)

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setProfileMsg(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('entityType', 'users')
      formData.append('entityId', user.id.toString())
      if (user.avatar_url) formData.append('oldUrl', user.avatar_url)
      
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok) {
        setAvatarUrl(data.url)
      } else {
        setProfileMsg({ type: 'error', text: data.error || 'Gagal mengupload foto' })
      }
    } catch (err) {
      setProfileMsg({ type: 'error', text: 'Terjadi kesalahan saat upload' })
    } finally {
      setUploading(false)
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setProfileMsg(null)
    const formData = new FormData(e.currentTarget)
    formData.append('avatar_url', avatarUrl)

    startTransition(async () => {
      const res = await updateProfile(formData)
      if (res.error) {
        setProfileMsg({ type: 'error', text: res.error })
      } else {
        setProfileMsg({ type: 'success', text: 'Profil berhasil diperbarui' })
      }
    })
  }

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPasswordMsg(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const res = await changePassword(formData)
      if (res.error) {
        setPasswordMsg({ type: 'error', text: res.error })
      } else {
        setPasswordMsg({ type: 'success', text: 'Password berhasil diubah' })
        ;(e.target as HTMLFormElement).reset()
      }
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden text-xs relative">
      {isPending && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-50 flex justify-center items-start pt-20">
          <div className="w-6 h-6 border-2 border-[#4B21A2] border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-6 py-4 font-semibold transition ${
            activeTab === 'profile' ? 'text-[#4B21A2] border-b-2 border-[#4B21A2]' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <User className="w-4 h-4" /> Informasi Profil
        </button>
        <button 
          onClick={() => setActiveTab('password')}
          className={`flex items-center gap-2 px-6 py-4 font-semibold transition ${
            activeTab === 'password' ? 'text-[#4B21A2] border-b-2 border-[#4B21A2]' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Key className="w-4 h-4" /> Keamanan Akun
        </button>
      </div>

      <div className="p-6">
        {activeTab === 'profile' && (
          <form onSubmit={handleProfileSubmit} className="space-y-6">
            {profileMsg && (
              <div className={`p-3 rounded-xl flex items-center gap-2 ${profileMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {profileMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {profileMsg.text}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="flex flex-col items-center gap-3">
                <div className="w-24 h-24 rounded-full bg-gray-100 overflow-hidden relative border border-gray-200 flex items-center justify-center text-gray-400">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10" />
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-[#4B21A2] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleAvatarUpload}
                />
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600 hover:text-[#4B21A2] disabled:opacity-50"
                >
                  <Camera className="w-3.5 h-3.5" /> Ubah Foto
                </button>
              </div>

              <div className="flex-1 space-y-4 w-full">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Nama Lengkap *</label>
                  <input
                    name="full_name"
                    defaultValue={user.full_name}
                    required
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#4B21A2]/20 focus:border-[#4B21A2]"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Email</label>
                    <input
                      name="email"
                      type="email"
                      defaultValue={user.email}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#4B21A2]/20 focus:border-[#4B21A2]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">No. WhatsApp</label>
                    <input
                      name="phone"
                      type="tel"
                      defaultValue={user.phone}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#4B21A2]/20 focus:border-[#4B21A2]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                disabled={isPending || uploading}
                type="submit" 
                className="flex items-center gap-2 bg-[#4B21A2] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm hover:bg-[#3d1a85] transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> Simpan Profil
              </button>
            </div>
          </form>
        )}

        {activeTab === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-sm">
            {passwordMsg && (
              <div className={`p-3 rounded-xl flex items-center gap-2 mb-4 ${passwordMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {passwordMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {passwordMsg.text}
              </div>
            )}

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Password Saat Ini</label>
              <input
                name="current_password"
                type="password"
                required
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#4B21A2]/20 focus:border-[#4B21A2]"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Password Baru</label>
              <input
                name="new_password"
                type="password"
                required
                minLength={8}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#4B21A2]/20 focus:border-[#4B21A2]"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Konfirmasi Password Baru</label>
              <input
                name="confirm_password"
                type="password"
                required
                minLength={8}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#4B21A2]/20 focus:border-[#4B21A2]"
              />
            </div>

            <div className="pt-2">
              <button 
                disabled={isPending}
                type="submit" 
                className="flex items-center justify-center w-full gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm hover:bg-gray-800 transition disabled:opacity-50"
              >
                <Key className="w-4 h-4" /> Perbarui Password
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
