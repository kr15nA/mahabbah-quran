import React from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
export default function TopBar({ title, showBack }: { title: string, showBack?: boolean }) {
  return <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
    {showBack && <Link href="/orang-tua/tagihan"><ArrowLeft className="w-5 h-5 text-gray-500" /></Link>}
    <h1 className="font-bold text-gray-900">{title}</h1>
  </div>
}
