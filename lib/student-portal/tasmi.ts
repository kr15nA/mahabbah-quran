import { requireSelfStudentProfile } from '@/lib/identity/learner'
import { getTasmiHistory, type TasmiHistoryRow } from '@/lib/tasmi/queries'

export type MyTasmiHistoryRow = Omit<TasmiHistoryRow, 'notes'>

export async function getMyLatestTasmi(userId: number) {
  const profile = await requireSelfStudentProfile(userId)
  const studentId = Number(profile.id)
  
  const history = await getTasmiHistory(studentId, 1, 0)
  if (history.data.length === 0) return null

  const row = history.data[0]
  const { notes, ...safeRow } = row
  return safeRow as MyTasmiHistoryRow
}

export async function getMyTasmiHistory(userId: number, page: number = 1, limit: number = 20) {
  const profile = await requireSelfStudentProfile(userId)
  const studentId = Number(profile.id)
  
  const offset = (page - 1) * limit
  
  const history = await getTasmiHistory(studentId, limit, offset)
  
  const safeItems = history.data.map(row => {
    const { notes, ...safeRow } = row
    return safeRow as MyTasmiHistoryRow
  })

  return {
    items: safeItems,
    page,
    pageSize: limit,
    total: history.total
  }
}
