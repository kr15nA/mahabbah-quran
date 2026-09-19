'use client'

import { useState, useRef, useTransition } from 'react'
import { User, Key, Save, Camera, CheckCircle2, AlertCircle, Shield, Link as LinkIcon } from 'lucide-react'
import { updateMyProfile, changeMyPassword, updateMyAvatar, removeMyAvatar } from '@/lib/profile/actions'
import { ProfileAvatar } from '@/components/ui/ProfileAvatar'

export type ProfileData = {
  id: number
  full_name: string
  email: string
  phone: string
  avatar_url: string
  
  // Access Context
  legacy_role: string
  dynamic_roles: string[]
  permissions: string[]
  
  // Linked Context
  is_guru: boolean
  is_parent: boolean
  class_count?: number
  student_count?: number
}

export default function UnifiedAccountClient({ data }: { data: ProfileData }) {
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'access' | 'linked'>('profile')
  const [isPending, startTransition] = useTransition()
  
  // Profile state
  const [avatarUrl, setAvatarUrl] = useState(data.avatar_url)
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
      
      startTransition(async () => {
        const res = await updateMyAvatar(formData)
        if (res.error) {
          setProfileMsg({ type: 'error', text: res.error })
        } else {
          setProfileMsg({ type: 'success', text: 'Foto profil berhasil diperbarui.' })
          const objUrl = URL.createObjectURL(file)
          setAvatarUrl(objUrl)
        }
        setUploading(false)
      })
    } catch (err) {
      setProfileMsg({ type: 'error', text: 'Terjadi kesalahan saat upload' })
      setUploading(false)
    }
  }

  const handleAvatarRemove = async () => {
    if (!confirm('Hapus foto profil?')) return
    setUploading(true)
    setProfileMsg(null)
    startTransition(async () => {
      const res = await removeMyAvatar()
      if (res.error) {
        setProfileMsg({ type: 'error', text: res.error })
      } else {
        setProfileMsg({ type: 'success', text: 'Foto profil berhasil dihapus.' })
        setAvatarUrl('')
      }
      setUploading(false)
    })
  }

  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setProfileMsg(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const res = await updateMyProfile(formData)
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
      const res = await changeMyPassword(formData)
      if (res.error) {
        setPasswordMsg({ type: 'error', text: res.error })
      } else {
        setPasswordMsg({ type: 'success', text: 'Password berhasil diubah' })
        ;(e.target as HTMLFormElement).reset()
      }
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden text-sm relative">
      {isPending && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-50 flex justify-center items-start pt-20">
          <div className="w-6 h-6 border-2 border-[#4B21A2] border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-100 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-6 py-4 font-semibold transition whitespace-nowrap ${
            activeTab === 'profile' ? 'text-[#4B21A2] border-b-2 border-[#4B21A2]' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <User className="w-4 h-4" /> Informasi Profil
        </button>
        <button 
          onClick={() => setActiveTab('password')}
          className={`flex items-center gap-2 px-6 py-4 font-semibold transition whitespace-nowrap ${
            activeTab === 'password' ? 'text-[#4B21A2] border-b-2 border-[#4B21A2]' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Key className="w-4 h-4" /> Keamanan Akun
        </button>
        <button 
          onClick={() => setActiveTab('access')}
          className={`flex items-center gap-2 px-6 py-4 font-semibold transition whitespace-nowrap ${
            activeTab === 'access' ? 'text-[#4B21A2] border-b-2 border-[#4B21A2]' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Shield className="w-4 h-4" /> Akses & Peran
        </button>
        <button 
          onClick={() => setActiveTab('linked')}
          className={`flex items-center gap-2 px-6 py-4 font-semibold transition whitespace-nowrap ${
            activeTab === 'linked' ? 'text-[#4B21A2] border-b-2 border-[#4B21A2]' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <LinkIcon className="w-4 h-4" /> Profil Terhubung
        </button>
      </div>

      <div className="p-6">
        {activeTab === 'profile' && (
          <form onSubmit={handleProfileSubmit} className="space-y-6 max-w-2xl">
            {profileMsg && (
              <div className={`p-3 rounded-xl flex items-center gap-2 ${profileMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {profileMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {profileMsg.text}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <ProfileAvatar 
                    src={avatarUrl} 
                    name={data.full_name} 
                    size={96} 
                    className="border border-gray-200" 
                  />
                  {uploading && (
                    <div className="absolute inset-0 bg-white/70 rounded-full flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-[#4B21A2] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                <input 
                  type="file" 
                  accept="image/jpeg,image/png,image/webp" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleAvatarUpload}
                />
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-[#4B21A2] disabled:opacity-50"
                  >
                    <Camera className="w-3.5 h-3.5" /> Ubah Foto
                  </button>
                  {avatarUrl && (
                    <button 
                      type="button"
                      onClick={handleAvatarRemove}
                      disabled={uploading}
                      className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50 ml-2"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-4 w-full">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Nama Lengkap *</label>
                  <input
                    name="full_name"
                    defaultValue={data.full_name}
                    required
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#4B21A2]/20 focus:border-[#4B21A2]"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Email <span className="text-gray-400 text-xs font-normal">(Read-only)</span></label>
                    <input
                      name="email"
                      type="email"
                      defaultValue={data.email}
                      readOnly
                      className="w-full border border-gray-100 bg-gray-50 text-gray-500 rounded-xl px-3 py-2 text-sm outline-none cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">No. WhatsApp</label>
                    <input
                      name="phone"
                      type="tel"
                      defaultValue={data.phone}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#4B21A2]/20 focus:border-[#4B21A2]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                disabled={isPending || uploading}
                type="submit" 
                className="flex items-center gap-2 bg-[#4B21A2] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:bg-[#3d1a85] transition disabled:opacity-50"
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
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#4B21A2]/20 focus:border-[#4B21A2]"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Password Baru</label>
              <input
                name="new_password"
                type="password"
                required
                minLength={8}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#4B21A2]/20 focus:border-[#4B21A2]"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Konfirmasi Password Baru</label>
              <input
                name="confirm_password"
                type="password"
                required
                minLength={8}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#4B21A2]/20 focus:border-[#4B21A2]"
              />
            </div>

            <div className="pt-2">
              <button 
                disabled={isPending}
                type="submit" 
                className="flex items-center justify-center w-full gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:bg-gray-800 transition disabled:opacity-50"
              >
                <Key className="w-4 h-4" /> Perbarui Password
              </button>
            </div>
          </form>
        )}

        {activeTab === 'access' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Role Utama (Legacy)</h4>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 uppercase">
                {data.legacy_role}
              </span>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Dynamic Roles (RBAC)</h4>
              {data.dynamic_roles.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {data.dynamic_roles.map(r => (
                    <span key={r} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {r}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Tidak ada dynamic role</p>
              )}
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Effective Permissions</h4>
              {data.permissions.includes('*') || data.permissions.includes('SUPER_ADMIN') ? (
                <div className="bg-amber-50 text-amber-800 px-4 py-3 rounded-xl border border-amber-200 text-sm flex items-center gap-2">
                  <Shield className="w-5 h-5 text-amber-600" />
                  <strong>Akses Penuh:</strong> Anda adalah Super Admin.
                </div>
              ) : data.permissions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {data.permissions.map(p => (
                    <span key={p} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
                      {p}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Tidak ada hak akses spesifik.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'linked' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            {data.is_guru && (
              <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-3">
                  <User className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-gray-900">Profil Guru</h4>
                <div className="mt-2 text-sm text-gray-500 space-y-1">
                  <p>{data.class_count || 0} Kelas Aktif</p>
                </div>
              </div>
            )}
            
            {data.is_parent && (
              <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                  <User className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-gray-900">Profil Orang Tua</h4>
                <div className="mt-2 text-sm text-gray-500 space-y-1">
                  <p>{data.student_count || 0} Santri Terhubung</p>
                </div>
              </div>
            )}
            
            {!data.is_guru && !data.is_parent && (
              <div className="col-span-full py-8 text-center text-gray-500 text-sm border border-dashed border-gray-300 rounded-xl">
                Tidak ada profil terhubung.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
