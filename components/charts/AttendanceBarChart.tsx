'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

interface DataItem {
  m: string
  hadir: number
  izin: number
  sakit: number
  alfa: number
}

interface Props {
  data?: DataItem[]
}

const DEFAULT_DATA: DataItem[] = [
  { m: 'Jan', hadir: 120, izin: 8, sakit: 5, alfa: 2 },
  { m: 'Feb', hadir: 118, izin: 10, sakit: 6, alfa: 1 },
  { m: 'Mar', hadir: 125, izin: 6, sakit: 4, alfa: 0 },
  { m: 'Apr', hadir: 122, izin: 9, sakit: 3, alfa: 1 },
  { m: 'Mei', hadir: 130, izin: 5, sakit: 8, alfa: 2 },
  { m: 'Jun', hadir: 128, izin: 7, sakit: 6, alfa: 4 },
  { m: 'Jul', hadir: 135, izin: 4, sakit: 3, alfa: 3 },
  { m: 'Agu', hadir: 131, izin: 6, sakit: 5, alfa: 2 },
]

export default function AttendanceBarChart({ data = DEFAULT_DATA }: Props) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
        <XAxis dataKey="m" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
        <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }} />
        <Bar dataKey="hadir" fill="#4B21A2" radius={[3, 3, 0, 0]} />
        <Bar dataKey="izin" fill="#FBBF24" radius={[3, 3, 0, 0]} />
        <Bar dataKey="sakit" fill="#F59E0B" radius={[3, 3, 0, 0]} />
        <Bar dataKey="alfa" fill="#DC2626" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
