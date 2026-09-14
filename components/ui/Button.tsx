import React from 'react'
export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }: any) {
  return <button className={`inline-flex items-center justify-center font-medium rounded-lg transition-colors ${className}`} {...props}>{children}</button>
}
