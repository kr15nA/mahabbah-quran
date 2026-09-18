import { getFamilyDashboardData } from '../lib/guardians/family-dashboard'
import { db } from '../lib/db/client'
import { users } from '../drizzle/schema'
import { eq } from 'drizzle-orm'

async function run() {
  console.log('--- STARTING C2 TEST ---')

  // Find a parent
  const parentRows = await db.select().from(users).where(eq(users.role, 'orang_tua')).limit(5)
  if (parentRows.length === 0) {
    console.error('No parent found in DB')
    process.exit(1)
  }

  let foundData = false

  for (const parent of parentRows) {
    const data = await getFamilyDashboardData(parent.id)
    if (data.length > 0) {
      console.log(`\nFound ${data.length} children for parent ${parent.fullName} (ID: ${parent.id})`)
      foundData = true

      for (const child of data) {
        console.log(`\nCHILD: ${child.student_name} (${child.student_id})`)
        console.log(`Context: ${child.class_name} | ${child.program_name} | Guru: ${child.teacher_name}`)
        
        console.log('ATTENDANCE:')
        console.dir(child.attendance)

        console.log('HAFALAN:')
        console.dir(child.hafalan)

        console.log('TAHSIN:')
        console.dir(child.tahsin)

        console.log('REPORT:')
        console.dir(child.report)

        // Tests
        if (typeof child.student_id !== 'string') {
          throw new Error(`student_id must be string, got ${typeof child.student_id}`)
        }
        if (!child.attendance.available || !child.hafalan.available || !child.tahsin.available || !child.report.available) {
          console.warn('WARNING: some metrics are not available.')
        }
      }
      break
    }
  }

  if (!foundData) {
    console.log('No parent with children found, but script ran successfully.')
  } else {
    console.log('\n--- ALL C2 TESTS PASSED ---')
  }

  process.exit(0)
}

run().catch(e => {
  console.error(e)
  process.exit(1)
})
