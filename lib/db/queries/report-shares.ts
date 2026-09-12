import { eq, and, desc, isNull, gt } from 'drizzle-orm'
import { db } from '../client'
import { reportShares } from '../../../drizzle/schema'

export async function createReportShare(data: {
  reportId: number
  creatorId: number
  tokenHash: string
  expiresAt: Date
}) {
  const [share] = await db.insert(reportShares).values(data).returning()
  return share
}

export async function revokeActiveSharesForReport(reportId: number) {
  return await db.update(reportShares)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(reportShares.reportId, reportId),
        isNull(reportShares.revokedAt)
      )
    )
}

export async function getActiveShareByTokenHash(tokenHash: string) {
  const [share] = await db.select()
    .from(reportShares)
    .where(
      and(
        eq(reportShares.tokenHash, tokenHash),
        isNull(reportShares.revokedAt),
        gt(reportShares.expiresAt, new Date())
      )
    )
    .limit(1)
  
  return share || null
}

export async function revokeShareById(id: number) {
  return await db.update(reportShares)
    .set({ revokedAt: new Date() })
    .where(eq(reportShares.id, id))
}

export async function getActiveShareByReportId(reportId: number) {
  const [share] = await db.select()
    .from(reportShares)
    .where(
      and(
        eq(reportShares.reportId, reportId),
        isNull(reportShares.revokedAt),
        gt(reportShares.expiresAt, new Date())
      )
    )
    .orderBy(desc(reportShares.createdAt))
    .limit(1)

  return share || null
}
