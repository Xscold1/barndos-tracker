import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { STATUSES, formatDeadline } from '@/features/projects/projectModel'
import { workItemService } from '@/features/work-items/workItemService'
import AssigneeSelect from './AssigneeSelect'
import WorkItemDialog from './WorkItemDialog'
import WorkloadWarning from './WorkloadWarning'
import { transitionNeedsReason } from '@/features/work-items/workflowModel'

const control = 'mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring'

export default function WorkstreamEditDialog({ stream, item, initialStatus, onSaved, onClose }) {
  const dialog = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState(null)
  const [acknowledged, setAcknowledged] = useState(false)
  const [draft, setDraft] = useState(() => ({ status: initialStatus ?? item.status, assignee_id: item.assignee_id ?? item.assignee?.id ?? '', required: item.required, priority_level: item.priority_level, revision: item.revision ?? '', notes: item.notes, due_date: item.due_date ?? '', queue_position: item.queue_position ?? '', clear_schedule: false, change_note: '' }))
  const reopening = transitionNeedsReason(stream.type, item.status, draft.status)
  const clearingSchedule = (!draft.assignee_id && Boolean(item.due_date || item.queue_position)) || (!draft.due_date && Boolean(item.queue_position))
  const fieldId = (name) => `work-${name}-${stream.type}`
  function update(name, value) {
    if (['status', 'assignee_id', 'due_date', 'queue_position'].includes(name)) {
      setWarning(null)
      setAcknowledged(false)
      setError('')
    }
    setDraft((current) => ({ ...current, [name]: value,
      ...(name === 'status' && value === 'Not Needed' ? { required: false } : {}),
      ...(['assignee_id', 'due_date'].includes(name) ? { clear_schedule: false } : {}),
      ...(name === 'assignee_id' && !value && !item.due_date && !item.queue_position ? { due_date: '', queue_position: '' } : {}),
      ...(name === 'due_date' && !value && !item.queue_position ? { queue_position: '' } : {}),
    }))
  }
  async function save(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const saved = await workItemService.updateWorkItem(item, { ...draft, workload_acknowledged: acknowledged, workload_token: warning?.token })
      dialog.current.close()
      onSaved(saved)
    } catch (error) {
      setAcknowledged(false)
      if (error.code === 'WORKLOAD_WARNING') setWarning(error.workload)
      else { setWarning(null); setError(error.message) }
    }
    finally { setBusy(false) }
  }
  return (
    <WorkItemDialog dialogRef={dialog} title={`Edit ${stream.label}`} description="Update this workstream independently. Every employee can edit every workstream." busy={busy} onClose={onClose}>
      <form onSubmit={save} className="p-5">
        <fieldset disabled={busy} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label htmlFor={fieldId('status')} className="text-sm font-medium">Status</label><select data-autofocus id={fieldId('status')} className={control} value={draft.status} onChange={(event) => update('status', event.target.value)}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></div>
            <div><label htmlFor={fieldId('scope')} className="text-sm font-medium">Scope</label><select id={fieldId('scope')} className={control} disabled={draft.status === 'Not Needed'} value={draft.required === null ? 'undecided' : draft.required ? 'required' : 'optional'} onChange={(event) => update('required', event.target.value === 'undecided' ? null : event.target.value === 'required')}><option value="required">Required</option><option value="optional">Not required</option>{stream.type === 'quotation' && <option value="undecided">To confirm</option>}</select></div>
          </div>
          {draft.status === 'Not Needed' && <p className="text-xs text-muted-foreground">Not Needed work is excluded from required scope.</p>}
          {['cp', 'bp'].includes(stream.type) && <p className="rounded-md border p-3 text-sm">{item.status} → {draft.status}. {draft.status === 'For Client Review' ? 'Waiting for client action; drafting due/overdue indicators pause.' : draft.status === 'Done' ? 'Record your team’s acceptance decision. Other workstreams keep their own progress.' : 'Only this workstream changes. Returning from client review or reopening requires a reason.'}</p>}
          <AssigneeSelect streamType={stream.type} value={draft.assignee_id} currentAssignee={item.assignee} onChange={(value) => update('assignee_id', value)} disabled={busy} />
          <div><label htmlFor={fieldId('deadline')} className="text-sm font-medium">Deadline (Tennessee CT)</label><input id={fieldId('deadline')} type="date" min="0001-01-01" max="9999-12-31" className={control} value={draft.due_date} disabled={!draft.assignee_id} onChange={(event) => update('due_date', event.target.value)} /><p className="mt-1 text-xs text-muted-foreground">Date only, through the end of the Tennessee day. An assigned employee may have no deadline.</p></div>
          <div><label htmlFor={fieldId('queue')} className="text-sm font-medium">Queue position (optional)</label><input id={fieldId('queue')} type="number" min="1" max="2147483647" step="1" inputMode="numeric" className={control} value={draft.queue_position} disabled={!draft.assignee_id || !draft.due_date} onChange={(event) => update('queue_position', event.target.value)} /><p className="mt-1 text-xs text-muted-foreground">Order for this employee on the Tennessee deadline date. Leave blank for no reserved slot. High priority can be shared by multiple projects.</p></div>
          <p className="text-xs text-muted-foreground">Saved deadline: {formatDeadline(item.due_date)} (Tennessee CT). Queue position: {item.queue_position ?? 'Not set'}.</p>
          {clearingSchedule && <label className="flex items-start gap-2 rounded-md border p-3 text-sm"><input className="mt-1 size-4 shrink-0 accent-primary" type="checkbox" checked={draft.clear_schedule} onChange={(event) => update('clear_schedule', event.target.checked)} />{!draft.assignee_id ? 'Clear the existing deadline and queue position when unassigning this workstream.' : 'Clear the existing queue position when removing this deadline.'}</label>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label htmlFor={fieldId('priority')} className="text-sm font-medium">Priority</label><select id={fieldId('priority')} className={control} value={draft.priority_level} onChange={(event) => update('priority_level', event.target.value)}>{['High','Medium','Low'].map((priority) => <option key={priority}>{priority}</option>)}</select></div>
            <div><label htmlFor={fieldId('revision')} className="text-sm font-medium">Own revision</label><input id={fieldId('revision')} className={control} value={draft.revision} maxLength={40} onChange={(event) => update('revision', event.target.value)} /></div>
          </div>
          <p className="text-xs text-muted-foreground">Changing this label does not issue drawings or change other workstreams.</p>
          <div><label htmlFor={fieldId('notes')} className="text-sm font-medium">Workstream remarks</label><span className="text-red-500"
          >*</span><textarea id={fieldId('notes')} className={control} rows={3} maxLength={2000} value={draft.notes} onChange={(event) => update('notes', event.target.value)} /></div>
          <div><label htmlFor={fieldId('reason')} className="text-sm font-medium">Reason / change note {reopening ? '(required to reopen)' : '(optional)'}</label><textarea id={fieldId('reason')} className={control} rows={2} maxLength={2000} required={reopening} value={draft.change_note} onChange={(event) => update('change_note', event.target.value)} /></div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {warning && <WorkloadWarning warning={warning} acknowledged={acknowledged} onAcknowledge={setAcknowledged} />}
          <div className="flex flex-wrap justify-end gap-2 border-t pt-4"><Button variant="outline" onClick={() => dialog.current.close()}>Cancel</Button><Button type="submit" disabled={Boolean(warning) && !acknowledged}>{busy ? 'Saving…' : warning ? 'Confirm and save' : 'Save workstream'}</Button></div>
        </fieldset>
      </form>
    </WorkItemDialog>
  )
}
