'use client'

import { Card } from '@/components/ui/Card'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'
import { formatRupiah } from '@/lib/finance/utils'

interface FinanceTrendChartProps {
  data: any[]
}

export function FinanceTrendChart({ data }: FinanceTrendChartProps) {
  if (!data) {
    return (
      <Card className="p-6 h-96 flex flex-col items-center justify-center text-gray-500 bg-gray-50/50 shadow-sm border border-gray-100">
        <p>Data Tren belum dapat dimuat</p>
      </Card>
    )
  }
  if (data.length === 0) {
    return (
      <Card className="p-6 h-96 flex flex-col items-center justify-center text-gray-500 bg-gray-50/50 shadow-sm border border-gray-100">
        <p>Belum ada data tren pada periode ini</p>
      </Card>
    )
  }

  // Format data
  const chartData = data.map(d => ({
    date: new Date(d.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
    Pemasukan: Number(BigInt(d.income)),
    Pengeluaran: Number(BigInt(d.expense))
  }))

  return (
    <Card className="p-6 h-full shadow-sm border border-gray-100 flex flex-col">
      <div className="mb-6 flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900">Grafik Pemasukan vs Pengeluaran</h3>
      </div>
      <div className="flex-1 w-full min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#64748b' }} 
              tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} 
              width={40} 
            />
            <Tooltip 
              formatter={(value: any) => [formatRupiah(BigInt(Number(value))), '']}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -1px rgb(0 0 0 / 0.06)' }}
            />
            <Legend verticalAlign="bottom" height={36} iconType="circle" />
            <Area name="Pemasukan" type="monotone" dataKey="Pemasukan" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
            <Area name="Pengeluaran" type="monotone" dataKey="Pengeluaran" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
