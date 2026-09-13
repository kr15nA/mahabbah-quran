import { db } from '@/lib/db/client'
import { students, classes, enrollments, academicYears } from '@/drizzle/schema'
import { eq, isNull, and } from 'drizzle-orm'
import AdminAIClient from './AdminAIClient'
import { requireAuth } from '@/lib/auth/rbac'
import { redirect } from 'next/navigation'
import { Brain } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminAIPage() {
  const session = await requireAuth()
  if (session.role !== 'SUPER_ADMIN') {
    redirect('/')
  }

  // Fetch only safe, minimal fields for the selector
  const studentList = await db
    .select({
      id: students.id,
      full_name: students.fullName,
      class_name: classes.name
    })
    .from(students)
    .innerJoin(enrollments, eq(enrollments.studentId, students.id))
    .innerJoin(academicYears, and(eq(academicYears.id, enrollments.academicYearId), eq(academicYears.isActive, true)))
    .innerJoin(classes, eq(classes.id, enrollments.classId))
    .where(isNull(students.deletedAt))
    .orderBy(classes.name, students.fullName)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#18085A] flex items-center gap-2">
          <Brain className="w-6 h-6 text-[#FBBF24]" />
          AI Analisis Akademik
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Dapatkan ringkasan, kekuatan, dan rekomendasi mendalam untuk setiap santri berdasarkan performa akademik aktual.
        </p>
      </div>

      <AdminAIClient students={studentList} />
    </div>
  )
}
