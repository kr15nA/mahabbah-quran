import { neon, neonConfig } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'

import { getDatabaseUrl } from '../config/env'

neonConfig.fetchConnectionCache = true

export const sql = neon(getDatabaseUrl())
export const db = drizzle(sql)
