import React from 'react'
export function Badge({ children, variant = 'neutral' }: { children: React.ReactNode, variant?: string }) {
  return <span className={`px-2 py-1 text-xs font-medium rounded-full ${variant === 'success' ? 'bg-green-100 text-green-700' : variant === 'danger' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>{children}</span>
}
