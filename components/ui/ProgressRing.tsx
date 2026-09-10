'use client'

interface ProgressRingProps {
  pct: number
  size?: number
}

const pct2color = (p: number) => (p >= 75 ? '#16A34A' : p >= 50 ? '#F59E0B' : '#DC2626')

export default function ProgressRing({ pct, size = 44 }: ProgressRingProps) {
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const dash = (Math.min(pct, 100) / 100) * circ
  const col = pct2color(pct)

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E7EB" strokeWidth={4} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={col}
          strokeWidth={4}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          fontWeight: 700,
          color: col,
        }}
      >
        {pct}%
      </div>
    </div>
  )
}
