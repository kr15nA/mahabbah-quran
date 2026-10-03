import { NextFocusRange, ActivitySummary, MurajaahRecency } from '../tahfiz/smart'

export type SmartTahfizFacts = {
  hasActiveTarget: boolean
  targetProgressPercent: number | null
  remainingAyahs: number | null
  nextFocus: NextFocusRange | null
  activity30d: ActivitySummary
  murajaahRecency: MurajaahRecency
  stalled: boolean
}

export function buildTahfizFactPack(facts: SmartTahfizFacts): string {
  let pack = '<FAKTA_SMART_TAHFIZ>\n'
  
  if (facts.hasActiveTarget) {
    pack += `TARGET AKTIF: YA\n`
    pack += `PROGRES TARGET: ${facts.targetProgressPercent !== null ? facts.targetProgressPercent.toFixed(1) : '0.0'}%\n`
    pack += `SISA AYAT TARGET: ${facts.remainingAyahs ?? 0} ayat\n`
    pack += `STATUS TARGET: ${facts.stalled ? 'TERHENTI (Tidak ada aktivitas >= 14 hari)' : 'AKTIF'}\n`
    if (facts.nextFocus) {
      pack += `FOKUS HAFALAN BERIKUTNYA: Surah ${facts.nextFocus.surahNameLatin} ayat ${facts.nextFocus.ayahStart}-${facts.nextFocus.ayahEnd}\n`
    } else {
      pack += `FOKUS HAFALAN BERIKUTNYA: Selesai\n`
    }
  } else {
    pack += `TARGET AKTIF: TIDAK ADA\n`
  }

  pack += `\nAKTIVITAS 30 HARI TERAKHIR:\n`
  pack += `- Hafalan Baru: ${facts.activity30d.hafalanBaru} sesi\n`
  pack += `- Muraja'ah: ${facts.activity30d.murajaah} sesi\n`

  pack += `\nSTATUS MURAJA'AH:\n`
  if (facts.murajaahRecency.status === 'NO_MURAJAAH_RECORD') {
    pack += `- Belum ada catatan Muraja'ah yang relevan.\n`
  } else {
    pack += `- Terakhir Muraja'ah: ${facts.murajaahRecency.daysSinceLast} hari yang lalu\n`
  }

  pack += '</FAKTA_SMART_TAHFIZ>'
  
  return pack
}
