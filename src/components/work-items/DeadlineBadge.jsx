import { cn } from '@/lib/utils'

const labels = { due_today: 'Due today (CT)', overdue: 'Overdue (CT)', upcoming: 'Upcoming', awaiting_client: 'Awaiting client' }
export default function DeadlineBadge({ state }) {
  if (!labels[state]) return null
  return <span data-deadline-state={state} className={cn('mt-1 inline-flex rounded-full px-2 py-1 text-xs font-medium whitespace-nowrap', state === 'overdue' ? 'bg-rose-50 text-rose-800' : state === 'due_today' ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-700')}>{labels[state]}</span>
}
