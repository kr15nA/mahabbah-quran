'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, ChevronDown, ChevronRight, User, Users, CheckCircle, AlertTriangle, XCircle, Info, Filter } from 'lucide-react'
import GuardianRelationshipBadges from '@/components/admin/guardians/GuardianRelationshipBadges'

// Relationship map helper (normally imported, we duplicate standard mapping for UI)
const RELATIONSHIP_MAP: Record<string, string> = {
  FATHER: 'Ayah',
  MOTHER: 'Ibu',
  GRANDFATHER: 'Kakek',
  GRANDMOTHER: 'Nenek',
  BROTHER: 'Kakak Laki-laki',
  SISTER: 'Kakak Perempuan',
  GUARDIAN: 'Wali',
  OTHER: 'Lainnya'
}

type Props = {
  view: 'student' | 'guardian'
  summary: any
  studentData?: any
  guardianData?: any
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export default function GuardianExplorerClient({
  view,
  summary,
  studentData,
  guardianData,
  page,
  pageSize,
  totalItems,
  totalPages
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [searchValue, setSearchValue] = useState(searchParams.get('search') || '')
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})

  // Debounce search
  useEffect(() => {
    const currentSearch = searchParams.get('search') || ''
    if (searchValue !== currentSearch) {
      const timeout = setTimeout(() => {
        updateParams({ search: searchValue || null, page: 1 })
      }, 500)
      return () => clearTimeout(timeout)
    }
  }, [searchValue, searchParams])

  const updateParams = (updates: Record<string, string | number | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === '') {
        params.delete(k)
      } else {
        params.set(k, String(v))
      }
    }
    // If not updating page, implicitly reset page=1 on filter changes
    if (!('page' in updates)) {
      params.set('page', '1')
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const renderSummaryCards = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-col">
        <span className="text-xs text-gray-500 font-semibold mb-1">Total Wali Aktif</span>
        <span className="text-2xl font-bold text-gray-900">{summary.totalActiveGuardians}</span>
      </div>
      <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-col">
        <span className="text-xs text-gray-500 font-semibold mb-1">Wali &gt;1 Santri</span>
        <span className="text-2xl font-bold text-gray-900">{summary.multiStudentGuardians}</span>
      </div>
      <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-col border-l-4 border-l-red-500">
        <span className="text-xs text-gray-500 font-semibold mb-1">Santri Tanpa Wali</span>
        <span className="text-2xl font-bold text-red-600">{summary.studentsWithoutGuardian}</span>
      </div>
      <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-col border-l-4 border-l-orange-500">
        <span className="text-xs text-gray-500 font-semibold mb-1">Santri Tanpa Wali Utama</span>
        <span className="text-2xl font-bold text-orange-600">{summary.studentsWithoutPrimary}</span>
      </div>
    </div>
  )

  const renderPagination = () => (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-4 bg-white border-t rounded-b-xl">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>Menampilkan</span>
        <select 
          className="border rounded p-1 text-sm bg-gray-50 outline-none focus:ring-1 focus:ring-[#18085A]"
          value={pageSize}
          onChange={(e) => updateParams({ page_size: parseInt(e.target.value), page: 1 })}
        >
          <option value={10}>10</option>
          <option value={30}>30</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <span>dari {totalItems}</span>
      </div>
      
      <div className="flex gap-1">
        <button
          disabled={page <= 1}
          onClick={() => updateParams({ page: page - 1 })}
          className="px-3 py-1.5 border rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-gray-50 disabled:hover:bg-white"
        >
          Sebelumnya
        </button>
        <span className="px-3 py-1.5 text-sm font-medium">Halaman {page} / {totalPages || 1}</span>
        <button
          disabled={page >= totalPages}
          onClick={() => updateParams({ page: page + 1 })}
          className="px-3 py-1.5 border rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-gray-50 disabled:hover:bg-white"
        >
          Selanjutnya
        </button>
      </div>
    </div>
  )

  const renderStudentTable = () => {
    const quality = searchParams.get('quality') || 'all'
    
    return (
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-50/50">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Cari nama santri..."
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={quality}
              onChange={e => updateParams({ quality: e.target.value === 'all' ? null : e.target.value, page: 1 })}
              className="border rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-1 focus:ring-blue-500 w-full sm:w-auto"
            >
              <option value="all">Semua Santri</option>
              <option value="no_guardian">Tanpa Wali (0 Wali)</option>
              <option value="multi_guardian">Dengan &gt;1 Wali</option>
              <option value="no_primary">Tanpa Wali Utama</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
              <tr>
                <th className="px-4 py-3 w-10"></th>
                <th className="px-4 py-3">Nama Santri</th>
                <th className="px-4 py-3">Kelas</th>
                <th className="px-4 py-3 text-center">Jml Wali Aktif</th>
                <th className="px-4 py-3">Status Primary</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {studentData?.data?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Tidak ada santri yang ditemukan.
                  </td>
                </tr>
              ) : (
                studentData?.data?.map((row: any) => {
                  const isExpanded = expandedRows[row.studentId]
                  return (
                    <React.Fragment key={row.studentId}>
                      <tr className={`hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-blue-50/30' : ''}`}>
                        <td className="px-4 py-3 text-center cursor-pointer" onClick={() => toggleRow(row.studentId)}>
                          {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{row.studentName}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {row.className} <span className="text-gray-400 mx-1">•</span> {row.programName}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${
                            row.activeGuardianCount === 0 ? 'bg-red-100 text-red-700' :
                            row.activeGuardianCount > 1 ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {row.activeGuardianCount}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {row.activeGuardianCount === 0 ? (
                            <span className="inline-flex items-center gap-1 text-red-600 font-medium text-xs">
                              <XCircle className="w-3.5 h-3.5" /> Belum ada wali
                            </span>
                          ) : !row.hasPrimaryGuardian ? (
                            <span className="inline-flex items-center gap-1 text-orange-600 font-medium text-xs">
                              <AlertTriangle className="w-3.5 h-3.5" /> Belum ada wali utama
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-green-600 font-medium text-xs">
                              <CheckCircle className="w-3.5 h-3.5" /> Ada wali utama
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link 
                            href={`/admin/santri/${row.studentId}`}
                            className="text-blue-600 hover:text-blue-800 font-medium text-[13px]"
                          >
                            Kelola Wali
                          </Link>
                        </td>
                      </tr>
                      
                      {/* Expanded Detail */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="p-0 border-b">
                            <div className="bg-gray-50 px-10 py-4 shadow-inner border-y border-gray-200">
                              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Daftar Wali & Hak Akses</h4>
                              {row.relations?.length === 0 ? (
                                <p className="text-sm text-gray-500 italic">Tidak ada relasi wali.</p>
                              ) : (
                                <div className="space-y-3">
                                  {row.relations.map((rel: any) => (
                                    <div key={rel.id} className="bg-white border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                                      <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                          <User className="w-4 h-4 text-gray-400" />
                                          <span className="font-semibold text-gray-900">{rel.guardianName}</span>
                                          <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                                            {RELATIONSHIP_MAP[rel.relationship] || rel.relationship}
                                          </span>
                                        </div>
                                      </div>
                                      
                                      <GuardianRelationshipBadges 
                                        isPrimary={rel.isPrimary}
                                        canViewAcademic={rel.canViewAcademic}
                                        canViewFinance={rel.canViewFinance}
                                        isActive={rel.isActive}
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        {renderPagination()}
      </div>
    )
  }

  const renderGuardianTable = () => {
    const status = searchParams.get('status') || 'active'
    const multiStudent = searchParams.get('multi_student') === '1'

    return (
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-50/50">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Cari nama/email wali..."
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
            />
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={status}
                onChange={e => updateParams({ status: e.target.value === 'active' ? null : e.target.value, page: 1 })}
                className="border rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="active">Relasi Aktif</option>
                <option value="inactive">Relasi Nonaktif</option>
                <option value="all">Semua Relasi</option>
              </select>
            </div>
            
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input 
                type="checkbox" 
                checked={multiStudent}
                onChange={e => updateParams({ multi_student: e.target.checked ? 1 : null, page: 1 })}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              Wali &gt;1 Santri
            </label>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
              <tr>
                <th className="px-4 py-3 w-10"></th>
                <th className="px-4 py-3">Nama Wali</th>
                <th className="px-4 py-3">Kontak (Email)</th>
                <th className="px-4 py-3 text-center">Jml Santri Aktif</th>
                <th className="px-4 py-3">Summary Relasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {guardianData?.data?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Tidak ada wali yang ditemukan.
                  </td>
                </tr>
              ) : (
                guardianData?.data?.map((row: any) => {
                  const isExpanded = expandedRows[row.guardianUserId]
                  return (
                    <React.Fragment key={row.guardianUserId}>
                      <tr className={`hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-blue-50/30' : ''}`}>
                        <td className="px-4 py-3 text-center cursor-pointer" onClick={() => toggleRow(row.guardianUserId)}>
                          {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{row.guardianName}</td>
                        <td className="px-4 py-3 text-gray-600">{row.guardianEmail || '-'}</td>
                        <td className="px-4 py-3 text-center">
                           <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${
                            row.activeStudentCount === 0 ? 'bg-gray-100 text-gray-700' :
                            row.activeStudentCount > 1 ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {row.activeStudentCount}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-[200px]" title={row.relations?.map((r: any) => r.studentName).join(', ')}>
                          {row.relations?.length > 0 
                            ? row.relations.slice(0, 2).map((r: any) => r.studentName).join(', ') + (row.relations.length > 2 ? ' ...' : '')
                            : 'Tidak ada'
                          }
                        </td>
                      </tr>
                      
                      {/* Expanded Detail */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={5} className="p-0 border-b">
                            <div className="bg-gray-50 px-10 py-4 shadow-inner border-y border-gray-200">
                              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Daftar Santri Terkait</h4>
                              {row.relations?.length === 0 ? (
                                <p className="text-sm text-gray-500 italic">Tidak ada relasi santri yang terlihat (berdasarkan filter).</p>
                              ) : (
                                <div className="space-y-3">
                                  {row.relations.map((rel: any) => (
                                    <div key={rel.id} className="bg-white border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                                      <div className="flex flex-col gap-1 flex-1">
                                        <div className="flex items-center gap-2">
                                          <Users className="w-4 h-4 text-gray-400" />
                                          <span className="font-semibold text-gray-900">{rel.studentName}</span>
                                          <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                                            {RELATIONSHIP_MAP[rel.relationship] || rel.relationship}
                                          </span>
                                        </div>
                                        <div className="text-xs text-gray-500 ml-6">
                                          {rel.className} <span className="mx-1">•</span> {rel.programName}
                                        </div>
                                      </div>
                                      
                                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                                        <GuardianRelationshipBadges 
                                          isPrimary={rel.isPrimary}
                                          canViewAcademic={rel.canViewAcademic}
                                          canViewFinance={rel.canViewFinance}
                                          isActive={rel.isActive}
                                        />
                                        <Link 
                                          href={`/admin/santri/${rel.studentId}`}
                                          className="text-blue-600 hover:text-blue-800 font-medium text-[12px] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                                        >
                                          Lihat Santri
                                        </Link>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        {renderPagination()}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Explorer Wali & Keluarga</h1>
          <p className="text-sm text-gray-500 mt-1">Pemetaan relasi dan identifikasi anomali data wali santri.</p>
        </div>
      </div>

      {renderSummaryCards()}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b">
        <button
          onClick={() => updateParams({ view: 'student', page: 1, quality: null, status: null, multi_student: null, search: null })}
          className={`px-4 py-2.5 font-medium text-sm transition-colors border-b-2 ${
            view === 'student' ? 'border-[#18085A] text-[#18085A]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Per Santri
        </button>
        <button
          onClick={() => updateParams({ view: 'guardian', page: 1, quality: null, status: null, multi_student: null, search: null })}
          className={`px-4 py-2.5 font-medium text-sm transition-colors border-b-2 ${
            view === 'guardian' ? 'border-[#18085A] text-[#18085A]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Per Wali
        </button>
      </div>

      {/* Dynamic Content */}
      <div className="pb-12">
        {view === 'student' ? renderStudentTable() : renderGuardianTable()}
      </div>
    </div>
  )
}
