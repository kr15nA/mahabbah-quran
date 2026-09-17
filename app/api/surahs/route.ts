import { NextResponse } from 'next/server'
import { getAllSurahs } from '@/lib/db/queries/surahs'

export const revalidate = 86400 // 24 hours

export async function GET() {
  const surahs = await getAllSurahs()
  return NextResponse.json({ data: surahs })
}
