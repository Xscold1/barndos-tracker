import { useEffect, useRef } from 'react'
import { formatDeadline, WORKSTREAMS } from '@/features/projects/projectModel'

export default function WorkloadWarning({ warning, acknowledged, onAcknowledge }) {
  const panel = useRef(null)
  useEffect(() => { panel.current?.focus() }, [warning])
  return (
    <div ref={panel} tabIndex={-1} role="region" aria-label="Same-day workload warning" className="space-y-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 focus:outline-2 focus:outline-ring">
      <p className="font-semibold">Other work is due on {formatDeadline(warning.due_date)} (Tennessee CT)</p>
      <p>{warning.items[0].assignee_name} has {warning.items.length} other active drafting {warning.items.length === 1 ? 'assignment' : 'assignments'} that day. Review these and coordinate with your project manager.</p>
      <ul className="max-h-48 space-y-2 overflow-y-auto break-words">
        {warning.items.map((item) => (
          <li key={item.id} className="border-t border-amber-200 pt-2">
            <span className="font-medium">{item.project_no} · {item.client_name}</span>{item.archived && ' (archived)'}
            <span className="block">{WORKSTREAMS.find(({ type }) => type === item.workstream_type)?.label ?? item.workstream_type} · {item.status} · queue {item.queue_position ?? 'not set'} · {item.priority_level} priority</span>
          </li>
        ))}
      </ul>
      <label className="flex items-start gap-2"><input type="checkbox" className="mt-1 size-4 shrink-0 accent-primary" checked={acknowledged} onChange={(event) => onAcknowledge(event.target.checked)} />I acknowledge this same-day workload and have coordinated the schedule. Save anyway.</label>
      <p className="text-xs">Nothing has been saved yet. A changed workload will require review again. A change note is optional.</p>
    </div>
  )
}
