import { getChildrenByParent } from '../lib/db/queries/student-parents'
import { getLearningReportsByStudent } from '../lib/db/queries/learning-reports'
import { sql } from '../lib/db/client'

async function run() {
  try {
    console.log('Testing getChildrenByParent...')
    const children = await getChildrenByParent(5) // Using an existing parent ID
    console.log('Children:', children)

    console.log('Testing getLearningReportsByStudent...')
    // Use an existing student ID
    const reports = await getLearningReportsByStudent(1, 1)
    console.log('Reports:', reports)

    console.log('All tests passed successfully.')
  } catch (err) {
    console.error('Test failed:', err)
    process.exit(1)
  }
  process.exit(0)
}
run()
