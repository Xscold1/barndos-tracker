import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WORKSTREAMS } from '@/features/projects/projectModel'
import { projectService } from '@/features/projects/projectService'

const inputClass = 'mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring'

export default function ProjectFormDialog({ project = null, onSaved, onClose }) {
  const dialog = useRef(null)
  const firstField = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const editing = Boolean(project)

  useEffect(() => {
    if (!dialog.current.open) dialog.current.showModal()
    firstField.current.focus()
  }, [])

  async function saveProject(event) {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const fields = {
      project_no: values.get('project_no'), client_name: values.get('client_name'),
      notes: values.get('notes'), not_needed_workstreams: values.getAll('not_needed'),
    }
    setBusy(true)
    setError('')
    try {
      const saved = editing
        ? await projectService.updateProject(project.id, project.row_version, fields)
        : await projectService.createProject(fields)
      dialog.current.close()
      onSaved(saved)
    } catch (error) { setError(error.message) }
    finally { setBusy(false) }
  }

  return (
    <dialog ref={dialog} onClose={onClose} onCancel={(event) => { if (busy) event.preventDefault() }} aria-labelledby="project-form-title" aria-describedby="project-form-description" className="fixed inset-0 m-auto max-h-[calc(100svh_-_2rem)] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-0 text-card-foreground shadow-xl backdrop:bg-slate-950/40">
      <div className="flex items-start justify-between gap-4 border-b p-5">
        <div>
          <h2 id="project-form-title" className="text-lg font-semibold">{editing ? 'Edit project' : 'New project'}</h2>
          <p id="project-form-description" className="mt-1 text-sm text-muted-foreground">{editing ? 'Update the project number, client name, or remarks.' : 'Create a project with five independent workstreams. All work starts unassigned with no deadlines.'}</p>
        </div>
        <Button variant="ghost" size="icon" disabled={busy} aria-label="Close project form" onClick={() => dialog.current.close()}><X className="size-4" aria-hidden="true" /></Button>
      </div>
      <form onSubmit={saveProject} className="p-5">
        <fieldset disabled={busy} className="space-y-4">
          <div>
            <label htmlFor="project-number" className="text-sm font-medium">Project number (required)</label>
            <input ref={firstField} id="project-number" name="project_no" required maxLength={40} defaultValue={project?.project_no ?? ''} className={inputClass} />
          </div>
          <div>
            <label htmlFor="client-name" className="text-sm font-medium">Client / project name (required)</label>
            <input id="client-name" name="client_name" required maxLength={120} defaultValue={project?.client_name ?? ''} className={inputClass} />
          </div>
          <div>
            <label htmlFor="project-notes" className="text-sm font-medium">Remarks (optional)</label>
            <textarea id="project-notes" name="notes" rows={3} maxLength={2000} defaultValue={project?.notes ?? ''} className={inputClass} />
          </div>
          {!editing && (
            <fieldset className="rounded-md border p-3">
              <legend className="px-1 text-sm font-medium">Mark workstreams Not Needed (optional)</legend>
              <div className="mt-1 grid gap-2 sm:grid-cols-2">
                {WORKSTREAMS.map(({ type, label }) => (
                  <label key={type} className="flex items-center gap-2 text-sm"><input type="checkbox" name="not_needed" value={type} className="size-4 accent-primary" />{label}</label>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Leave applicable workstreams unchecked. Quotation’s completion requirement remains to be confirmed.</p>
            </fieldset>
          )}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => dialog.current.close()}>Cancel</Button>
            <Button type="submit">{busy ? 'Saving…' : editing ? 'Save changes' : 'Create project'}</Button>
          </div>
        </fieldset>
      </form>
    </dialog>
  )
}
