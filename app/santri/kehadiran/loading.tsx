import { SantriHistorySkeleton } from '../_components/SantriHistorySkeleton'
import { Calendar } from 'lucide-react'

export default function Loading() {
  return <SantriHistorySkeleton title="Kehadiran" icon={Calendar} />
}
