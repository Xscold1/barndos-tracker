import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { projectService } from '@/features/projects/projectService'

export default function ArchiveProjectDialog({ project, onSaved, onClose }) {
  const dialog = useRef(null)
  const cancelButton = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const restoring = Boolean(project.archived_at)
  useEffect(() => {
    if (!dialog.current.open) dialog.current.showModal()
    cancelButton.current.focus()
  }, [])

  async function confirm() {
    setBusy(true)
    setError('')
    try {
      const saved = await projectService.setArchived(project.id, project.row_version, !restoring)
      dialog.current.close()
      onSaved(saved)
    } catch (error) { setError(error.message) }
    finally { setBusy(false) }
  }

  return (
    <dialog ref={dialog} onClose={onClose} onCancel={(event) => { if (busy) event.preventDefault() }} aria-labelledby="archive-title" aria-describedby="archive-description" className="fixed inset-0 m-auto max-h-[calc(100svh_-_2rem)] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-xl border bg-card p-6 text-card-foreground shadow-xl backdrop:bg-slate-950/40">
      <h2 id="archive-title" className="text-lg font-semibold">{restoring ? 'Restore project?' : 'Archive project?'}</h2>
      <p className="mt-2 break-words text-sm font-medium">{project.project_no} · {project.client_name}</p>
      <p id="archive-description" className="mt-3 text-sm leading-6 text-muted-foreground">{restoring ? 'This project will reappear in the active list.' : 'This project will be hidden from the active list. Its workstreams, revisions, and history will be kept.'}</p>
      {!restoring && <p className="mt-2 text-sm leading-6 text-muted-foreground">Existing assignments, deadlines, and reserved queue positions remain unchanged.</p>}
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button ref={cancelButton} variant="outline" disabled={busy} onClick={() => dialog.current.close()}>Cancel</Button>
        <Button disabled={busy} onClick={confirm}>{busy ? 'Saving…' : restoring ? 'Restore project' : 'Archive project'}</Button>
      </div>
    </dialog>
  )
}
