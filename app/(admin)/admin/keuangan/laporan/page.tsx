'use client'

import React from 'react'
import Link from 'next/link'
import { BookOpen, RefreshCw, BarChart2, DollarSign, FileText, CreditCard, PieChart, Users, ArrowRightCircle } from 'lucide-react'

const reportCategories = [
  {
    title: 'Ringkasan Keuangan',
    reports: [
      { name: 'Jurnal Transaksi', path: '/admin/keuangan/laporan/jurnal', icon: BookOpen },
      { name: 'Mutasi Akun', path: '/admin/keuangan/laporan/mutasi-akun', icon: RefreshCw },
      { name: 'Mutasi Dana', path: '/admin/keuangan/laporan/mutasi-dana', icon: PieChart },
      { name: 'Kas & Bank', path: '/admin/keuangan/laporan/kas-bank', icon: DollarSign },
    ]
  },
  {
    title: 'Akademik',
    reports: [
      { name: 'Tagihan / Invoice', path: '/admin/keuangan/laporan/tagihan', icon: FileText },
      { name: 'Pembayaran Diterima', path: '/admin/keuangan/laporan/pembayaran', icon: CreditCard },
      { name: 'Piutang & Aging', path: '/admin/keuangan/laporan/piutang', icon: BarChart2 },
      { name: 'Rekonsiliasi Akademik', path: '/admin/keuangan/laporan/rekonsiliasi', icon: RefreshCw },
    ]
  },
  {
    title: 'ZISWAF',
    reports: [
      { name: 'Penerimaan ZISWAF', path: '/admin/keuangan/laporan/penerimaan-ziswaf', icon: DollarSign },
      { name: 'Dana ZISWAF', path: '/admin/keuangan/laporan/dana-ziswaf', icon: PieChart },
      { name: 'Laporan Campaign', path: '/admin/keuangan/laporan/campaign', icon: Users },
    ]
  },
  {
    title: 'Pengeluaran',
    reports: [
      { name: 'Pengeluaran / Penyaluran', path: '/admin/keuangan/laporan/pengeluaran', icon: ArrowRightCircle },
    ]
  }
]

export default function LaporanIndexPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Laporan Keuangan & Operasional</h1>
        <p className="text-gray-500 mt-1">Akses semua laporan operasional, jurnal, mutasi, dan tagihan</p>
      </div>

      <div className="space-y-8">
        {reportCategories.map((category) => (
          <div key={category.title}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{category.title}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {category.reports.map((report) => {
                const Icon = report.icon
                return (
                  <Link
                    key={report.name}
                    href={report.path}
                    className="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm focus-within:ring-2 focus-within:ring-gold-500 focus-within:ring-offset-2 hover:border-gold-400"
                  >
                    <div className="flex-shrink-0">
                      <Icon className="h-6 w-6 text-gold-600" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="absolute inset-0" aria-hidden="true" />
                      <p className="text-sm font-medium text-gray-900">{report.name}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
