import { z } from 'zod'
import { getAnthropicApiKey } from '../config/env'
import { buildTahfizFactPack, SmartTahfizFacts } from './tahfiz-fact-pack'

export const AI_TAHFIZ_PROMPT_VERSION = 'v1'
export const AI_TAHFIZ_MODEL = 'claude-sonnet-4-6'

export const GuruTahfizAiSchema = z.object({
  summary: z.string().trim().min(1).max(400).describe("2-3 concise sentences summarizing the student's progress"),
  observations: z.array(z.string().trim().min(1).max(180)).max(3).describe("Max 3 qualitative observations based only on facts"),
  focusDiscussion: z.string().trim().min(1).max(300).describe("1-2 sentences on what to discuss with the student"),
  teacherDraft: z.string().trim().min(1).max(500).describe("One short paragraph for the teacher's draft note or reminder"),
}).strict()

export type GuruTahfizAiResult = z.infer<typeof GuruTahfizAiSchema>

export async function generateTahfizAdvisory(facts: SmartTahfizFacts): Promise<GuruTahfizAiResult> {
  const apiKey = getAnthropicApiKey()
  const factPack = buildTahfizFactPack(facts)

  const systemInstruction = `Anda adalah asisten AI akademik khusus tahfiz untuk guru.
Tugas Anda adalah membaca <FAKTA_SMART_TAHFIZ> dan menghasilkan ringkasan naratif terstruktur HANYA berdasarkan fakta yang diberikan.

ATURAN WAJIB:
1. JANGAN PERNAH mengarang fakta, surah, ayat, juz, atau tanggal.
2. JANGAN menghitung ulang metrik numerik. Gunakan angka persentase/ayat HANYA sebagai referensi kualitatif.
3. JANGAN memberikan otoritas akademik, penilaian kelulusan (lulus/gagal), skor tersembunyi, atau kesiapan Tasmi'. Saran bersifat draf/advisory.
4. JANGAN mengklasifikasikan santri sebagai baik/buruk/kuat/lemah.
5. JANGAN memberikan fatwa, tafsir, teks ayat bahasa Arab, terjemahan, penilaian agama, atau penghakiman spiritual/psikologis.
6. JIKA data tidak cukup, akui bahwa data belum cukup.
7. Guru tetap menjadi pengambil keputusan utama.
8. Gunakan bahasa Indonesia yang ringkas, netral, objektif, suportif, dan berbasis fakta.
9. JANGAN sertakan field lain selain yang diminta dalam JSON schema.

Hasilkan HANYA JSON valid sesuai struktur berikut tanpa blok markdown/teks tambahan:
{
  "summary": "string (2-3 kalimat)",
  "observations": ["string", ... (maksimal 3 item)"],
  "focusDiscussion": "string (1-2 kalimat)",
  "teacherDraft": "string (1 paragraf pendek)"
}`

  const abortController = new AbortController()
  const timeoutId = setTimeout(() => abortController.abort(), 10000)

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      signal: abortController.signal,
      body: JSON.stringify({
        model: AI_TAHFIZ_MODEL,
        max_tokens: 300,
        system: systemInstruction,
        messages: [{ role: 'user', content: factPack }],
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
    return GuruTahfizAiSchema.parse(parsed)
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Timeout: Layanan AI membutuhkan waktu terlalu lama.')
    }
    if (error instanceof z.ZodError) {
      throw new Error('Respons AI tidak valid (format data tidak sesuai skema).')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}
