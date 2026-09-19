'use client'

import { useState, useRef, useTransition } from 'react'
import GuardianTab from './GuardianTab'
import AkunTab from './AkunTab'
import { Camera, CheckCircle2, AlertCircle } from 'lucide-react'
import { ProfileAvatar } from '@/components/ui/ProfileAvatar'
import { uploadStudentPhotoAction, removeStudentPhotoAction } from './actions'

import BeasiswaTab from './BeasiswaTab'

type StudentDetailClientProps = {
  student: any
  initialGuardians: any[]
  initialLinkedUser: any | null
  initialScholarships: any[]
}

export default function StudentDetailClient({ student, initialGuardians, initialLinkedUser, initialScholarships }: StudentDetailClientProps) {
  const [activeTab, setActiveTab] = useState<'profil' | 'wali' | 'akun' | 'beasiswa'>('profil')
  const [photoUrl, setPhotoUrl] = useState(student.photo_url)
  const [uploading, setUploading] = useState(false)
  const [photoMsg, setPhotoMsg] = useState<{type: 'success'|'error', text: string} | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setPhotoMsg(null)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      startTransition(async () => {
        const res = await uploadStudentPhotoAction(student.id, formData)
        if (res.error) {
          setPhotoMsg({ type: 'error', text: res.error })
        } else {
          setPhotoMsg({ type: 'success', text: 'Foto santri berhasil diperbarui.' })
          const objUrl = URL.createObjectURL(file)
          setPhotoUrl(objUrl)
        }
        setUploading(false)
      })
    } catch (err) {
      setPhotoMsg({ type: 'error', text: 'Terjadi kesalahan saat upload' })
      setUploading(false)
    }
  }

  const handlePhotoRemove = async () => {
    if (!confirm('Hapus foto santri?')) return
    setUploading(true)
    setPhotoMsg(null)
    startTransition(async () => {
      const res = await removeStudentPhotoAction(student.id)
      if (res.error) {
        setPhotoMsg({ type: 'error', text: res.error })
      } else {
        setPhotoMsg({ type: 'success', text: 'Foto santri berhasil dihapus.' })
        setPhotoUrl('')
      }
      setUploading(false)
    })
  }

  return (

    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
      {isPending && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-50 flex justify-center items-start pt-20">
          <div className="w-6 h-6 border-2 border-[#4B21A2] border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <div className="flex border-b border-gray-100 px-2 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('profil')}
          className={`px-4 py-4 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'profil' ? 'border-[#4B21A2] text-[#4B21A2]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          Profil Lengkap
        </button>
        <button 
          onClick={() => setActiveTab('wali')}
          className={`px-4 py-4 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'wali' ? 'border-[#4B21A2] text-[#4B21A2]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          Wali & Akses
        </button>
        <button 
          onClick={() => setActiveTab('akun')}
          className={`px-4 py-4 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'akun' ? 'border-[#4B21A2] text-[#4B21A2]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          Akun & Akses
        </button>
        <button 
          onClick={() => setActiveTab('beasiswa')}
          className={`px-4 py-4 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'beasiswa' ? 'border-[#4B21A2] text-[#4B21A2]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          Beasiswa
        </button>
      </div>


      <div className="p-6">
        {activeTab === 'profil' && (
          <div className="space-y-6">
            {photoMsg && (
              <div className={`p-3 rounded-xl flex items-center gap-2 text-sm ${photoMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {photoMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {photoMsg.text}
              </div>
            )}
            <h3 className="font-bold text-lg text-gray-900 border-b pb-2">Informasi Pribadi</h3>
            
            <div className="flex flex-col sm:flex-row gap-6 items-start mb-6">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <ProfileAvatar 
                    src={photoUrl} 
                    name={student.full_name} 
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
                  onChange={handlePhotoUpload}
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
                  {photoUrl && (
                    <button 
                      type="button"
                      onClick={handlePhotoRemove}
                      disabled={uploading}
                      className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50 ml-2"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-4 w-full">
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Nama Lengkap</p>
                  <p className="font-medium text-gray-900">{student.full_name}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Nama Panggilan</p>
                  <p className="font-medium text-gray-900">{student.nickname || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">ID Santri</p>
                  <p className="font-medium text-gray-900">{String(student.id).padStart(4, '0')}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Status</p>
                  <p className="font-medium text-gray-900">{student.status === 'active' ? 'Aktif' : 'Nonaktif'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Jenis Kelamin</p>
                  <p className="font-medium text-gray-900">{student.gender === 'male' ? 'Laki-laki' : student.gender === 'female' ? 'Perempuan' : '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Tanggal Lahir</p>
                  <p className="font-medium text-gray-900">
                    {student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Tanggal Bergabung</p>
                  <p className="font-medium text-gray-900">
                    {student.enrollment_date ? new Date(student.enrollment_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                  </p>
                </div>
              </div>
            </div>

            <h3 className="font-bold text-lg text-gray-900 border-b pb-2 mt-8">Informasi Akademik Saat Ini</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">Program</p>
                <p className="font-medium text-gray-900">{student.program_name || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">Kelas</p>
                <p className="font-medium text-gray-900">{student.class_name || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">Guru Pengampu</p>
                <p className="font-medium text-gray-900">{student.teacher_name || '-'}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'wali' && (
          <GuardianTab studentId={student.id} initialGuardians={initialGuardians} />
        )}

        {activeTab === 'akun' && (
          <AkunTab studentId={student.id} initialLinkedUser={initialLinkedUser} />
        )}

        {activeTab === 'beasiswa' && (
          <BeasiswaTab studentId={student.id} scholarships={initialScholarships} />
        )}
      </div>

    </div>
  )
}
