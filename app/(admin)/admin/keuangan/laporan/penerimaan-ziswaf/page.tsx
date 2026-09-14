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
      title="Laporan Penerimaan ZISWAF"
      endpoint="ziswaf-receipts"
      
      columns={[
      { key: 'date', label: 'Tanggal' },
      { key: 'receiptNumber', label: 'No Kuitansi' },
      { key: 'donor', label: 'Nama Donatur' },
      { key: 'ziswafType', label: 'Jenis ZISWAF' },
      { key: 'funds', label: 'Dana' },
      { key: 'status', label: 'Status' },
      { key: 'amount', label: 'Nominal', format: (v) => formatMoney(v) }
    ]}
      renderSummary={(summary) => (
      <div className="grid grid-cols-3 gap-4 text-sm font-medium">
        <div className="bg-white p-4 rounded shadow text-green-700">Gross: {formatMoney(summary.grossReceived)}</div>
        <div className="bg-white p-4 rounded shadow text-red-700">Refund: {formatMoney(summary.refunds)}</div>
        <div className="bg-white p-4 rounded shadow text-blue-700">Net: {formatMoney(summary.netReceived)}</div>
      </div>
    )}
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
