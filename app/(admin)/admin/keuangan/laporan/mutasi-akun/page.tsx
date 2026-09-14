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
      title="Laporan Mutasi Akun"
      endpoint="account-mutation"
      defaultFilters={{ accountId: '1' }}
      columns={[
      { key: 'accountCode', label: 'Kode Akun' },
      { key: 'accountName', label: 'Nama Akun' },
      { key: 'openingBalance', label: 'Saldo Awal', format: (v) => formatMoney(v) },
      { key: 'periodDebit', label: 'Debit', format: (v) => formatMoney(v) },
      { key: 'periodCredit', label: 'Kredit', format: (v) => formatMoney(v) },
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
          
            <input 
              type="text" 
              placeholder="Account ID"
              value={filters.accountId || ''} 
              onChange={e => setFilters({ ...filters, accountId: e.target.value })}
              className="border-gray-300 rounded-md shadow-sm text-sm ml-2"
            />
          
        </>
      )}
    />
  )
}
