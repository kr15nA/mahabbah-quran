'use client'

import { useState } from 'react'
import GuardianTab from './GuardianTab'
import AkunTab from './AkunTab'

type StudentDetailClientProps = {
  student: any
  initialGuardians: any[]
  initialLinkedUser: any | null
}

export default function StudentDetailClient({ student, initialGuardians, initialLinkedUser }: StudentDetailClientProps) {
  const [activeTab, setActiveTab] = useState<'profil' | 'wali' | 'akun'>('profil')

  return (

    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
      </div>


      <div className="p-6">
        {activeTab === 'profil' && (
          <div className="space-y-6">
            <h3 className="font-bold text-lg text-gray-900 border-b pb-2">Informasi Pribadi</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-4">
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
      </div>

    </div>
  )
}
