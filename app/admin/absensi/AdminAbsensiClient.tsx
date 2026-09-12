'use client'

import { useState, useEffect, useMemo } from 'react'
import { Calendar, CheckCircle2, AlertCircle, XCircle, Clock, Search, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import type { SearchAttendanceRow } from '@/lib/db/queries/attendance'
import type { ClassRow } from '@/lib/db/queries/classes'

export default function AdminAbsensiClient({
  data,
  total,
  classes,
  currentDate,
  currentClassId,
  currentStatus,
  currentSearch,
  currentPage,
  pageSize
}: {
  data: SearchAttendanceRow[]
  total: number
  classes: ClassRow[]
  currentDate: string
  currentClassId: string
  currentStatus: string
  currentSearch: string
  currentPage: number
  pageSize: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(currentSearch)
  const [date, setDate] = useState(currentDate)
  const [classId, setClassId] = useState(currentClassId)
  const [status, setStatus] = useState(currentStatus)

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    if (key !== 'page') params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (search !== currentSearch) {
        updateFilters('search', search)
      }
    }, 500)
    return () => clearTimeout(delayDebounceFn)
  }, [search])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      {/* Header & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Rekap Kehadiran Santri</h3>
          <p className="text-xs text-gray-500">Status presensi harian di semua kelompok</p>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-48">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Cari nama santri..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-[#FBBF24] focus:ring-1 focus:ring-[#FBBF24] transition-colors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <input 
            type="date"
            className="w-full md:w-36 py-2 px-3 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-[#FBBF24] focus:ring-1 focus:ring-[#FBBF24] transition-colors text-gray-700 font-medium"
            value={date}
            onChange={(e) => {
              setDate(e.target.value)
              updateFilters('date', e.target.value)
            }}
          />

          <select 
            className="w-full md:w-36 py-2 px-3 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-[#FBBF24] focus:ring-1 focus:ring-[#FBBF24] transition-colors bg-white text-gray-700 cursor-pointer"
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value)
              updateFilters('class_id', e.target.value)
            }}
          >
            <option value="">Semua Kelas</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            className="w-full md:w-36 py-2 px-3 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-[#FBBF24] focus:ring-1 focus:ring-[#FBBF24] transition-colors bg-white text-gray-700 cursor-pointer"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              updateFilters('status', e.target.value)
            }}
          >
            <option value="">Semua Status</option>
            <option value="hadir">Hadir</option>
            <option value="izin">Izin</option>
            <option value="sakit">Sakit</option>
            <option value="alfa">Alfa</option>
            <option value="belum_absen">Belum Absen</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[600px]">
            <thead>
              <tr className="bg-[#F0EDF9] text-gray-500 font-bold border-b border-gray-200">
                <th className="p-3.5 px-4 whitespace-nowrap">Nama Santri</th>
                <th className="p-3.5 whitespace-nowrap">Kelas</th>
                <th className="p-3.5 whitespace-nowrap">Guru Pengampu</th>
                <th className="p-3.5 px-4 whitespace-nowrap">Status Presensi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">
                    Tidak ada data absensi untuk filter ini.
                  </td>
                </tr>
              ) : (
                data.map((a, i) => (
                  <tr key={a.student_id + '-' + i} className="hover:bg-gray-50">
                    <td className="p-3.5 px-4 font-bold text-gray-900 whitespace-nowrap">{a.student_name}</td>
                    <td className="p-3.5 text-gray-600 whitespace-nowrap">{a.class_name}</td>
                    <td className="p-3.5 text-gray-600 whitespace-nowrap">{a.teacher_name}</td>
                    <td className="p-3.5 px-4 whitespace-nowrap">
                      {a.status === 'hadir' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> Hadir
                        </span>
                      )}
                      {a.status === 'izin' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3" /> Izin
                        </span>
                      )}
                      {a.status === 'sakit' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800">
                          <AlertCircle className="w-3 h-3" /> Sakit
                        </span>
                      )}
                      {a.status === 'alfa' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                          <XCircle className="w-3 h-3" /> Alfa
                        </span>
                      )}
                      {!a.status && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                          Belum Absen
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <div>
              Menampilkan {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, total)} dari {total} santri
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => updateFilters('page', String(currentPage - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 font-semibold text-gray-700 text-sm">{currentPage}</span>
              <button 
                onClick={() => updateFilters('page', String(currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
