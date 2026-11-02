import { Button } from '@/components/ui/button'
import { clientReviewActions } from '@/features/work-items/workflowModel'

export default function ClientReviewActions({ stream, item, onSelect }) {
  const actions = clientReviewActions(stream.type, item.status)
  if (!actions.length) return null
  return (
    <div className="mt-4 space-y-2" aria-label={`${stream.label} client review actions`}>
      <p className="text-xs text-muted-foreground">{item.status === 'For Client Review'
        ? 'Awaiting client response. A revision request returns only this workstream to drafting.'
        : 'Client review and revisions affect only this workstream. Save the chosen status in the editor.'}</p>
      <div className="flex flex-wrap gap-2">{actions.map((action) => <Button key={action.status} variant="outline" onClick={() => onSelect(action.status)}>{action.label}</Button>)}</div>
    </div>
  )
}
