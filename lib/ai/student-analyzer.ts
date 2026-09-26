import { z } from 'zod'
import { getAnthropicApiKey } from '../config/env'

export const StudentAnalysisSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()),
  concerns: z.array(z.string()),
  teacher_actions: z.array(z.string()),
  parent_guidance: z.array(z.string()),
})

export type StudentAnalysisResult = z.infer<typeof StudentAnalysisSchema>

export type AcademicContextData = {
  studentName: string
  period: string
  attendance: {
    hadir: number
    izin: number
    sakit: number
    alfa: number
    totalRate: number
  } | null
  hafalan: {
    totalSessions: number
    averageScore: number | null
    surahs: string[]
  } | null
  tahsin: {
    totalSessions: number
    makhrajAvg: number | null
    tajwidAvg: number | null
    kelancaranAvg: number | null
    ghunnahAvg: number | null
  } | null
  reports: {
    count: number
    averageAdab: number | null
    teacherNotes: string[]
  } | null
}

export async function analyzeStudentAcademicData(
  context: AcademicContextData
): Promise<StudentAnalysisResult> {
  const apiKey = getAnthropicApiKey()

  // System Prompt strictly separates instructions from data to prevent prompt injection.
  const systemInstruction = `Anda adalah asisten AI akademik di Rumah Tahfizh Mahabbah Qur'an.
Tugas Anda adalah membaca data akademik santri dan menghasilkan analisis terstruktur berdasarkan FAKTA DATA SAJA.

ATURAN WAJIB:
1. JANGAN PERNAH mengarang, menambah, atau memalsukan data (skor, kehadiran, tanggal, surah).
2. Jika suatu bagian data bernilai null atau tidak ada, sebutkan secara eksplisit "Data tidak tersedia" dan jangan buat asumsi.
3. Bedakan antara observasi (fakta dari data) dengan rekomendasi (saran profesional).
4. JANGAN mendiagnosis kondisi medis, psikologis, atau agama.
5. Gunakan bahasa Indonesia yang edukatif, profesional, dan tidak menghakimi santri.
6. Hasilkan HANYA JSON valid sesuai struktur berikut (tanpa blok markdown atau teks tambahan apapun di luar JSON):
{
  "summary": "Ringkasan naratif (2-3 kalimat)",
  "strengths": ["Kekuatan 1", "Kekuatan 2"],
  "concerns": ["Perlu perhatian 1"],
  "teacher_actions": ["Tindakan guru 1"],
  "parent_guidance": ["Saran orang tua 1"]
}`

  const dataContext = `
<DATA_AKADEMIK>
Nama Santri: ${context.studentName}
Periode: ${context.period}

KEHADIRAN:
${context.attendance ? `Hadir: ${context.attendance.hadir}, Izin: ${context.attendance.izin}, Sakit: ${context.attendance.sakit}, Alfa: ${context.attendance.alfa}. Tingkat Kehadiran: ${context.attendance.totalRate.toFixed(1)}%` : 'Data tidak tersedia'}

HAFALAN:
${context.hafalan ? `Total Sesi: ${context.hafalan.totalSessions}, Rata-rata Skor: ${context.hafalan.averageScore !== null ? context.hafalan.averageScore.toFixed(1) : 'N/A'}, Surah dipelajari: ${context.hafalan.surahs.join(', ') || 'N/A'}` : 'Data tidak tersedia'}

TAHSIN:
${context.tahsin ? `Total Sesi: ${context.tahsin.totalSessions}, Rata-rata Makhraj: ${context.tahsin.makhrajAvg?.toFixed(1) ?? 'N/A'}, Tajwid: ${context.tahsin.tajwidAvg?.toFixed(1) ?? 'N/A'}, Kelancaran: ${context.tahsin.kelancaranAvg?.toFixed(1) ?? 'N/A'}, Ghunnah: ${context.tahsin.ghunnahAvg?.toFixed(1) ?? 'N/A'}` : 'Data tidak tersedia'}

LAPORAN (CATATAN GURU):
${context.reports ? `Total Laporan: ${context.reports.count}, Rata-rata Adab: ${context.reports.averageAdab?.toFixed(1) ?? 'N/A'}
Catatan Guru:
${context.reports.teacherNotes.length > 0 ? context.reports.teacherNotes.map((n, i) => `${i + 1}. ${n}`).join('\n') : 'Tidak ada catatan khusus.'}` : 'Data tidak tersedia'}
</DATA_AKADEMIK>
`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        system: systemInstruction,
        messages: [{ role: 'user', content: dataContext }],
      }),
    })

    if (!res.ok) {
      throw new Error(`Claude API error status ${res.status}`)
    }

    const data = await res.json()
    const responseText = data.content?.[0]?.text ?? ''
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    
    if (!jsonMatch) {
      throw new Error('Respons AI tidak memiliki format JSON yang diharapkan.')
    }

    const parsed = JSON.parse(jsonMatch[0])
    
    // Validate with Zod
    const validatedData = StudentAnalysisSchema.parse(parsed)
    return validatedData
  } catch (error: any) {
    console.error('Failed to generate AI student analysis:', error)
    if (error instanceof z.ZodError) {
      throw new Error('Respons AI tidak valid (format data tidak sesuai skema).')
    }
    throw error
  }
}
