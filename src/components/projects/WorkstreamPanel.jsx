import { Card, CardContent } from '@/components/ui/card'
import { formatDeadline } from '@/features/projects/projectModel'
import StatusChip from './StatusChip'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import WorkstreamEditDialog from '@/components/work-items/WorkstreamEditDialog'
import WorknoteDialog from '@/components/work-items/WorknoteDialog'
import DeadlineBadge from '@/components/work-items/DeadlineBadge'
import ClientReviewActions from '@/components/work-items/ClientReviewActions'
import RevisionWorkflow from '@/components/work-items/RevisionWorkflow'

function Field({ label, children, className }) {
  return <div className={className}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{children}</dd></div>
}

export default function WorkstreamPanel({ stream, item, onUpdated, onWorknoteAdded, revisions, onRevisionSaved }) {
  const [dialog, setDialog] = useState(null)
  const [initialStatus, setInitialStatus] = useState(null)
  function edit(status) { setInitialStatus(status); setDialog('edit') }
  const tracksBlueprint = ['kitchen', 'takeoffs'].includes(stream.type)
  if (!item) return <Card className="shadow-none"><CardContent><h3 className="font-semibold">{stream.label}</h3><p className="mt-2 text-sm text-muted-foreground">This workstream has not been initialized.</p></CardContent></Card>
  return (
    <Card className="shadow-none" role="region" aria-labelledby={`heading-${stream.type}`}>
      <CardContent>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
          <h3 id={`heading-${stream.type}`} className="font-semibold">{stream.label}</h3>
          <StatusChip status={item.status} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5">
          <Field label="Assigned to">{item.assignee?.display_name ?? 'Unassigned'}</Field>
          <Field label="Deadline (Tennessee CT)"><span className="block">{formatDeadline(item.due_date)}</span><DeadlineBadge state={item.deadline_state} /></Field>
          <Field label="Own revision">{item.revision ?? 'Not issued'}</Field>
          <Field label="Priority">{item.priority_level}</Field>
          <Field label="Queue position">{item.queue_position ?? 'Not set'}</Field>
          <Field label="Scope">{item.required === null ? 'To confirm' : item.required ? 'Required' : 'Not required'}</Field>
          {tracksBlueprint && (
            <>
              <Field label="BP reference revision">{item.bp_reference_revision ?? 'Not set'}</Field>
              <Field label="BP reviewed revision">{item.bp_reviewed_revision ?? 'Not checked'}</Field>
              <Field label="BP review state" className="col-span-2">{item.bp_review_state}</Field>
            </>
          )}
        </dl>
        {item.notes && <p className="mt-5 border-t pt-4 text-sm leading-6 whitespace-pre-wrap text-muted-foreground">{item.notes}</p>}
        <ClientReviewActions stream={stream} item={item} onSelect={edit} />
        <RevisionWorkflow stream={stream} item={item} revisions={revisions} onSaved={onRevisionSaved} />
        <div className="mt-5 flex flex-wrap gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => edit(item.status)}>Edit {stream.label}</Button>
          <Button variant="ghost" onClick={() => setDialog('note')} aria-label={`Add worknote for ${stream.label}`}>Add worknote</Button>
        </div>
        {dialog === 'edit' && <WorkstreamEditDialog stream={stream} item={item} initialStatus={initialStatus} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); onUpdated(stream) }} />}
        {dialog === 'note' && <WorknoteDialog stream={stream} item={item} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); onWorknoteAdded(stream) }} />}
      </CardContent>
    </Card>
  )
}
