'use client'

import { useState, useTransition, useMemo } from 'react'
import { Plus, XCircle, CheckCircle2, Shield, Search } from 'lucide-react'
import { createRole, editRole } from './actions'

type PermissionRow = { id: number, code: string, name: string, description: string | null }
type RoleRow = { id: number, code: string, name: string, description: string | null, _count: number, permissions: number[] }

type Props = {
  roles: RoleRow[]
  permissions: PermissionRow[]
}

export default function RolesClient({ roles, permissions }: Props) {
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleRow | null>(null)
  const [actionMsg, setActionMsg] = useState<{type: 'success'|'error', text: string} | null>(null)

  const filteredRoles = roles.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase()) || 
    r.code.toLowerCase().includes(search.toLowerCase())
  )

  const groupedPermissions = useMemo(() => {
    const groups: Record<string, PermissionRow[]> = {}
    permissions.forEach(p => {
      const prefix = p.code.split('.')[0] || 'other'
      const key = prefix.charAt(0).toUpperCase() + prefix.slice(1)
      if (!groups[key]) groups[key] = []
      groups[key].push(p)
    })
    return groups
  }, [permissions])

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setActionMsg(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await createRole(formData)
      if (res.error) setActionMsg({ type: 'error', text: res.error })
      else {
        setIsCreateModalOpen(false)
        setActionMsg({ type: 'success', text: 'Role berhasil dibuat' })
      }
    })
  }

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingRole) return
    setActionMsg(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await editRole(editingRole.id, formData)
      if (res.error) setActionMsg({ type: 'error', text: res.error })
      else {
        setEditingRole(null)
        setActionMsg({ type: 'success', text: 'Role berhasil diperbarui' })
      }
    })
  }

  const renderPermissionsGroup = (defaultSelected: number[] = []) => (
    <div className="space-y-4 max-h-[40vh] overflow-y-auto p-1">
      {Object.entries(groupedPermissions).map(([group, perms]) => (
        <div key={group} className="border border-gray-100 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700 border-b border-gray-100">
            {group}
          </div>
          <div className="divide-y divide-gray-50">
            {perms.map(p => (
              <label key={p.id} className="flex items-start gap-3 p-3 hover:bg-gray-50/50 cursor-pointer transition">
                <input 
                  type="checkbox" 
                  name="permissionIds" 
                  value={p.id} 
                  defaultChecked={defaultSelected.includes(p.id)}
                  className="mt-0.5 rounded border-gray-300 text-[#4B21A2] focus:ring-[#4B21A2]"
                />
                <div>
                  <div className="text-sm font-bold text-gray-900">{p.name}</div>
                  <div className="text-xs text-gray-500 font-mono mt-0.5">{p.code}</div>
                  {p.description && <div className="text-xs text-gray-400 mt-1">{p.description}</div>}
                </div>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="space-y-4 relative">
      {actionMsg && (
        <div className={`p-4 rounded-xl flex items-center gap-2 ${actionMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {actionMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          <span className="text-sm font-semibold">{actionMsg.text}</span>
        </div>
      )}

      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Cari nama role, kode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4B21A2]/20"
          />
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-[#4B21A2] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#3d1a85] transition"
        >
          <Plus className="w-4 h-4" /> Tambah Role
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Kode</th>
                <th className="px-6 py-4 text-center">Izin</th>
                <th className="px-6 py-4 text-center">Pengguna</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRoles.map(role => (
                <tr key={role.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{role.name}</div>
                    <div className="text-xs text-gray-500">{role.description || '-'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {role.code}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center bg-purple-50 text-purple-700 font-bold w-8 h-8 rounded-full text-xs">
                      {role.permissions.length}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 font-bold w-8 h-8 rounded-full text-xs">
                      {role._count}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setEditingRole(role)}
                      className="text-xs font-bold text-[#4B21A2] hover:bg-purple-50 px-3 py-1.5 rounded transition"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {filteredRoles.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    Tidak ada role ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white z-10">
              <h3 className="font-bold text-lg flex items-center gap-2"><Shield className="w-5 h-5 text-[#4B21A2]"/> Tambah Role Baru</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600"><XCircle className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-hidden flex flex-col">
              <div className="p-6 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Nama Role *</label>
                    <input required name="name" placeholder="Misal: Staf Keuangan" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:border-[#4B21A2]" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Kode Unik *</label>
                    <input required name="code" placeholder="Misal: FINANCE_STAFF" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm uppercase font-mono outline-none focus:ring-2 focus:border-[#4B21A2]" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Deskripsi</label>
                  <input name="description" placeholder="Deskripsi peran" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:border-[#4B21A2]" />
                </div>
                
                <div className="pt-2">
                  <label className="block text-xs font-bold text-gray-700 mb-2">Pilih Hak Akses (Permissions)</label>
                  {renderPermissionsGroup([])}
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/50">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 font-bold text-sm text-gray-500 hover:bg-gray-100 rounded-xl transition">Batal</button>
                <button type="submit" disabled={isPending} className="px-5 py-2 font-bold text-sm text-white bg-[#4B21A2] hover:bg-[#3d1a85] rounded-xl transition disabled:opacity-50">
                  {isPending ? 'Menyimpan...' : 'Simpan Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white z-10">
              <h3 className="font-bold text-lg flex items-center gap-2"><Shield className="w-5 h-5 text-[#4B21A2]"/> Edit Role</h3>
              <button onClick={() => setEditingRole(null)} className="text-gray-400 hover:text-gray-600"><XCircle className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleEditSubmit} className="flex-1 overflow-hidden flex flex-col">
              <div className="p-6 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Nama Role *</label>
                    <input required name="name" defaultValue={editingRole.name} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:border-[#4B21A2]" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Kode Unik (Read-only)</label>
                    <input readOnly value={editingRole.code} className="w-full border border-gray-200 bg-gray-50 text-gray-500 rounded-xl px-3 py-2 text-sm font-mono cursor-not-allowed" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Deskripsi</label>
                  <input name="description" defaultValue={editingRole.description || ''} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:border-[#4B21A2]" />
                </div>
                
                <div className="pt-2">
                  <label className="block text-xs font-bold text-gray-700 mb-2">Edit Hak Akses (Permissions)</label>
                  {renderPermissionsGroup(editingRole.permissions)}
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/50">
                <button type="button" onClick={() => setEditingRole(null)} className="px-4 py-2 font-bold text-sm text-gray-500 hover:bg-gray-100 rounded-xl transition">Batal</button>
                <button type="submit" disabled={isPending} className="px-5 py-2 font-bold text-sm text-white bg-[#4B21A2] hover:bg-[#3d1a85] rounded-xl transition disabled:opacity-50">
                  {isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
