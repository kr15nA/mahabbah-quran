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
      title="Rekonsiliasi Akademik vs Buku Besar"
      endpoint="academic-reconciliation"
      
      columns={[
      { key: 'businessOutstanding', label: 'Piutang Sistem (Business)', format: (v) => formatMoney(v) },
      { key: 'ledgerReceivable', label: 'Piutang Buku Besar (Ledger)', format: (v) => formatMoney(v) },
      { key: 'difference', label: 'Selisih', format: (v) => formatMoney(v) },
      { key: 'isReconciled', label: 'Status', format: (v) => v ? 'MATCH' : 'UNMATCHED' }
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
