import { NextResponse } from 'next/server'
import { getAllSurahs } from '@/lib/db/queries/surahs'

export async function GET() {
  const surahs = await getAllSurahs()
  return NextResponse.json({ data: surahs })
}
