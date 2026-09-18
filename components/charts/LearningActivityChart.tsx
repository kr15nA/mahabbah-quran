'use client'

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

interface DataItem {
  m: string
  hafalan: number
  tahsin: number
  penilaian: number
}

interface Props {
  data: DataItem[]
}

export default function LearningActivityChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
        <XAxis dataKey="m" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
        <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} allowDecimals={false} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }} />
        <Line dataKey="hafalan" name="Hafalan" stroke="#4B21A2" strokeWidth={2.5} dot={false} />
        <Line dataKey="tahsin" name="Tahsin" stroke="#FBBF24" strokeWidth={2.5} dot={false} />
        <Line dataKey="penilaian" name="Penilaian" stroke="#16A34A" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
