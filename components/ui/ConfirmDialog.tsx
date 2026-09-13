'use client'

import { AlertTriangle, X } from 'lucide-react'

type ConfirmDialogProps = {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  isDanger?: boolean
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  onConfirm,
  onCancel,
  isDanger = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                isDanger ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3 id="dialog-title" className="text-sm font-bold text-gray-900">
              {title}
            </h3>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600" aria-label="Tutup dialog">
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <p className="mt-2 text-xs text-gray-600 leading-relaxed">{message}</p>
        
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 rounded-xl px-4 py-2.5 text-xs font-bold text-white transition-colors shadow-sm ${
              isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-[#4B21A2] hover:bg-[#3a1880]'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
