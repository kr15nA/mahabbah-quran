import assert from 'assert'
import { getCanonicalSurahDetail, QURAN_RECITERS } from '../lib/quran/service'

async function runTests() {
  console.log('=== SANTRI-AUDIO-001 Quran Reciter Audio Tests ===\n')

  // 1. Reciters constant check
  console.log('--- 1. Reciter Reference Verification ---')
  assert.ok(Array.isArray(QURAN_RECITERS), 'QURAN_RECITERS must be an array')
  assert.strictEqual(QURAN_RECITERS.length, 6, 'Must provide 6 canonical reciters from equran.id')
  const defaultReciter = QURAN_RECITERS.find((r) => r.id === '05')
  assert.ok(defaultReciter, 'Default reciter 05 (Misyari Rasyid) must exist')
  console.log('✅ Canonical reciters catalog verified:', QURAN_RECITERS.map((r) => `${r.id}: ${r.name}`).join(', '))

  // 2. Fetch canonical surah detail with audio
  console.log('--- 2. Fetch Canonical Surah Detail with Audio ---')
  const surah1 = await getCanonicalSurahDetail(1)
  assert.ok(surah1, 'Surah 1 (Al-Fatihah) must load successfully')
  assert.strictEqual(surah1.nomor, 1, 'Surah number must be 1')
  assert.strictEqual(surah1.jumlahAyat, 7, 'Surah 1 must have 7 ayat')

  // 3. Surah-level audio (audioFull) validation
  console.log('--- 3. Surah Full Audio Validation ---')
  assert.ok(surah1.audioFull, 'Surah 1 must include audioFull object')
  for (const reciter of QURAN_RECITERS) {
    const audioUrl = surah1.audioFull[reciter.id]
    assert.ok(audioUrl, `Surah 1 must have audio URL for reciter ${reciter.name}`)
    assert.ok(audioUrl.startsWith('https://'), `Audio URL must be HTTPS: ${audioUrl}`)
    assert.ok(audioUrl.endsWith('.mp3'), `Audio URL must be mp3: ${audioUrl}`)
  }
  console.log('✅ Full surah audio streams verified across all 6 reciters')

  // 4. Ayah-level audio validation
  console.log('--- 4. Per-Ayah Audio Streams Validation ---')
  for (let i = 0; i < surah1.ayat.length; i++) {
    const ayah = surah1.ayat[i]
    assert.ok(ayah.audio, `Ayah ${ayah.nomorAyat} must include audio object`)
    const ayahAudio05 = ayah.audio['05']
    assert.ok(ayahAudio05, `Ayah ${ayah.nomorAyat} must have reciter 05 audio`)
    assert.ok(ayahAudio05.startsWith('https://'), `Ayah audio must be HTTPS: ${ayahAudio05}`)
  }
  console.log(`✅ All ${surah1.ayat.length} ayat in Al-Fatihah have valid per-ayah audio streams`)

  // 5. Boundary and resilience checks
  console.log('--- 5. Boundary & Resilience Checks ---')
  const invalidLow = await getCanonicalSurahDetail(0)
  assert.strictEqual(invalidLow, null, 'Surah 0 must return null')

  const invalidHigh = await getCanonicalSurahDetail(115)
  assert.strictEqual(invalidHigh, null, 'Surah 115 must return null')

  const invalidNan = await getCanonicalSurahDetail(NaN)
  assert.strictEqual(invalidNan, null, 'NaN surah must return null')
  console.log('✅ Boundary checks pass gracefully without uncaught exceptions')

  console.log('\n🎉 ALL SANTRI-AUDIO-001 TESTS PASSED!')
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
