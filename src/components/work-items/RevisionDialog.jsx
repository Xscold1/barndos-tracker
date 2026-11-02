import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { revisionService } from '@/features/revisions/revisionService'
import { REVIEW_DECISIONS } from '@/features/revisions/createRevisionService'
import WorkItemDialog from './WorkItemDialog'

const control = 'mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring'

export default function RevisionDialog({ stream, item, events, impact, onSaved, onClose }) {
  const dialog = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [label, setLabel] = useState(item.revision ?? '')
  const [basis, setBasis] = useState(item.bp_reference_revision_id ?? '')
  const [notes, setNotes] = useState('')
  const [decision, setDecision] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const dependent = ['kitchen', 'takeoffs'].includes(stream.type)
  const bpEvents = events.filter((event) => event.workstream_type === 'bp')
  const fieldId = (field) => `revision-${field}-${stream.type}`
  async function save(event) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      if (impact) await revisionService.reviewImpact(item, impact, { decision, notes })
      else await revisionService.issueRevision(item, { revision_label: label, based_on_bp_revision_id: dependent ? basis : null, notes, confirm_issued: confirmed })
      dialog.current.close(); onSaved()
    } catch (error) { setError(error.message) }
    finally { setBusy(false) }
  }
  return (
    <WorkItemDialog dialogRef={dialog} title={impact ? `Review BP ${impact.bp_revision_label} · ${stream.label}` : `Issue revision · ${stream.label}`} description={impact ? 'Record the BP revision checked and your impact decision. Drafting status and own revision stay independent.' : 'Record an actually issued deliverable as immutable revision history. This does not send drawings or notifications.'} busy={busy} onClose={onClose}>
      <form onSubmit={save} className="p-5"><fieldset disabled={busy} className="space-y-4">
        {impact ? <>
          <p className="text-sm">Own revision: {item.revision ?? 'Not set'} · BP basis: {item.bp_reference_revision ?? 'Not set'} · Drafting: {item.status}</p>
          <div><label htmlFor={fieldId('decision')} className="text-sm font-medium">Review outcome</label><select data-autofocus id={fieldId('decision')} required className={control} value={decision} onChange={(event) => setDecision(event.target.value)}><option value="">Choose an outcome</option>{REVIEW_DECISIONS.map((value) => <option key={value}>{value}</option>)}</select></div>
          <p className="text-xs text-muted-foreground">No Changes Needed preserves the deliverable’s BP basis. Changes Required records the decision; issue the revised deliverable separately after doing the work. Historical BP reviews do not replace a newer BP’s current flag.</p>
        </> : <>
          <div><label htmlFor={fieldId('label')} className="text-sm font-medium">Issued revision label</label><input data-autofocus id={fieldId('label')} required maxLength={40} className={control} value={label} onChange={(event) => setLabel(event.target.value)} /></div>
          {dependent && <div><label htmlFor={fieldId('basis')} className="text-sm font-medium">Based on issued BP revision</label><select id={fieldId('basis')} required={bpEvents.length > 0} value={basis} onChange={(event) => setBasis(event.target.value)} className={control}><option value="">{bpEvents.length ? 'Choose the actual BP basis' : 'No issued BP basis yet'}</option>{bpEvents.map((event) => <option key={event.id} value={event.id}>{event.revision_label}</option>)}</select><p className="mt-1 text-xs text-muted-foreground">Choose the basis used for this deliverable. Issuing does not resolve BP impact reviews automatically.</p></div>}
          {stream.type === 'bp' && <p className="text-sm text-muted-foreground">Kitchen and Takeoffs will receive Needs Review records, including unassigned or Not Needed work. Their own revisions, basis and drafting statuses remain intact.</p>}
          <label className="flex items-start gap-2 rounded-md border p-3 text-sm"><input id={fieldId('confirm')} className="mt-1 size-4 shrink-0 accent-primary" type="checkbox" required checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />This deliverable has been issued; record it in revision history.</label>
        </>}
        <div><label htmlFor={fieldId('notes')} className="text-sm font-medium">{impact ? 'Review observations' : 'Issue note'} (required)</label><textarea id={fieldId('notes')} required maxLength={2000} rows={4} className={control} value={notes} onChange={(event) => setNotes(event.target.value)} /></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2 border-t pt-4"><Button variant="outline" onClick={() => dialog.current.close()}>Cancel</Button><Button type="submit">{busy ? 'Saving…' : impact ? 'Save BP review' : 'Record issued revision'}</Button></div>
      </fieldset></form>
    </WorkItemDialog>
  )
}
