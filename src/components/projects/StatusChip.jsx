import { cn } from '@/lib/utils'

const colors = {
  Waiting: 'bg-slate-100 text-slate-700',
  'In Progress': 'bg-blue-50 text-blue-800',
  'For Review': 'bg-violet-50 text-violet-800',
  'For Client Review': 'bg-amber-50 text-amber-800',
  'Revision Requested': 'bg-rose-50 text-rose-800',
  Done: 'bg-emerald-50 text-emerald-800',
  'Not Needed': 'bg-slate-100 text-slate-600',
}

export default function StatusChip({ status }) {
  return (
    <span className={cn('inline-flex rounded-full px-2 py-1 text-xs font-medium whitespace-nowrap', colors[status])}>
      {status}
    </span>
  )
}
