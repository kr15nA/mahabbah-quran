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
  data: DataItem[]
}

export default function AttendanceBarChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
        <XAxis dataKey="m" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
        <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} allowDecimals={false} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }} />
        <Bar dataKey="hadir" name="Hadir" fill="#4B21A2" radius={[3, 3, 0, 0]} />
        <Bar dataKey="izin" name="Izin" fill="#FBBF24" radius={[3, 3, 0, 0]} />
        <Bar dataKey="sakit" name="Sakit" fill="#F59E0B" radius={[3, 3, 0, 0]} />
        <Bar dataKey="alfa" name="Alfa" fill="#DC2626" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
