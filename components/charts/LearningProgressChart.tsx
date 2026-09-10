'use client'

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

interface DataItem {
  m: string
  hafalan: number
  tahsin: number
  score: number
}

interface Props {
  data?: DataItem[]
}

const DEFAULT_DATA: DataItem[] = [
  { m: 'Jan', hafalan: 45, tahsin: 52, score: 70 },
  { m: 'Feb', hafalan: 52, tahsin: 55, score: 74 },
  { m: 'Mar', hafalan: 58, tahsin: 60, score: 77 },
  { m: 'Apr', hafalan: 63, tahsin: 65, score: 79 },
  { m: 'Mei', hafalan: 67, tahsin: 68, score: 82 },
  { m: 'Jun', hafalan: 70, tahsin: 72, score: 84 },
  { m: 'Jul', hafalan: 73, tahsin: 75, score: 86 },
  { m: 'Agu', hafalan: 75, tahsin: 78, score: 88 },
]

export default function LearningProgressChart({ data = DEFAULT_DATA }: Props) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
        <XAxis dataKey="m" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }} />
        <Line dataKey="hafalan" stroke="#4B21A2" strokeWidth={2.5} dot={false} />
        <Line dataKey="tahsin" stroke="#FBBF24" strokeWidth={2.5} dot={false} />
        <Line dataKey="score" stroke="#16A34A" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
