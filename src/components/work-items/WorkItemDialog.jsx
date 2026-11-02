import { useEffect, useId } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function WorkItemDialog({ dialogRef, title, description, busy, onClose, children }) {
  const titleId = useId()
  const descriptionId = useId()
  useEffect(() => {
    if (!dialogRef.current.open) dialogRef.current.showModal()
    dialogRef.current.querySelector('[data-autofocus]')?.focus()
  }, [dialogRef])
  return (
    <dialog ref={dialogRef} onClose={onClose} onCancel={(event) => { if (busy) event.preventDefault() }} aria-labelledby={titleId} aria-describedby={descriptionId} className="fixed inset-0 m-auto max-h-[calc(100svh_-_2rem)] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-xl border bg-card p-0 text-card-foreground shadow-xl backdrop:bg-slate-950/40">
      <div className="flex items-start justify-between gap-3 border-b p-5">
        <div><h2 id={titleId} className="text-lg font-semibold">{title}</h2><p id={descriptionId} className="mt-1 text-sm text-muted-foreground">{description}</p></div>
        <Button variant="ghost" size="icon" disabled={busy} aria-label="Close workstream dialog" onClick={() => dialogRef.current.close()}><X className="size-4" aria-hidden="true" /></Button>
      </div>
      {children}
    </dialog>
  )
}
