'use client'

import React, { useState, useEffect } from 'react'
import { ReportHeader, ExportButton, ReportPagination, ConfigurationWarning } from './ReportComponents'

interface ReportViewerProps {
  title: string
  endpoint: string
  columns: { key: string; label: string; format?: (val: any) => React.ReactNode }[]
  renderFilters?: (filters: any, setFilters: (f: any) => void) => React.ReactNode
  renderSummary?: (summary: any) => React.ReactNode
  defaultFilters?: any
}

export function ReportViewer({ title, endpoint, columns, renderFilters, renderSummary, defaultFilters = {} }: ReportViewerProps) {
  const [data, setData] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [configState, setConfigState] = useState<any>(null)
  
  const [filters, setFilters] = useState<any>(defaultFilters)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  const buildQueryString = (fmt?: string) => {
    const params = new URLSearchParams()
    if (filters.from) params.set('from', filters.from)
    if (filters.to) params.set('to', filters.to)
    if (filters.accountId) params.set('accountId', filters.accountId)
    if (filters.fundId) params.set('fundId', filters.fundId)
    if (filters.asOfDate) params.set('asOfDate', filters.asOfDate)
    
    if (fmt) {
      params.set('format', fmt)
    } else {
      params.set('page', page.toString())
      params.set('pageSize', '50')
    }
    return params.toString()
  }

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/finance/reports/${endpoint}?${buildQueryString()}`)
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to fetch report')
      }
      const json = await res.json()
      
      if (json.items) {
        setData(json.items)
        setTotalPages(json.totalPages || 1)
      } else if (Array.isArray(json)) {
        setData(json)
        setTotalPages(1)
      } else {
        // Special case for reconciliation or similar
        setData([json])
        setTotalPages(1)
      }

      // Extract summary
      const sum = { ...json }
      delete sum.items
      delete sum.page
      delete sum.pageSize
      delete sum.totalRows
      delete sum.totalPages
      delete sum.configurationComplete
      delete sum.unclassifiedAssetAccounts
      setSummary(sum)

      if (json.configurationComplete !== undefined) {
        setConfigState({
          configurationComplete: json.configurationComplete,
          unclassifiedAssetAccounts: json.unclassifiedAssetAccounts
        })
      }

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [page, filters])

  const handleExport = async () => {
    setExporting(true)
    setError('')
    try {
      const res = await fetch(`/api/finance/reports/${endpoint}?${buildQueryString('xlsx')}`)
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to export report')
      }
      
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `laporan-${endpoint}-${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setExporting(false)
    }
  }

  const periodStr = filters.from || filters.to ? `${filters.from || ''} s/d ${filters.to || ''}` : 'Semua Waktu'

  return (
    <div className="p-6">
      <ReportHeader title={title} period={periodStr} />
      
      {configState?.configurationComplete === false && <ConfigurationWarning />}

      {error && (
        <div className="mb-4 p-4 text-sm text-red-800 rounded-lg bg-red-50">{error}</div>
      )}

      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div className="flex flex-wrap gap-4 items-end">
          {renderFilters && renderFilters(filters, (newFilters) => { setFilters(newFilters); setPage(1) })}
        </div>
        <ExportButton onExport={handleExport} isExporting={exporting} />
      </div>

      {renderSummary && summary && (
        <div className="mb-6">
          {renderSummary(summary)}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map(col => (
                  <th key={col.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-4 text-center text-sm text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-4 text-center text-sm text-gray-500">
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                data.map((row, i) => (
                  <tr key={row.id || i}>
                    {columns.map(col => (
                      <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {col.format ? col.format(row[col.key] ?? row) : (row[col.key] || '-')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <ReportPagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  )
}
