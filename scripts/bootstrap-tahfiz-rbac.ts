import { db } from '../lib/db/client'
import { permissions } from '../drizzle/schema'
import { assertSafeMutatingDbTestEnvironment } from './lib/assert-safe-mutating-db-test'

async function bootstrap() {
  assertSafeMutatingDbTestEnvironment()
  
  console.log('Adding academic.tahfiz.manage permission...')
  await db.insert(permissions)
    .values({
      code: 'academic.tahfiz.manage',
      name: 'Manage Tahfiz',
      description: 'Allows managing student tahfiz records and targets'
    })
    .onConflictDoNothing()

  console.log('Done.')
}

bootstrap().catch(console.error).then(() => process.exit(0))
