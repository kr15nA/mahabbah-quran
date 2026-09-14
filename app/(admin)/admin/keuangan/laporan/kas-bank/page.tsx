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
      title="Laporan Kas & Bank"
      endpoint="cash-bank"
      
      columns={[
      { key: 'date', label: 'Tanggal' },
      { key: 'documentNumber', label: 'No Dokumen' },
      { key: 'accountName', label: 'Akun' },
      { key: 'description', label: 'Keterangan' },
      { key: 'fundName', label: 'Dana' },
      { key: 'debit', label: 'Masuk', format: (v) => formatMoney(v) },
      { key: 'credit', label: 'Keluar', format: (v) => formatMoney(v) }
    ]}
      renderSummary={(summary) => (
      <div className="grid grid-cols-2 gap-4 text-sm font-medium">
        <div className="bg-white p-4 rounded shadow">Saldo Awal: {formatMoney(summary.openingBalance)}</div>
        <div className="bg-white p-4 rounded shadow">Saldo Akhir: {formatMoney(summary.closingBalance)}</div>
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
