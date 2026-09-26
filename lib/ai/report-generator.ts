import { LearningReportRow } from '@/lib/db/queries/learning-reports'
import { getAnthropicApiKey } from '../config/env'

export type AIReportResult = {
  reportText: string
  parentAdvice: string
}

export async function generateAIReport(report: LearningReportRow): Promise<AIReportResult> {
  const apiKey = getAnthropicApiKey()

  const prompt = `
Anda adalah asisten AI guru Al-Qur'an di Rumah Tahfizh Mahabbah Qur'an.
Buatkan ringkasan naratif perkembangan pembelajaran santri berikut dalam Bahasa Indonesia yang santun, memotivasi, dan profesional.

Data Santri:
- Nama: ${report.student_name}
- Tanggal: ${report.report_date}
- Kehadiran: ${report.attendance_status}
- Surah & Ayat: QS. ${report.surah_name_latin ?? '-'} ayat ${report.ayah_start ?? 1}-${report.ayah_end ?? 10} (${report.hafalan_type === 'hafalan_baru' ? 'Hafalan Baru' : 'Muraja\'ah'})
- Nilai Hafalan: ${report.hafalan_score ?? 80}/100
- Nilai Tahsin: ${report.tahsin_score ?? 80}/100
- Nilai Adab: ${report.adab_score ?? 85}/100
- Catatan Guru: ${report.teacher_notes ?? 'Tingkatkan latihan di rumah'}

Hasilkan respon HANYA dalam format JSON valid:
{
  "reportText": "Naratif ringkasan pembelajaran untuk orang tua (2-3 kalimat)",
  "parentAdvice": "Saran konkrit dan praktis untuk orang tua mendampingi di rumah (1-2 kalimat)"
}
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
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) throw new Error(`Claude API error status ${res.status}`)

    const data = await res.json()
    const responseText = data.content?.[0]?.text ?? ''
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        reportText: parsed.reportText,
        parentAdvice: parsed.parentAdvice,
      }
    }
  } catch (err) {
    console.error('Failed to generate AI report via Claude API:', err)
  }

  return {
    reportText: `Alhamdulillah, ${report.student_name} telah menyelesaikan kegiatan hafalan QS. ${report.surah_name_latin ?? 'An-Naba'} dengan baik (nilai ${report.hafalan_score ?? 85}/100). ${report.teacher_notes || ''}`,
    parentAdvice: `Mohon motivasi ${report.student_name} untuk selalu mengulang bacaan hafalan di rumah secara rutin.`,
  }
}
