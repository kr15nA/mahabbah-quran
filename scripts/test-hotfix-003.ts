import { getZiswafSummaryMetrics } from '../lib/finance/ziswaf-dashboard'
async function test() {
  const range = { from: '2026-08-31', to: '2026-09-18' }
  try {
    await getZiswafSummaryMetrics(range)
    console.log('Success')
  } catch (e) {
    console.error('Failed!', e)
  }
}
test()
