'use client'

import React from 'react'
import { ReportViewer } from '@/components/finance/ReportViewer'

function formatMoney(amount: string | bigint | number) {
  if (amount === undefined || amount === null) return '-'
  return 'Rp ' + Number(amount).toLocaleString('id-ID')
}

export default function Page() {
  return (
    <ReportViewer 
      title="Laporan Mutasi Dana"
      endpoint="fund-mutation"
      
      columns={[
      { key: 'fundName', label: 'Nama Dana' },
      { key: 'restriction', label: 'Status' },
      { key: 'openingBalance', label: 'Saldo Awal Liquid', format: (v) => formatMoney(v) },
      { key: 'liquidInflow', label: 'Inflow', format: (v) => formatMoney(v) },
      { key: 'liquidOutflow', label: 'Outflow', format: (v) => formatMoney(v) },
      { key: 'closingBalance', label: 'Saldo Akhir Liquid', format: (v) => formatMoney(v) },
      { key: 'periodIncome', label: 'Pendapatan', format: (v) => formatMoney(v) },
      { key: 'periodExpense', label: 'Beban', format: (v) => formatMoney(v) }
    ]}
      
      renderFilters={(filters, setFilters) => (
        <>
          <input 
            type="date" 
            value={filters.from || ''} 
            onChange={e => setFilters({ ...filters, from: e.target.value })}
            className="border-gray-300 rounded-md shadow-sm text-sm"
          />
          <span className="text-gray-500">s/d</span>
          <input 
            type="date" 
            value={filters.to || ''} 
            onChange={e => setFilters({ ...filters, to: e.target.value })}
            className="border-gray-300 rounded-md shadow-sm text-sm"
          />
          
        </>
      )}
    />
  )
}
