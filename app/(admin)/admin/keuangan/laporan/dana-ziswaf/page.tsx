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
      title="Laporan Dana ZISWAF"
      endpoint="ziswaf-funds"
      
      columns={[
      { key: 'fundName', label: 'Nama Dana' },
      { key: 'ziswafType', label: 'Jenis ZISWAF' },
      { key: 'openingBalance', label: 'Saldo Awal', format: (v) => formatMoney(v) },
      { key: 'received', label: 'Penerimaan', format: (v) => formatMoney(v) },
      { key: 'distributed', label: 'Penyaluran', format: (v) => formatMoney(v) },
      { key: 'closingBalance', label: 'Saldo Akhir', format: (v) => formatMoney(v) }
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
