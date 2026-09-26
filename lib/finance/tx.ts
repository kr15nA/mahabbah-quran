import { Pool } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import { getDatabaseUrl } from '../config/env'

const pool = new Pool({ connectionString: getDatabaseUrl() })
export const financeDb = drizzle(pool)
