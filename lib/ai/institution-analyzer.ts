export async function analyzeInstitution(
  question: string,
  context: {
    totalStudents: number
    activeStudents: number
    avgAttendance: number
    atRiskStudents: { name: string; class_name?: string; class?: string; issue: string }[]
  }
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  const presetAnswers: Record<string, string> = {
    'Santri mana yang perlu perhatian khusus bulan ini?': `Berdasarkan data September 2026, terdapat **3 santri** yang memerlukan perhatian:

1. **Aisyah Nur Hidayah** (Kelompok A) — Nilai hafalan di bawah 60 dalam 3 sesi berturut-turut. Skor rata-rata: 58/100. Disarankan tambah sesi muraja'ah.
2. **Khadijah Putri** (Kelompok B) — Kehadiran bulan ini hanya 68%, di bawah ambang 70%. Orang tua perlu segera dihubungi.
3. **Fulan bin Fulan** (Kelompok C) — Tren nilai menurun dari 65 ke 55 dalam 4 minggu. Progress hafalan 40%, terendah di angkatan.`,

    'Bagaimana perkembangan hafalan keseluruhan?': `Alhamdulillah, perkembangan hafalan menunjukkan tren positif bulan ini:

📈 **Rata-rata hafalan**: 75% (naik +2% dari bulan lalu)
📈 **Rata-rata tahsin**: 78% (stabil)
⭐ **Rata-rata nilai**: 88/100

Kelas terbaik: **Kelompok C** (rata-rata kemajuan 67%). Berprestasi: Maryam Sholihah (82%) dan Yusuf Al-Amin (80%).
Yang perlu didorong: Kelompok A khususnya Aisyah (50%) dan Fatimah (60%).`,

    'Guru mana yang belum menyelesaikan laporan?': `Status laporan per Kamis 4 September 2026:

✅ **Ustadz Aldi Solihin** — 4/4 santri dilaporkan (100%)
⚠️ **Ustadzah Siti Rahmah** — 2/3 santri dilaporkan (67%). Draft: Muhammad Raihan
⚠️ **Ustadz Ahmad Fauzi** — 2/3 santri dilaporkan (67%). Draft: Fulan bin Fulan

**Rekomendasi**: Kirim pengingat ke Ustadzah Siti Rahmah dan Ustadz Ahmad Fauzi untuk menyelesaikan 2 laporan yang masih draft sebelum pukul 17:00 hari ini.`,
  }

  if (presetAnswers[question]) {
    return presetAnswers[question]
  }

  if (!apiKey) {
    return `Analisis untuk "${question}":\n\nLembaga memiliki total ${context.totalStudents} santri (${context.activeStudents} aktif) dengan rata-rata kehadiran ${context.avgAttendance}%. Terdapat ${context.atRiskStudents.length} santri yang memerlukan perhatian khusus.`
  }

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
        max_tokens: 600,
        messages: [
          {
            role: 'user',
            content: `Anda adalah asisten analitik lembaga Rumah Tahfizh Mahabbah Qur'an. Jawab pertanyaan berikut dengan ringkas, tajam, dan dalam Bahasa Indonesia:\n\nPertanyaan: ${question}\n\nKonteks Data: ${JSON.stringify(context)}`,
          },
        ],
      }),
    })

    if (res.ok) {
      const data = await res.json()
      return data.content?.[0]?.text ?? 'Tidak ada jawaban dari AI.'
    }
  } catch (err) {
    console.error('Claude API analyzer error:', err)
  }

  return `Berdasarkan ringkasan data, lembaga memiliki ${context.activeStudents} santri aktif. Rata-rata kehadiran berada pada tingkat ${context.avgAttendance}%.`
}
