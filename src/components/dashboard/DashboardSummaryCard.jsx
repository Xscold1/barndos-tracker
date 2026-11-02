import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function DashboardSummaryCard({ stream, summary, selected, onSelect }) {
  const labelId = `dashboard-card-${stream.type}`
  return (
    <button type="button" data-workstream-card={stream.type} aria-expanded={selected} aria-controls="dashboard-workstream-list"
      aria-labelledby={labelId} aria-describedby={`${labelId}-counts`} onClick={onSelect}
      className={cn('w-full rounded-xl border bg-card p-5 text-left shadow-sm transition-colors hover:border-primary/60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring', selected && 'border-primary bg-primary/5 ring-1 ring-primary')}>
      <span className="flex items-start justify-between gap-3">
        <span id={labelId}><span className="block text-lg font-semibold">{stream.shortLabel}</span><span className="mt-0.5 block text-sm text-muted-foreground">{stream.label}</span></span>
        {selected ? <ChevronUp className="mt-1 size-4 text-primary" aria-hidden="true" /> : <ChevronDown className="mt-1 size-4 text-muted-foreground" aria-hidden="true" />}
      </span>
      <span id={`${labelId}-counts`} className="mt-5 grid grid-cols-3 gap-2">
        <span><span className="block text-3xl font-semibold tabular-nums" data-count="pending">{summary?.pending ?? '—'}</span><span className="mt-1 block text-xs text-muted-foreground">Pending</span></span>
        <span><span className={cn('block text-3xl font-semibold tabular-nums', summary?.due_today > 0 && 'text-amber-800')} data-count="due_today">{summary?.due_today ?? '—'}</span><span className="mt-1 block text-xs text-muted-foreground">Due today</span></span>
        <span><span className={cn('block text-3xl font-semibold tabular-nums', summary?.overdue > 0 && 'text-rose-800')} data-count="overdue">{summary?.overdue ?? '—'}</span><span className="mt-1 block text-xs text-muted-foreground">Overdue</span></span>
      </span>
    </button>
  )
}
