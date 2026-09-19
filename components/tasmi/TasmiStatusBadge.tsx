export function TasmiStatusBadge({ status }: { status: 'PASSED' | 'NEEDS_REVIEW' }) {
  if (status === 'PASSED') {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 whitespace-nowrap">
        Lulus
      </span>
    )
  }
  return (
    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 whitespace-nowrap">
      Perlu Pengulangan
    </span>
  )
}
