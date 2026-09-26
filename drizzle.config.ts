import { defineConfig } from 'drizzle-kit'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

import { getDatabaseUrl } from './lib/config/env'

export default defineConfig({
  dialect: 'postgresql',
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  dbCredentials: {
    url: getDatabaseUrl(),
  },
})
