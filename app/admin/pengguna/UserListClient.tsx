'use client'

import { useState, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { UserRow } from '@/lib/db/queries/users'
import { Search, Plus, MoreHorizontal, User, Shield, CheckCircle2, XCircle, Filter, Eye } from 'lucide-react'
import { createUser, editUser, toggleUserActive } from './actions'

type UserRowWithRoles = UserRow & { dynamicRoleIds: number[], effectivePermissions: string[] }

type Props = {
  users: UserRowWithRoles[]
  allRoles: { id: number, code: string, name: string }[]
  total: number
  page: number
  limit: number
  q: string
  roleFilter: string
  statusFilter: string
}

export default function UserListClient({ users, allRoles, total, page, limit, q, roleFilter, statusFilter }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRowWithRoles | null>(null)
  const [viewingUser, setViewingUser] = useState<UserRowWithRoles | null>(null)
  
  const [actionMsg, setActionMsg] = useState<{type: 'success'|'error', text: string} | null>(null)

  const handleSearch = (term: string) => {
    const params = new URLSearchParams(searchParams)
    if (term) params.set('q', term)
    else params.delete('q')
    params.set('page', '1')
    startTransition(() => router.replace(`${pathname}?${params.toString()}`))
  }

  const handleFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value && value !== 'all') params.set(key, value)
    else params.delete(key)
    params.set('page', '1')
    startTransition(() => router.replace(`${pathname}?${params.toString()}`))
  }

  const handlePage = (newPage: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', newPage.toString())
    startTransition(() => router.replace(`${pathname}?${params.toString()}`))
  }

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setActionMsg(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await createUser(formData)
      if (res.error) setActionMsg({ type: 'error', text: res.error })
      else {
        setIsCreateModalOpen(false)
        setActionMsg({ type: 'success', text: 'Pengguna berhasil dibuat' })
      }
    })
  }

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingUser) return
    setActionMsg(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await editUser(editingUser.id, formData)
      if (res.error) setActionMsg({ type: 'error', text: res.error })
      else {
        setEditingUser(null)
        setActionMsg({ type: 'success', text: 'Pengguna berhasil diubah' })
      }
    })
  }

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    if (!confirm(`Yakin ingin ${currentStatus ? 'menonaktifkan' : 'mengaktifkan'} pengguna ini?`)) return
    setActionMsg(null)
    startTransition(async () => {
      const res = await toggleUserActive(id, currentStatus)
      if (res.error) setActionMsg({ type: 'error', text: res.error })
      else setActionMsg({ type: 'success', text: 'Status berhasil diubah' })
    })
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-4 relative">
      {actionMsg && (
        <div className={`p-4 rounded-xl flex items-center gap-2 ${actionMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {actionMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          <span className="text-sm font-semibold">{actionMsg.text}</span>
        </div>
      )}

      {/* Filters & Actions */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Cari nama, email..."
              defaultValue={q}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4B21A2]/20"
            />
          </div>
          <div className="flex gap-2">
            <select 
              value={roleFilter}
              onChange={(e) => handleFilter('role', e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none bg-white"
            >
              <option value="all">Semua Role</option>
              <option value="admin">Admin</option>
              <option value="guru">Guru</option>
              <option value="orang_tua">Orang Tua</option>
            </select>
            <select 
              value={statusFilter}
              onChange={(e) => handleFilter('status', e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none bg-white"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>
          </div>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-[#4B21A2] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#3d1a85] transition"
        >
          <Plus className="w-4 h-4" /> Tambah
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden relative min-h-[300px]">
        {isPending && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-[#4B21A2] border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Pengguna</th>
                <th className="px-6 py-4">Kontak</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors even:bg-gray-50/50 odd:bg-white">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{user.full_name}</div>
                        <div className="text-xs text-gray-500">
                          {user.last_login_at ? `Login: ${new Date(user.last_login_at).toLocaleDateString('id-ID')}` : 'Belum pernah login'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-700">{user.email || '-'}</div>
                    <div className="text-gray-500 text-xs">{user.phone || '-'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                        user.role === 'guru' ? 'bg-blue-100 text-blue-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {user.role === 'admin' ? 'SUPER_ADMIN' : user.role.toUpperCase()}
                      </span>
                      {user.dynamicRoleIds.map(rid => {
                        const r = allRoles.find(x => x.id === rid)
                        if (!r) return null
                        return (
                          <span key={r.id} className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-gray-100 text-gray-700">
                            {r.name}
                          </span>
                        )
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${
                      user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {user.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => setViewingUser(user)}
                        className="p-1.5 text-gray-500 hover:text-[#4B21A2] hover:bg-purple-50 rounded transition"
                        title="Lihat Detail"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setEditingUser(user)}
                        className="text-xs font-bold text-gray-500 hover:text-[#4B21A2] px-2 py-1 rounded hover:bg-purple-50 transition"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleToggleActive(user.id, user.is_active)}
                        className={`text-xs font-bold px-2 py-1 rounded transition ${user.is_active ? 'text-red-500 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                      >
                        {user.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    Tidak ada data pengguna ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-gray-100 p-4 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Menampilkan {(page - 1) * limit + 1} - {Math.min(page * limit, total)} dari {total}
            </div>
            <div className="flex gap-1">
              <button 
                onClick={() => handlePage(page - 1)} 
                disabled={page === 1}
                className="px-3 py-1 border border-gray-200 rounded text-xs font-bold disabled:opacity-50"
              >
                Prev
              </button>
              <button 
                onClick={() => handlePage(page + 1)} 
                disabled={page === totalPages}
                className="px-3 py-1 border border-gray-200 rounded text-xs font-bold disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg">Tambah Pengguna</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600"><XCircle className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nama Lengkap *</label>
                <input required name="full_name" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:border-[#4B21A2]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Email</label>
                  <input type="email" name="email" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:border-[#4B21A2]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">No. WhatsApp</label>
                  <input type="tel" name="phone" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:border-[#4B21A2]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Role *</label>
                <select required name="role" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:border-[#4B21A2] bg-white">
                  <option value="">Pilih Role...</option>
                  <option value="guru">Guru</option>
                  <option value="orang_tua">Orang Tua</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Password Sementara *</label>
                <input required type="password" name="password" minLength={8} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:border-[#4B21A2]" />
                <p className="text-[10px] text-gray-500 mt-1">Minimal 8 karakter.</p>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <label className="block text-xs font-bold text-gray-700 mb-2">Role Tambahan (Dynamic)</label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {allRoles.map(r => (
                    <label key={r.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1.5 rounded">
                      <input type="checkbox" name="dynamicRoles" value={r.id} className="rounded border-gray-300 text-[#4B21A2] focus:ring-[#4B21A2]" />
                      <span className="font-medium text-gray-700">{r.name}</span>
                      <span className="text-xs text-gray-400 font-mono">({r.code})</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 font-bold text-sm text-gray-500 hover:bg-gray-50 rounded-xl">Batal</button>
                <button type="submit" disabled={isPending} className="px-5 py-2 font-bold text-sm text-white bg-[#4B21A2] hover:bg-[#3d1a85] rounded-xl disabled:opacity-50">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg">Edit Pengguna</h3>
              <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600"><XCircle className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nama Lengkap *</label>
                <input required name="full_name" defaultValue={editingUser.full_name} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:border-[#4B21A2]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Email</label>
                  <input type="email" name="email" defaultValue={editingUser.email || ''} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:border-[#4B21A2]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">No. WhatsApp</label>
                  <input type="tel" name="phone" defaultValue={editingUser.phone || ''} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:border-[#4B21A2]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Role</label>
                  <select name="role" defaultValue={editingUser.role} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:border-[#4B21A2] bg-white">
                    <option value="guru">Guru</option>
                    <option value="orang_tua">Orang Tua</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Status Akun</label>
                  <select name="is_active" defaultValue={editingUser.is_active ? 'true' : 'false'} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:border-[#4B21A2] bg-white">
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                  </select>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <label className="block text-xs font-bold text-gray-700 mb-2">Role Tambahan (Dynamic)</label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {allRoles.map(r => (
                    <label key={r.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1.5 rounded">
                      <input type="checkbox" name="dynamicRoles" value={r.id} defaultChecked={editingUser.dynamicRoleIds.includes(r.id)} className="rounded border-gray-300 text-[#4B21A2] focus:ring-[#4B21A2]" />
                      <span className="font-medium text-gray-700">{r.name}</span>
                      <span className="text-xs text-gray-400 font-mono">({r.code})</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 font-bold text-sm text-gray-500 hover:bg-gray-50 rounded-xl">Batal</button>
                <button type="submit" disabled={isPending} className="px-5 py-2 font-bold text-sm text-white bg-[#4B21A2] hover:bg-[#3d1a85] rounded-xl disabled:opacity-50">Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg">Detail Pengguna</h3>
              <button onClick={() => setViewingUser(null)} className="text-gray-400 hover:text-gray-600"><XCircle className="w-5 h-5"/></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                  {viewingUser.avatar_url ? (
                    <img src={viewingUser.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-lg">{viewingUser.full_name}</h4>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        viewingUser.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                        viewingUser.role === 'guru' ? 'bg-blue-100 text-blue-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {viewingUser.role === 'admin' ? 'SUPER_ADMIN' : viewingUser.role.toUpperCase()}
                    </span>
                    {viewingUser.dynamicRoleIds.map(rid => {
                      const r = allRoles.find(x => x.id === rid)
                      if (!r) return null
                      return (
                        <span key={r.id} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700">
                          {r.name}
                        </span>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span className="font-medium">{viewingUser.email || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Telepon</span>
                  <span className="font-medium">{viewingUser.phone || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className={`font-bold ${viewingUser.is_active ? 'text-emerald-600' : 'text-red-500'}`}>{viewingUser.is_active ? 'Aktif' : 'Nonaktif'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Dibuat Pada</span>
                  <span className="font-medium">{new Date(viewingUser.created_at).toLocaleDateString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Login Terakhir</span>
                  <span className="font-medium">{viewingUser.last_login_at ? new Date(viewingUser.last_login_at).toLocaleString('id-ID') : '-'}</span>
                </div>
              </div>
              {viewingUser.effectivePermissions.length > 0 && (
                <div className="pt-4 border-t border-gray-100">
                  <h5 className="font-bold text-xs text-gray-500 mb-2 uppercase">Izin Efektif</h5>
                  <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                    {viewingUser.effectivePermissions.map(p => (
                      <span key={p} className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-green-50 text-green-700">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
