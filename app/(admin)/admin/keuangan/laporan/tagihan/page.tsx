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
      title="Laporan Tagihan Akademik"
      endpoint="academic-billing"
      
      columns={[
      { key: 'dueDate', label: 'Jatuh Tempo' },
      { key: 'invoiceNumber', label: 'No Tagihan' },
      { key: 'studentName', label: 'Nama Santri' },
      { key: 'feeType', label: 'Jenis Tagihan' },
      { key: 'status', label: 'Status' },
      { key: 'amount', label: 'Nominal', format: (v) => formatMoney(v) },
      { key: 'outstanding', label: 'Sisa Tagihan', format: (v) => formatMoney(v) }
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
