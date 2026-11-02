import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { formatUpdatedAt } from '@/features/projects/projectModel'
import RevisionDialog from './RevisionDialog'

export default function RevisionWorkflow({ stream, item, revisions, onSaved }) {
  const [dialog, setDialog] = useState(null)
  if (!['bp', 'kitchen', 'takeoffs'].includes(stream.type)) return null
  const events = revisions.data?.events ?? []
  const own = events.filter((event) => event.work_item_id === item.id)
  const impacts = (revisions.data?.impacts ?? []).filter((impact) => impact.target_work_item_id === item.id)
  const latestBp = events.find((event) => event.workstream_type === 'bp')?.id
  return (
    <div className="mt-5 space-y-3 border-t pt-4" aria-label={`${stream.label} revisions`}>
      <Button variant="outline" disabled={revisions.loading || Boolean(revisions.error)} onClick={() => setDialog({})}>Issue revision</Button>
      <details><summary className="cursor-pointer text-sm font-medium">Issued revisions ({own.length})</summary>
        {!own.length ? <p className="mt-2 text-xs text-muted-foreground">No issued revisions recorded.</p> : <ol className="mt-2 max-h-64 space-y-3 overflow-y-auto text-sm">{own.map((event) => <li key={event.id} className="break-words rounded-md border p-3"><p className="font-medium">{event.revision_label}{event.based_on_bp_revision_label && ` · based on BP ${event.based_on_bp_revision_label}`}</p><p className="mt-1 text-xs text-muted-foreground">{event.issued_by_name} · {formatUpdatedAt(event.issued_at)}</p>{event.notes && <p className="mt-2 whitespace-pre-wrap">{event.notes}</p>}</li>)}</ol>}
      </details>
      {impacts.length > 0 && <details open><summary className="cursor-pointer text-sm font-medium">BP impact reviews ({impacts.length})</summary><ul className="mt-2 max-h-80 space-y-3 overflow-y-auto text-sm">{impacts.map((impact) => <li key={impact.id} className="break-words rounded-md border p-3">
        <p className="font-medium">BP {impact.bp_revision_label} · {impact.review_state}</p>
        <p className="mt-1 text-xs text-muted-foreground">{impact.bp_revision_id === latestBp ? 'Current BP' : 'Historical BP review'}{!item.assignee_id && ' · Unassigned workstream'}</p>
        {impact.reviewed_by_name && <p className="mt-1 text-xs text-muted-foreground">{impact.reviewed_by_name} · {formatUpdatedAt(impact.reviewed_at)}</p>}
        {impact.notes && <p className="mt-2 whitespace-pre-wrap">{impact.notes}</p>}
        <Button variant="outline" className="mt-2" onClick={() => setDialog({ impact })}>Review BP {impact.bp_revision_label}</Button>
      </li>)}</ul></details>}
      {dialog && <RevisionDialog stream={stream} item={item} events={events} impact={dialog.impact} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); onSaved() }} />}
    </div>
  )
}
