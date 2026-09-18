import { notFound, redirect } from 'next/navigation'
import { requireAuth, requirePermission } from '@/lib/auth/rbac'
import { getStudentById } from '@/lib/db/queries/students'
import { listStudentGuardians } from '@/lib/guardians/manage'
import StudentDetailClient from './StudentDetailClient'

export const dynamic = 'force-dynamic'

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requirePermission('system.user.manage')

  const { id: studentIdStr } = await params
  const studentId = parseInt(studentIdStr, 10)
  if (isNaN(studentId)) return notFound()

  const student = await getStudentById(studentId)
  if (!student) return notFound()

  // We explicitly fetch guardians for the initial view since Admin holds system.user.manage
  // (In reality, we rely on the component or this page to enforce manage rights)
  let guardians: any[] = []
  try {
    guardians = await listStudentGuardians(studentId)
  } catch (e) {
    // If they lack system.user.manage, they just see empty or get a 403 on that tab, 
    // but the page load might fail. Let's assume admins have it.
    // If not, we could handle it here gracefully.
    console.error('Failed to load guardians:', e)
  }

  return (
    <div className="space-y-6">
      {/* Student Profile Header Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-[#4B21A2]/10 flex items-center justify-center text-[#4B21A2] font-bold text-2xl">
          {student.photo_url ? (
             <img src={student.photo_url} alt={student.full_name} className="w-full h-full rounded-full object-cover" />
          ) : (
            student.full_name.charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{student.full_name}</h1>
          <p className="text-gray-500">Panggilan: {student.nickname || '-'}</p>
          <div className="flex gap-2 mt-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
              ID: {String(student.id).padStart(4, '0')}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${student.status === 'active' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-50 text-gray-700 border-gray-100'}`}>
              {student.status === 'active' ? 'Aktif' : 'Nonaktif'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-100">
              {student.program_name || 'Tidak ada program'}
            </span>
          </div>
        </div>
      </div>

      <StudentDetailClient student={student} initialGuardians={guardians} />
    </div>
  )
}
