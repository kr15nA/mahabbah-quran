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
      title="Laporan Campaign"
      endpoint="ziswaf-campaigns"
      
      columns={[
      { key: 'campaignName', label: 'Nama Campaign' },
      { key: 'receiptCount', label: 'Jumlah Transaksi' },
      { key: 'grossReceived', label: 'Penerimaan Gross', format: (v) => formatMoney(v) },
      { key: 'refunds', label: 'Refunds', format: (v) => formatMoney(v) },
      { key: 'netReceived', label: 'Penerimaan Net', format: (v) => formatMoney(v) }
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
