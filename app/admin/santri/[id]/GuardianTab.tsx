'use client'

import { useState, useTransition } from 'react'
import { Plus, X, Search, ShieldAlert, CheckCircle2, MoreVertical, Edit2, Ban, RefreshCcw } from 'lucide-react'
import { 
  searchGuardianCandidates, 
  createGuardianRelationship, 
  updateGuardianRelationship,
  deactivateGuardianRelationship,
  reactivateGuardianRelationship,
} from '@/lib/guardians/manage';
import { VALID_RELATIONSHIPS } from '@/lib/guardians/constants';
import { useRouter } from 'next/navigation'

const RELATIONSHIP_LABELS: Record<string, string> = {
  FATHER: 'Ayah',
  MOTHER: 'Ibu',
  GRANDFATHER: 'Kakek',
  GRANDMOTHER: 'Nenek',
  BROTHER: 'Saudara Laki-laki',
  SISTER: 'Saudara Perempuan',
  GUARDIAN: 'Wali',
  OTHER: 'Lainnya'
}

type GuardianTabProps = {
  studentId: number
  initialGuardians: any[]
}

export default function GuardianTab({ studentId, initialGuardians }: GuardianTabProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [guardians, setGuardians] = useState(initialGuardians)
  
  // UI State
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  
  // Form State
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const [relationship, setRelationship] = useState<string>('FATHER')
  const [isPrimary, setIsPrimary] = useState(false)
  const [canViewAcademic, setCanViewAcademic] = useState(false)
  const [canViewFinance, setCanViewFinance] = useState(false)
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    try {
      const results = await searchGuardianCandidates(query)
      setSearchResults(results)
    } catch (e) {
      console.error(e)
    } finally {
      setIsSearching(false)
    }
  }

  const openAddModal = () => {
    setEditingId(null)
    setSelectedUser(null)
    setRelationship('FATHER')
    setIsPrimary(false)
    setCanViewAcademic(false)
    setCanViewFinance(false)
    setSearchQuery('')
    setSearchResults([])
    setErrorMsg(null)
    setShowModal(true)
  }

  const openEditModal = (guardian: any) => {
    setEditingId(guardian.id)
    setSelectedUser(guardian.guardian)
    setRelationship(guardian.relationship)
    setIsPrimary(guardian.isPrimary)
    setCanViewAcademic(guardian.canViewAcademic)
    setCanViewFinance(guardian.canViewFinance)
    setErrorMsg(null)
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) {
      setErrorMsg("Pilih pengguna terlebih dahulu.")
      return
    }

    setErrorMsg(null)
    startTransition(async () => {
      try {
        const payload = {
          studentId,
          parentId: selectedUser.id,
          relationship: relationship as any,
          isPrimary,
          canViewAcademic,
          canViewFinance,
        }

        if (editingId) {
          await updateGuardianRelationship(editingId, payload)
        } else {
          await createGuardianRelationship(payload)
        }
        
        setShowModal(false)
        router.refresh()
      } catch (err: any) {
        if (err.message === 'INACTIVE_EXISTS') {
          // Trigger reactivation
          try {
             await reactivateGuardianRelationship({
               studentId,
               parentId: selectedUser.id,
               relationship: relationship as any,
               isPrimary,
               canViewAcademic,
               canViewFinance
             })
             setShowModal(false)
             router.refresh()
          } catch (reactivateErr: any) {
             setErrorMsg(reactivateErr.message || "Gagal mengaktifkan kembali data wali.")
          }
        } else {
          setErrorMsg(err.message || "Terjadi kesalahan. Silakan coba lagi.")
        }
      }
    })
  }

  const handleDeactivate = (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menonaktifkan wali ini? Akses mereka ke data santri akan dicabut.")) return
    
    startTransition(async () => {
      try {
        await deactivateGuardianRelationship(id)
        router.refresh()
      } catch (err: any) {
        alert(err.message || "Gagal menonaktifkan wali.")
      }
    })
  }

  const handleReactivate = (guardian: any) => {
    // Open edit modal effectively to confirm capabilities before reactivating
    openEditModal(guardian)
    // Note: reactivate is handled in handleSubmit if INACTIVE_EXISTS, but for an explicitly inactive row, we can just call update + reactivate
    // Let's adjust so handleSubmit handles it properly. If editing an inactive guardian, we should call reactivate.
  }

  // Adjust handleSubmit to know if we are editing an inactive guardian
  const finalHandleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) {
      setErrorMsg("Pilih pengguna terlebih dahulu.")
      return
    }

    const isEditingInactive = editingId && initialGuardians.find(g => g.id === editingId && !g.isActive)

    setErrorMsg(null)
    startTransition(async () => {
      try {
        const payload = {
          studentId,
          parentId: selectedUser.id,
          relationship: relationship as any,
          isPrimary,
          canViewAcademic,
          canViewFinance,
        }

        if (isEditingInactive) {
          await reactivateGuardianRelationship(payload)
        } else if (editingId) {
          await updateGuardianRelationship(editingId, payload)
        } else {
          await createGuardianRelationship(payload)
        }
        
        setShowModal(false)
        router.refresh()
      } catch (err: any) {
        if (err.message === 'INACTIVE_EXISTS') {
          try {
             await reactivateGuardianRelationship({
               studentId,
               parentId: selectedUser.id,
               relationship: relationship as any,
               isPrimary,
               canViewAcademic,
               canViewFinance
             })
             setShowModal(false)
             router.refresh()
          } catch (reactivateErr: any) {
             setErrorMsg(reactivateErr.message || "Gagal mengaktifkan kembali data wali.")
          }
        } else {
          setErrorMsg(err.message || "Terjadi kesalahan. Silakan coba lagi.")
        }
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-gray-900">Daftar Wali</h3>
        <button 
          onClick={openAddModal}
          className="bg-[#4B21A2] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#3a1a80] transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Tambah Wali
        </button>
      </div>

      {initialGuardians.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <ShieldAlert className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-500">Belum ada wali yang terdaftar</p>
          <p className="text-xs text-gray-400 mt-1">Tambahkan wali untuk memberikan akses ke portal orang tua.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {initialGuardians.map(g => (
            <div key={g.id} className={`border rounded-2xl p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center transition-opacity ${!g.isActive ? 'opacity-60 bg-gray-50' : 'bg-white border-gray-200'}`}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-[#4B21A2]/10 flex items-center justify-center text-[#4B21A2] font-bold shrink-0">
                  {g.guardian.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-gray-900">{g.guardian.fullName}</h4>
                    {g.isPrimary && (
                      <span className="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-yellow-200">
                        Utama
                      </span>
                    )}
                    {!g.isActive && (
                      <span className="bg-gray-200 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Nonaktif
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{RELATIONSHIP_LABELS[g.relationship] || g.relationship} • {g.guardian.phone || '-'}</p>
                  
                  <div className="flex gap-3 mt-3">
                    <div className="flex items-center gap-1.5 text-xs">
                      {g.canViewAcademic ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Ban className="w-3.5 h-3.5 text-gray-300" />}
                      <span className={g.canViewAcademic ? 'text-gray-700 font-medium' : 'text-gray-400'}>Akademik</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      {g.canViewFinance ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Ban className="w-3.5 h-3.5 text-gray-300" />}
                      <span className={g.canViewFinance ? 'text-gray-700 font-medium' : 'text-gray-400'}>Keuangan</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                {g.isActive ? (
                  <>
                    <button onClick={() => openEditModal(g)} className="p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors tooltip-trigger" title="Edit Akses">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeactivate(g.id)} className="p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors tooltip-trigger" title="Nonaktifkan">
                      <Ban className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button onClick={() => handleReactivate(g)} className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-1.5">
                    <RefreshCcw className="w-3.5 h-3.5" /> Aktifkan Kembali
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-lg">{editingId ? 'Edit Akses Wali' : 'Tambah Wali Baru'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={finalHandleSubmit} className="flex flex-col overflow-y-auto">
              <div className="p-6 space-y-6">
                
                {errorMsg && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl">
                    {errorMsg}
                  </div>
                )}

                {/* User Selector */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Pilih Pengguna <span className="text-red-500">*</span></label>
                  {selectedUser && !(!editingId && searchQuery !== '') ? (
                    <div className="flex justify-between items-center p-3 border border-gray-200 rounded-xl bg-gray-50">
                      <div>
                        <p className="font-bold text-sm text-gray-900">{selectedUser.fullName}</p>
                        <p className="text-xs text-gray-500">{selectedUser.email || selectedUser.phone || 'Tanpa kontak'}</p>
                      </div>
                      {!editingId && (
                        <button type="button" onClick={() => setSelectedUser(null)} className="text-xs font-bold text-red-600 hover:text-red-800">
                          Ganti
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Cari nama, email, atau nomor HP pengguna..."
                          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4B21A2]/20 focus:border-[#4B21A2]"
                          value={searchQuery}
                          onChange={(e) => handleSearch(e.target.value)}
                        />
                      </div>
                      {searchResults.length > 0 && (
                        <div className="border border-gray-100 rounded-xl divide-y overflow-hidden max-h-40 overflow-y-auto shadow-sm">
                          {searchResults.map(user => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => { setSelectedUser(user); setSearchQuery(''); setSearchResults([]); }}
                              className="w-full text-left p-3 hover:bg-gray-50 transition-colors flex justify-between items-center"
                            >
                              <div>
                                <p className="font-semibold text-sm text-gray-900">{user.fullName}</p>
                                <p className="text-[10px] text-gray-500">{user.email || user.phone || '-'}</p>
                              </div>
                              <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full uppercase">
                                {user.role}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                      {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
                        <p className="text-xs text-gray-500 italic">Tidak ditemukan pengguna yang cocok. Pastikan pengguna sudah terdaftar.</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Hubungan <span className="text-red-500">*</span></label>
                    <select 
                      value={relationship} 
                      onChange={(e) => setRelationship(e.target.value)}
                      className="w-full p-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#4B21A2]"
                      required
                    >
                      {VALID_RELATIONSHIPS.map((rel: any) => (
                        <option key={rel} value={rel}>{RELATIONSHIP_LABELS[rel] || rel}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={isPrimary} 
                      onChange={(e) => setIsPrimary(e.target.checked)}
                      className="w-4 h-4 text-[#4B21A2] rounded border-gray-300 focus:ring-[#4B21A2]"
                    />
                    <div>
                      <p className="font-bold text-sm text-gray-900">Jadikan Wali Utama</p>
                      <p className="text-xs text-gray-500">Menggantikan wali utama sebelumnya jika ada.</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={canViewAcademic} 
                      onChange={(e) => setCanViewAcademic(e.target.checked)}
                      className="w-4 h-4 text-[#4B21A2] rounded border-gray-300 focus:ring-[#4B21A2]"
                    />
                    <div>
                      <p className="font-bold text-sm text-gray-900">Akses Akademik</p>
                      <p className="text-xs text-gray-500">Wali dapat melihat nilai dan hafalan santri di portal.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={canViewFinance} 
                      onChange={(e) => setCanViewFinance(e.target.checked)}
                      className="w-4 h-4 mt-0.5 text-[#4B21A2] rounded border-gray-300 focus:ring-[#4B21A2]"
                    />
                    <div>
                      <p className="font-bold text-sm text-gray-900">Akses Keuangan</p>
                      <p className="text-xs text-gray-500">Wali dapat mengakses informasi keuangan santri ini jika akun juga memiliki izin sistem yang sesuai.</p>
                    </div>
                  </label>
                </div>
                
              </div>
              
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0 bg-gray-50">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 font-bold text-sm text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">Batal</button>
                <button type="submit" disabled={isPending || !selectedUser} className="px-6 py-2 font-bold text-sm text-white bg-[#4B21A2] hover:bg-[#3a1a80] rounded-xl transition-colors disabled:opacity-50">
                  {isPending ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
