import { z } from 'zod'

function createSanitizedError(variableName: string, error: z.ZodError): Error {
  // Extract just the failure reason for the specific variable without including the value
  const issue = error.issues[0]
  const message = issue ? issue.message : 'Invalid value'
  return new Error(`Missing or invalid environment variable: ${variableName} (${message})`)
}

export function getDatabaseUrl(): string {
  const schema = z.string().min(1, 'Cannot be empty').url('Must be a valid URL').regex(/^postgres(ql)?:\/\//, 'Must be a postgres:// or postgresql:// URL')
  const result = schema.safeParse(process.env.DATABASE_URL)
  if (!result.success) {
    throw createSanitizedError('DATABASE_URL', result.error)
  }
  return result.data
}

export function getJwtSecret(): string {
  const schema = z.string().min(1, 'Cannot be empty')
  const result = schema.safeParse(process.env.JWT_SECRET)
  if (!result.success) {
    throw createSanitizedError('JWT_SECRET', result.error)
  }
  return result.data
}

export function getAnthropicApiKey(): string {
  const schema = z.string().min(1, 'Cannot be empty')
  const result = schema.safeParse(process.env.ANTHROPIC_API_KEY)
  if (!result.success) {
    throw createSanitizedError('ANTHROPIC_API_KEY', result.error)
  }
  return result.data
}

export function getBlobToken(): string {
  const schema = z.string().min(1, 'Cannot be empty')
  const result = schema.safeParse(process.env.BLOB_READ_WRITE_TOKEN)
  if (!result.success) {
    throw createSanitizedError('BLOB_READ_WRITE_TOKEN', result.error)
  }
  return result.data
}
