'use client'

import React from 'react'
import { Printer, Download, AlertCircle } from 'lucide-react'

export function ReportHeader({ title, period }: { title: string; period?: string }) {
  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {period && <p className="text-sm text-gray-500 mt-1">{period}</p>}
      </div>
      <div className="flex gap-2 print:hidden">
        <button 
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500"
        >
          <Printer className="w-4 h-4" />
          Print
        </button>
      </div>
    </div>
  )
}

export function ExportButton({ onExport, isExporting }: { onExport: () => void, isExporting?: boolean }) {
  return (
    <button 
      onClick={onExport}
      disabled={isExporting}
      className="inline-flex items-center gap-2 px-4 py-2 bg-gold-600 text-white rounded-md text-sm font-medium hover:bg-gold-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500 disabled:opacity-50 print:hidden"
    >
      <Download className="w-4 h-4" />
      {isExporting ? 'Exporting...' : 'Export XLSX'}
    </button>
  )
}

export function ConfigurationWarning() {
  return (
    <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
      <div className="flex items-start">
        <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800">Perhatian</h3>
          <div className="mt-1 text-sm text-yellow-700">
            <p>
              Sebagian akun aset belum diklasifikasikan. Saldo Kas/Bank belum dapat ditampilkan secara lengkap.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ReportPagination({ 
  page, 
  totalPages, 
  onPageChange 
}: { 
  page: number; 
  totalPages: number; 
  onPageChange: (p: number) => void 
}) {
  if (totalPages <= 1) return null

  return (
    <div className="mt-4 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 print:hidden">
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Halaman <span className="font-medium">{page}</span> dari <span className="font-medium">{totalPages}</span>
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
            >
              <span className="sr-only">Previous</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
            >
              <span className="sr-only">Next</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
            </button>
          </nav>
        </div>
      </div>
    </div>
  )
}
