'use client'

import { useState } from 'react'

export type ProfileAvatarProps = {
  src?: string | null
  name?: string | null
  size?: number | string
  className?: string
  alt?: string
}

function getInitials(name?: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase()
}

export function ProfileAvatar({ src, name, size = 40, className = '', alt = '' }: ProfileAvatarProps) {
  const [error, setError] = useState(false)
  
  const initials = getInitials(name)
  const isImageValid = src && !error

  const sizeStyle = typeof size === 'number' ? `${size}px` : size

  return (
    <div 
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-full bg-[#4B21A2]/10 text-[#4B21A2] font-bold shrink-0 ${className}`}
      style={{ width: sizeStyle, height: sizeStyle }}
    >
      {isImageValid ? (
        <img 
          src={src} 
          alt={alt || name || 'Avatar'} 
          className="w-full h-full object-cover"
          onError={() => setError(true)}
        />
      ) : (
        <span style={{ fontSize: `calc(${sizeStyle} * 0.4)` }}>
          {initials}
        </span>
      )}
    </div>
  )
}
