import { X } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

export default function ProjectFeedback({ notice, onDismiss }) {
  if (!notice) return null
  return (
    <div role="status" className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-primary/5 px-4 py-3 text-sm">
      <p>{notice.message} {notice.projectId && <Link className="ml-2 font-medium text-primary underline" to={`/projects/${notice.projectId}`}>Open project</Link>}</p>
      <Button variant="ghost" size="icon" aria-label="Dismiss message" onClick={onDismiss}><X className="size-4" aria-hidden="true" /></Button>
    </div>
  )
}
