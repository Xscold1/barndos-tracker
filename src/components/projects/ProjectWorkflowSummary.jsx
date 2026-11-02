import { cn } from '@/lib/utils'

export default function ProjectWorkflowSummary({ workflow, compact = false }) {
  if (!workflow) return null
  const label = !workflow.workstreams_complete ? 'Workstreams incomplete'
    : workflow.all_required_done ? 'All required work done'
      : workflow.scope_unknown_count && !workflow.required_open_count ? 'Scope to confirm'
        : !workflow.required_count && !workflow.scope_unknown_count ? 'No required work' : 'Required work open'
  return (
    <div aria-label="Project workflow" data-all-required-done={workflow.all_required_done} className={compact ? 'mt-2' : 'mt-4 rounded-lg border bg-card p-4'}>
      <div className="flex flex-wrap gap-2">
        <span className={cn('inline-flex rounded-full px-2 py-1 text-xs font-medium', workflow.all_required_done ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700')}>{label}</span>
        {workflow.awaiting_client_count > 0 && <span className="inline-flex rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">Awaiting client · {workflow.awaiting_client_count}</span>}
      </div>
      {!compact && <>
        <p className="mt-2 text-sm text-muted-foreground">{workflow.required_done_count} of {workflow.required_count} required workstreams done. Client review remains unfinished and is excluded from drafter due/overdue indicators.</p>
        {workflow.scope_unknown_count > 0 && <p className="mt-2 text-xs text-muted-foreground">Quotation scope is unconfirmed. Confirm whether it is required before claiming all required work is done.</p>}
        {!workflow.workstreams_complete && <p className="mt-2 text-xs text-muted-foreground">All five workstreams must be initialized before completion can be confirmed.</p>}
        {!workflow.required_count && !workflow.scope_unknown_count && <p className="mt-2 text-xs text-muted-foreground">No work is currently marked required; this is not a finished-project confirmation.</p>}
      </>}
    </div>
  )
}
