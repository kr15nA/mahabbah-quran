'use client'

import { useState, useRef, useTransition } from 'react'
import { Upload, Download, CheckCircle2, AlertCircle, FileSpreadsheet, XCircle } from 'lucide-react'
import { validateImportAction, executeImportAction } from './actions'
import { DatasetType, ValidationResult } from '@/lib/import-export'

export default function ImportExportClient() {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import')
  const [datasetType, setDatasetType] = useState<DatasetType>('santri')
  const [file, setFile] = useState<File | null>(null)
  
  const [isPending, startTransition] = useTransition()
  const [validationResult, setValidationResult] = useState<ValidationResult<any> | null>(null)
  const [importStatus, setImportStatus] = useState<{type: 'success'|'error', text: string} | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      setValidationResult(null)
      setImportStatus(null)
    }
  }

  const handleValidate = async () => {
    if (!file) return
    setImportStatus(null)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', datasetType)

    startTransition(async () => {
      const res = await validateImportAction(formData)
      if (res.error) {
        setImportStatus({ type: 'error', text: res.error })
      } else if (res.success && res.result) {
        setValidationResult(res.result)
      }
    })
  }

  const handleExecute = async () => {
    if (!validationResult || !validationResult.isValid) return
    setImportStatus(null)
    startTransition(async () => {
      const res = await executeImportAction(datasetType, validationResult.data)
      if (res.error) {
        setImportStatus({ type: 'error', text: res.error })
      } else {
        setImportStatus({ type: 'success', text: `Berhasil mengimpor ${res.count} data` })
        setFile(null)
        setValidationResult(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    })
  }

  const resetState = () => {
    setFile(null)
    setValidationResult(null)
    setImportStatus(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden text-sm">
      <div className="flex border-b border-gray-100">
        <button 
          onClick={() => { setActiveTab('import'); resetState(); }}
          className={`flex items-center gap-2 px-6 py-4 font-semibold transition ${
            activeTab === 'import' ? 'text-[#4B21A2] border-b-2 border-[#4B21A2]' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Upload className="w-4 h-4" /> Import Data
        </button>
        <button 
          onClick={() => { setActiveTab('export'); resetState(); }}
          className={`flex items-center gap-2 px-6 py-4 font-semibold transition ${
            activeTab === 'export' ? 'text-[#4B21A2] border-b-2 border-[#4B21A2]' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Download className="w-4 h-4" /> Export Data
        </button>
      </div>

      <div className="p-6 relative">
        {isPending && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-[#4B21A2] border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        <div className="mb-6">
          <label className="block font-bold text-gray-700 mb-2">Pilih Dataset</label>
          <select 
            value={datasetType} 
            onChange={(e) => { setDatasetType(e.target.value as DatasetType); resetState(); }}
            className="w-full sm:w-auto px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#4B21A2]/20"
          >
            <option value="santri">Data Santri</option>
            <option value="guru">Data Guru</option>
            <option value="orang_tua">Data Orang Tua</option>
            <option value="parent_santri">Relasi Santri & Wali</option>
          </select>
        </div>

        {importStatus && (
          <div className={`p-4 rounded-xl flex items-center gap-2 mb-6 ${importStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {importStatus.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-semibold">{importStatus.text}</span>
          </div>
        )}

        {activeTab === 'import' && (
          <div className="space-y-6">
            {!validationResult && (
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="w-full sm:w-1/2 border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                  <FileSpreadsheet className="w-10 h-10 text-gray-400 mb-3" />
                  <p className="font-bold text-gray-700 mb-1">Pilih file Excel (.xlsx)</p>
                  <p className="text-xs text-gray-500 mb-4">Maksimal 5000 baris, 10MB.</p>
                  <input 
                    type="file" 
                    accept=".xlsx, .csv" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleFileChange}
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-2 rounded-lg font-bold text-xs transition"
                  >
                    Browse File
                  </button>
                  {file && <p className="mt-3 text-xs font-semibold text-[#4B21A2]">{file.name}</p>}
                </div>

                <div className="w-full sm:w-1/2 bg-gray-50 p-6 rounded-xl border border-gray-100">
                  <h4 className="font-bold text-gray-900 mb-2">Instruksi Import</h4>
                  <ul className="text-xs text-gray-600 space-y-2 list-disc list-inside">
                    <li>Download template terlebih dahulu agar format sesuai.</li>
                    <li>Pastikan tidak ada data duplikat (Email/No. HP).</li>
                    <li>Jangan ubah nama header pada template.</li>
                    <li>Hanya format XLSX dan CSV yang didukung.</li>
                  </ul>
                  <a 
                    href={`/api/import-export/template?type=${datasetType}`}
                    className="inline-flex items-center gap-2 mt-4 text-[#4B21A2] font-bold text-xs hover:underline"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Template {datasetType.replace('_', ' ').toUpperCase()}
                  </a>
                </div>
              </div>
            )}

            {!validationResult && file && (
              <div className="flex justify-end">
                <button 
                  onClick={handleValidate}
                  disabled={isPending}
                  className="bg-[#4B21A2] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#3d1a85] transition flex items-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" /> Validasi Data
                </button>
              </div>
            )}

            {validationResult && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                  <h3 className="font-black text-gray-900">Hasil Validasi ({validationResult.totalRows} baris)</h3>
                  <button onClick={resetState} className="text-gray-500 hover:text-gray-700 font-bold text-xs flex items-center gap-1"><XCircle className="w-4 h-4"/> Batal</button>
                </div>
                
                {validationResult.errors.length > 0 ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs font-semibold border border-red-100 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> Ditemukan {validationResult.errors.length} kesalahan. Silakan perbaiki file Anda dan upload ulang.
                    </div>
                    <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-4 py-2">Baris</th>
                            <th className="px-4 py-2">Kolom</th>
                            <th className="px-4 py-2">Pesan Error</th>
                            <th className="px-4 py-2">Nilai Saat Ini</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {validationResult.errors.map((err, i) => (
                            <tr key={i} className="hover:bg-red-50/50">
                              <td className="px-4 py-2 font-bold text-gray-900">{err.row}</td>
                              <td className="px-4 py-2 text-gray-600">{err.field}</td>
                              <td className="px-4 py-2 text-red-600 font-medium">{err.error}</td>
                              <td className="px-4 py-2 text-gray-500">{err.value || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold border border-emerald-100 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Data valid dan siap diimpor. ({validationResult.data.length} baris valid)
                    </div>
                    <div className="flex justify-end">
                      <button 
                        onClick={handleExecute}
                        disabled={isPending}
                        className="bg-[#4B21A2] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#3d1a85] transition flex items-center gap-2 disabled:opacity-50"
                      >
                        <Upload className="w-4 h-4" /> Proses Import Sekarang
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'export' && (
          <div className="space-y-6">
             <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 max-w-md">
                <h4 className="font-bold text-gray-900 mb-2">Export Data Sistem</h4>
                <p className="text-xs text-gray-600 mb-6">Download data master ke dalam format XLSX. Data password dan sesi dienkripsi atau dikecualikan secara otomatis.</p>
                <a 
                  href={`/api/import-export/export?type=${datasetType}`}
                  className="bg-[#4B21A2] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#3d1a85] transition inline-flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> Export {datasetType.replace('_', ' ').toUpperCase()} Sekarang
                </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
