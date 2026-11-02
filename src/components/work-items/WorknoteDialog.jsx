import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { workItemService } from '@/features/work-items/workItemService'
import WorkItemDialog from './WorkItemDialog'
import { activityService } from '@/features/activity/activityService'

export default function WorknoteDialog({ stream, item, projectId, onSaved, onClose }) {
  const dialog = useRef(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function save(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const saved = projectId ? await activityService.addProjectNote(projectId, text) : await workItemService.addWorknote(item.id, text)
      dialog.current.close()
      onSaved(saved)
    } catch (error) { setError(error.message) }
    finally { setBusy(false) }
  }
  return (
    <WorkItemDialog dialogRef={dialog} title={`Worknote · ${stream?.label ?? 'Project'}`} description="Add a note without changing the assignee, status, deadline or revision." busy={busy} onClose={onClose}>
      <form onSubmit={save} className="space-y-4 p-5">
        <label htmlFor={`worknote-${stream?.type ?? 'project'}`} className="text-sm font-medium">Worknote</label>
        <textarea data-autofocus id={`worknote-${stream?.type ?? 'project'}`} value={text} onChange={(event) => setText(event.target.value)} required maxLength={2000} rows={5} disabled={busy} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring" />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2 border-t pt-4"><Button variant="outline" disabled={busy} onClick={() => dialog.current.close()}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Posting…' : 'Post worknote'}</Button></div>
      </form>
    </WorkItemDialog>
  )
}
