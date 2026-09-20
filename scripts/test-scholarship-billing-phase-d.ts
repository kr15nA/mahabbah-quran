import { assertSafeMutatingDbTestEnvironment } from './lib/assert-safe-mutating-db-test'
assertSafeMutatingDbTestEnvironment()

import { getScholarshipReportingSummary, getScholarshipInvoiceHistory } from '../lib/finance/scholarships/queries'
import { resolveParentChildContext } from '../lib/guardians/parent-context'
import { canAccessStudentFinance } from '../lib/finance/authorization'



async function runTests() {
  console.log('--- TEST 1: KPI Summary ---')
  try {
    const summary = await getScholarshipReportingSummary({})
    console.log('KPI Summary:', summary)
    if (summary.totalGross) console.log('KPI Summary PASS')
  } catch (e) {
    console.error('KPI Summary FAIL', e)
  }

  console.log('\n--- TEST 2: Invoice History ---')
  try {
    const history = await getScholarshipInvoiceHistory({ page: 1, limit: 10 })
    console.log(`Found ${history.data.length} invoices.`)
    console.log('Invoice History PASS')
  } catch (e) {
    console.error('Invoice History FAIL', e)
  }

  console.log('\n--- TEST 3: IDOR Prevention in Parent Context ---')
  try {
    // We mock a session and try to resolve an invalid child ID
    const res = await resolveParentChildContext({
      userId: 99999, // Fake parent
      requestedChildId: '1' // Some random student ID
    })
    console.log('Resolution Status:', res.status)
    if (res.status === 'NO_CHILDREN' || res.status === 'FORBIDDEN_CHILD') {
      console.log('IDOR Prevention PASS')
    } else {
      console.error('IDOR Prevention FAIL (Expected failure)')
    }
  } catch (e) {
    console.error('IDOR Prevention FAIL', e)
  }

  process.exit(0)
}

runTests()
