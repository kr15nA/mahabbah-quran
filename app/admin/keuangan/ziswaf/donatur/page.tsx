import { requireAuth, hasPermission } from '@/lib/auth/rbac'
import { db } from '@/lib/db/client'
import { financeParties } from '@/drizzle/schema'
import { desc, ilike } from 'drizzle-orm'
import { Card } from '@/components/ui/Card'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DonaturPage(props: { searchParams: Promise<{ q?: string }> }) {
  const { session } = await requireAuth()
  const canView = await hasPermission(session, 'finance.ziswaf.view')
  if (!canView) redirect('/admin')
  
  const searchParams = await props.searchParams
  const q = searchParams.q || ''

  const conditions = q ? ilike(financeParties.name, `%${q}%`) : undefined
  const parties = await db.select().from(financeParties).where(conditions).orderBy(desc(financeParties.createdAt))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Donatur / Muzakki</h2>
          <p className="text-sm text-gray-500">Kelola data master donatur, muzakki, dan wakif</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Add quick add modal button in future, for now placeholder */}
          <button className="bg-[#18085A] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#18085A]/90 transition-colors">
            + Tambah Donatur
          </button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Nama</th>
                <th className="px-6 py-4">Tipe</th>
                <th className="px-6 py-4">Kontak</th>
                <th className="px-6 py-4">Dibuat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {parties.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{p.name}</td>
                  <td className="px-6 py-4">{p.partyType}</td>
                  <td className="px-6 py-4">
                    {p.phone && <div className="text-gray-600">{p.phone}</div>}
                    {p.email && <div className="text-gray-500 text-xs">{p.email}</div>}
                    {!p.phone && !p.email && <span className="text-gray-400 italic">-</span>}
                  </td>
                  <td className="px-6 py-4 text-gray-500">{p.createdAt.toLocaleDateString('id-ID')}</td>
                </tr>
              ))}
              {parties.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    Tidak ada data donatur ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
