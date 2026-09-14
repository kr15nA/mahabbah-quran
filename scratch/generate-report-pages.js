const fs = require('fs');
const path = require('path');

const uiRoutes = [
  { 
    path: 'jurnal', 
    title: 'Laporan Jurnal Transaksi', 
    endpoint: 'journal',
    columns: `[
      { key: 'date', label: 'Tanggal' },
      { key: 'journalNumber', label: 'No Jurnal' },
      { key: 'accountName', label: 'Akun' },
      { key: 'description', label: 'Keterangan' },
      { key: 'fundName', label: 'Dana' },
      { key: 'debit', label: 'Debit', format: (v) => formatMoney(v) },
      { key: 'credit', label: 'Kredit', format: (v) => formatMoney(v) }
    ]`
  },
  { 
    path: 'mutasi-akun', 
    title: 'Laporan Mutasi Akun', 
    endpoint: 'account-mutation',
    defaultFilters: `{ accountId: '1' }`, // Dummy default
    columns: `[
      { key: 'accountCode', label: 'Kode Akun' },
      { key: 'accountName', label: 'Nama Akun' },
      { key: 'openingBalance', label: 'Saldo Awal', format: (v) => formatMoney(v) },
      { key: 'periodDebit', label: 'Debit', format: (v) => formatMoney(v) },
      { key: 'periodCredit', label: 'Kredit', format: (v) => formatMoney(v) },
      { key: 'closingBalance', label: 'Saldo Akhir', format: (v) => formatMoney(v) }
    ]`
  },
  { 
    path: 'mutasi-dana', 
    title: 'Laporan Mutasi Dana', 
    endpoint: 'fund-mutation',
    columns: `[
      { key: 'fundName', label: 'Nama Dana' },
      { key: 'restriction', label: 'Status' },
      { key: 'openingBalance', label: 'Saldo Awal Liquid', format: (v) => formatMoney(v) },
      { key: 'liquidInflow', label: 'Inflow', format: (v) => formatMoney(v) },
      { key: 'liquidOutflow', label: 'Outflow', format: (v) => formatMoney(v) },
      { key: 'closingBalance', label: 'Saldo Akhir Liquid', format: (v) => formatMoney(v) },
      { key: 'periodIncome', label: 'Pendapatan', format: (v) => formatMoney(v) },
      { key: 'periodExpense', label: 'Beban', format: (v) => formatMoney(v) }
    ]`
  },
  { 
    path: 'kas-bank', 
    title: 'Laporan Kas & Bank', 
    endpoint: 'cash-bank',
    columns: `[
      { key: 'date', label: 'Tanggal' },
      { key: 'documentNumber', label: 'No Dokumen' },
      { key: 'accountName', label: 'Akun' },
      { key: 'description', label: 'Keterangan' },
      { key: 'fundName', label: 'Dana' },
      { key: 'debit', label: 'Masuk', format: (v) => formatMoney(v) },
      { key: 'credit', label: 'Keluar', format: (v) => formatMoney(v) }
    ]`,
    renderSummary: `(summary) => (
      <div className="grid grid-cols-2 gap-4 text-sm font-medium">
        <div className="bg-white p-4 rounded shadow">Saldo Awal: {formatMoney(summary.openingBalance)}</div>
        <div className="bg-white p-4 rounded shadow">Saldo Akhir: {formatMoney(summary.closingBalance)}</div>
      </div>
    )`
  },
  { 
    path: 'tagihan', 
    title: 'Laporan Tagihan Akademik', 
    endpoint: 'academic-billing',
    columns: `[
      { key: 'dueDate', label: 'Jatuh Tempo' },
      { key: 'invoiceNumber', label: 'No Tagihan' },
      { key: 'studentName', label: 'Nama Santri' },
      { key: 'feeType', label: 'Jenis Tagihan' },
      { key: 'status', label: 'Status' },
      { key: 'amount', label: 'Nominal', format: (v) => formatMoney(v) },
      { key: 'outstanding', label: 'Sisa Tagihan', format: (v) => formatMoney(v) }
    ]`
  },
  { 
    path: 'pembayaran', 
    title: 'Laporan Pembayaran Diterima', 
    endpoint: 'academic-collections',
    columns: `[
      { key: 'date', label: 'Tanggal' },
      { key: 'paymentNumber', label: 'No Pembayaran' },
      { key: 'studentName', label: 'Nama Santri' },
      { key: 'method', label: 'Metode' },
      { key: 'status', label: 'Status' },
      { key: 'amount', label: 'Nominal', format: (v) => formatMoney(v) }
    ]`,
    renderSummary: `(summary) => (
      <div className="grid grid-cols-3 gap-4 text-sm font-medium">
        <div className="bg-white p-4 rounded shadow text-green-700">Gross: {formatMoney(summary.grossCollections)}</div>
        <div className="bg-white p-4 rounded shadow text-red-700">Refund: {formatMoney(summary.refunds)}</div>
        <div className="bg-white p-4 rounded shadow text-blue-700">Net: {formatMoney(summary.netCollections)}</div>
      </div>
    )`
  },
  { 
    path: 'piutang', 
    title: 'Laporan Piutang & Aging', 
    endpoint: 'receivable-aging',
    columns: `[
      { key: 'dueDate', label: 'Jatuh Tempo' },
      { key: 'invoiceNumber', label: 'No Tagihan' },
      { key: 'studentName', label: 'Nama Santri' },
      { key: 'feeType', label: 'Jenis Tagihan' },
      { key: 'daysOverdue', label: 'Hari Terlambat' },
      { key: 'bucket', label: 'Aging Bucket' },
      { key: 'outstanding', label: 'Sisa Tagihan', format: (v) => formatMoney(v) }
    ]`,
    renderSummary: `(summary) => (
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs font-medium">
        <div className="bg-white p-3 rounded shadow">Not Due: {formatMoney(summary.summary.NOT_DUE)}</div>
        <div className="bg-white p-3 rounded shadow">1-30: {formatMoney(summary.summary._1_30)}</div>
        <div className="bg-white p-3 rounded shadow">31-60: {formatMoney(summary.summary._31_60)}</div>
        <div className="bg-white p-3 rounded shadow">61-90: {formatMoney(summary.summary._61_90)}</div>
        <div className="bg-white p-3 rounded shadow">>90: {formatMoney(summary.summary.OVER_90)}</div>
        <div className="bg-gold-50 p-3 rounded shadow text-gold-800">Total: {formatMoney(summary.summary.TOTAL)}</div>
      </div>
    )`
  },
  { 
    path: 'rekonsiliasi', 
    title: 'Rekonsiliasi Akademik vs Buku Besar', 
    endpoint: 'academic-reconciliation',
    columns: `[
      { key: 'businessOutstanding', label: 'Piutang Sistem (Business)', format: (v) => formatMoney(v) },
      { key: 'ledgerReceivable', label: 'Piutang Buku Besar (Ledger)', format: (v) => formatMoney(v) },
      { key: 'difference', label: 'Selisih', format: (v) => formatMoney(v) },
      { key: 'isReconciled', label: 'Status', format: (v) => v ? 'MATCH' : 'UNMATCHED' }
    ]`
  },
  { 
    path: 'penerimaan-ziswaf', 
    title: 'Laporan Penerimaan ZISWAF', 
    endpoint: 'ziswaf-receipts',
    columns: `[
      { key: 'date', label: 'Tanggal' },
      { key: 'receiptNumber', label: 'No Kuitansi' },
      { key: 'donor', label: 'Nama Donatur' },
      { key: 'ziswafType', label: 'Jenis ZISWAF' },
      { key: 'funds', label: 'Dana' },
      { key: 'status', label: 'Status' },
      { key: 'amount', label: 'Nominal', format: (v) => formatMoney(v) }
    ]`,
    renderSummary: `(summary) => (
      <div className="grid grid-cols-3 gap-4 text-sm font-medium">
        <div className="bg-white p-4 rounded shadow text-green-700">Gross: {formatMoney(summary.grossReceived)}</div>
        <div className="bg-white p-4 rounded shadow text-red-700">Refund: {formatMoney(summary.refunds)}</div>
        <div className="bg-white p-4 rounded shadow text-blue-700">Net: {formatMoney(summary.netReceived)}</div>
      </div>
    )`
  },
  { 
    path: 'dana-ziswaf', 
    title: 'Laporan Dana ZISWAF', 
    endpoint: 'ziswaf-funds',
    columns: `[
      { key: 'fundName', label: 'Nama Dana' },
      { key: 'ziswafType', label: 'Jenis ZISWAF' },
      { key: 'openingBalance', label: 'Saldo Awal', format: (v) => formatMoney(v) },
      { key: 'received', label: 'Penerimaan', format: (v) => formatMoney(v) },
      { key: 'distributed', label: 'Penyaluran', format: (v) => formatMoney(v) },
      { key: 'closingBalance', label: 'Saldo Akhir', format: (v) => formatMoney(v) }
    ]`
  },
  { 
    path: 'campaign', 
    title: 'Laporan Campaign', 
    endpoint: 'ziswaf-campaigns',
    columns: `[
      { key: 'campaignName', label: 'Nama Campaign' },
      { key: 'receiptCount', label: 'Jumlah Transaksi' },
      { key: 'grossReceived', label: 'Penerimaan Gross', format: (v) => formatMoney(v) },
      { key: 'refunds', label: 'Refunds', format: (v) => formatMoney(v) },
      { key: 'netReceived', label: 'Penerimaan Net', format: (v) => formatMoney(v) }
    ]`
  },
  { 
    path: 'pengeluaran', 
    title: 'Laporan Pengeluaran', 
    endpoint: 'disbursements',
    columns: `[
      { key: 'date', label: 'Tanggal' },
      { key: 'disbursementNumber', label: 'No Pengeluaran' },
      { key: 'fundName', label: 'Dana' },
      { key: 'categoryName', label: 'Kategori' },
      { key: 'beneficiaryName', label: 'Penerima' },
      { key: 'status', label: 'Status' },
      { key: 'amount', label: 'Nominal', format: (v) => formatMoney(v) }
    ]`,
    renderSummary: `(summary) => (
      <div className="grid grid-cols-3 gap-4 text-sm font-medium">
        <div className="bg-white p-4 rounded shadow text-green-700">Total Keluar: {formatMoney(summary.paid)}</div>
        <div className="bg-white p-4 rounded shadow text-red-700">Dibatalkan/Reversed: {formatMoney(summary.reversed)}</div>
        <div className="bg-white p-4 rounded shadow text-blue-700">Net Pengeluaran: {formatMoney(summary.netExpense)}</div>
      </div>
    )`
  }
];

const basePath = path.join(__dirname, '../app/(admin)/admin/keuangan/laporan');

for (const route of uiRoutes) {
  const routeDir = path.join(basePath, route.path);
  fs.mkdirSync(routeDir, { recursive: true });

  const content = `'use client'

import React from 'react'
import { ReportViewer } from '@/components/finance/ReportViewer'

function formatMoney(amount: string | bigint | number) {
  if (amount === undefined || amount === null) return '-'
  return 'Rp ' + Number(amount).toLocaleString('id-ID')
}

export default function Page() {
  return (
    <ReportViewer 
      title="${route.title}"
      endpoint="${route.endpoint}"
      ${route.defaultFilters ? `defaultFilters={${route.defaultFilters}}` : ''}
      columns={${route.columns}}
      ${route.renderSummary ? `renderSummary={${route.renderSummary}}` : ''}
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
          ${route.path === 'mutasi-akun' ? `
            <input 
              type="text" 
              placeholder="Account ID"
              value={filters.accountId || ''} 
              onChange={e => setFilters({ ...filters, accountId: e.target.value })}
              className="border-gray-300 rounded-md shadow-sm text-sm ml-2"
            />
          ` : ''}
        </>
      )}
    />
  )
}
`

  fs.writeFileSync(path.join(routeDir, 'page.tsx'), content);
}
console.log('UI Routes generated successfully.');
