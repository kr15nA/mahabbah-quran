'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { AlertTriangle, CheckCircle } from 'lucide-react'

// Basic Account config UI
export default function PengaturanAkunPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<number | null>(null)

  useEffect(() => {
    // We don't have a dedicated API to list ALL accounts yet, but maybe we can just fetch from an existing one or create a quick route.
    // Wait, the plan didn't explicitly mention creating GET /api/finance/accounts. I'll fetch it by calling a route.
    // Let me just add a server action here for brevity instead of a full API route for fetching accounts.
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/finance/accounts')
      if (res.ok) {
        const data = await res.json()
        setAccounts(data.filter((a: any) => a.accountType === 'ASSET'))
      } else {
        console.error('Failed to fetch accounts')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSubtypeChange = async (id: number, subtype: string) => {
    setSaving(id)
    try {
      const res = await fetch(`/api/finance/accounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetSubtype: subtype || null })
      })
      if (res.ok) {
        setAccounts(accounts.map(a => a.id === id ? { ...a, assetSubtype: subtype || null } : a))
      } else {
        alert('Gagal menyimpan konfigurasi')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(null)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Memuat data akun...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan Akun Aset</h1>
        <p className="text-gray-500 text-sm mt-1">Klasifikasikan akun aset agar terbaca di dashboard keuangan (Liquid Balance)</p>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-4 font-medium">Kode</th>
                <th className="px-6 py-4 font-medium">Nama Akun</th>
                <th className="px-6 py-4 font-medium">Tipe</th>
                <th className="px-6 py-4 font-medium">Klasifikasi Aset (Subtype)</th>
                <th className="px-6 py-4 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {accounts.map(acc => (
                <tr key={acc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-xs">{acc.code}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{acc.name}</td>
                  <td className="px-6 py-4"><Badge variant="neutral">{acc.accountType}</Badge></td>
                  <td className="px-6 py-4">
                    <select
                      className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                      value={acc.assetSubtype || ''}
                      onChange={(e) => handleSubtypeChange(acc.id, e.target.value)}
                      disabled={saving === acc.id}
                    >
                      <option value="">-- Belum Diklasifikasi --</option>
                      <option value="CASH">Kas (CASH)</option>
                      <option value="BANK">Bank (BANK)</option>
                      <option value="RECEIVABLE">Piutang (RECEIVABLE)</option>
                      <option value="OTHER_ASSET">Aset Lainnya (OTHER)</option>
                    </select>
                    {saving === acc.id && <span className="ml-2 text-xs text-blue-500">Menyimpan...</span>}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {acc.assetSubtype ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Tidak ada data akun aset</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
