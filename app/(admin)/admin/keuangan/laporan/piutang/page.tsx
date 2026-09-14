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
      title="Laporan Piutang & Aging"
      endpoint="receivable-aging"
      
      columns={[
      { key: 'dueDate', label: 'Jatuh Tempo' },
      { key: 'invoiceNumber', label: 'No Tagihan' },
      { key: 'studentName', label: 'Nama Santri' },
      { key: 'feeType', label: 'Jenis Tagihan' },
      { key: 'daysOverdue', label: 'Hari Terlambat' },
      { key: 'bucket', label: 'Aging Bucket' },
      { key: 'outstanding', label: 'Sisa Tagihan', format: (v) => formatMoney(v) }
    ]}
      renderSummary={(summary) => (
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs font-medium">
        <div className="bg-white p-3 rounded shadow">Not Due: {formatMoney(summary.summary.NOT_DUE)}</div>
        <div className="bg-white p-3 rounded shadow">1-30: {formatMoney(summary.summary._1_30)}</div>
        <div className="bg-white p-3 rounded shadow">31-60: {formatMoney(summary.summary._31_60)}</div>
        <div className="bg-white p-3 rounded shadow">61-90: {formatMoney(summary.summary._61_90)}</div>
        <div className="bg-white p-3 rounded shadow">&gt;90: {formatMoney(summary.summary.OVER_90)}</div>
        <div className="bg-gold-50 p-3 rounded shadow text-gold-800">Total: {formatMoney(summary.summary.TOTAL)}</div>
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
