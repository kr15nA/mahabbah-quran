import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission, AuthError } from '@/lib/auth/rbac'
import { linkStudentToUser, unlinkStudentFromUser, relinkStudentUser } from '@/lib/identity/manage'

const linkSchema = z.object({
  operation: z.literal('link'),
  studentId: z.union([z.string(), z.number()]),
  userId: z.number()
})

const unlinkSchema = z.object({
  operation: z.literal('unlink'),
  studentId: z.union([z.string(), z.number()])
})

const relinkSchema = z.object({
  operation: z.literal('relink'),
  studentId: z.union([z.string(), z.number()]),
  newUserId: z.number()
})

const payloadSchema = z.discriminatedUnion('operation', [
  linkSchema,
  unlinkSchema,
  relinkSchema
])

export async function POST(req: NextRequest) {
  try {
    const { session } = await requirePermission('system.user.manage')
    
    const body = await req.json()
    const payload = payloadSchema.parse(body)

    let result
    switch (payload.operation) {
      case 'link':
        result = await linkStudentToUser({
          actorUserId: session.userId,
          studentIdRaw: payload.studentId,
          userId: payload.userId
        })
        break
      case 'unlink':
        result = await unlinkStudentFromUser({
          actorUserId: session.userId,
          studentIdRaw: payload.studentId
        })
        break
      case 'relink':
        result = await relinkStudentUser({
          actorUserId: session.userId,
          studentIdRaw: payload.studentId,
          newUserId: payload.newUserId
        })
        break
    }

    return NextResponse.json(result)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Identity link error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 400 })
  }
}
