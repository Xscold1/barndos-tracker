import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { activityChanges, activityScope, activityTitle } from '@/features/activity/activityModel'
import { useActivity } from '@/features/activity/useActivity'
import { formatUpdatedAt } from '@/features/projects/projectModel'
import WorknoteDialog from '@/components/work-items/WorknoteDialog'

export default function ActivityTimeline({ projectId, revision }) {
  const { events, loading, error, cursor, loadingMore, moreError, reload, loadMore } = useActivity(projectId, revision)
  const [addingNote, setAddingNote] = useState(false)
  const [notice, setNotice] = useState('')
  return (
    <section aria-label="Project activity" className="mt-8 rounded-lg border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-lg font-semibold">Activity & worknotes</h2><p className="mt-1 text-xs text-muted-foreground">Newest first · Event times in Tennessee (CT). Worknotes preserve assignments.</p></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={loading || loadingMore} onClick={reload}>Refresh activity</Button><Button variant="outline" onClick={() => setAddingNote(true)}>Add project note</Button></div>
      </div>
      {notice && <p role="status" className="mt-3 text-sm">{notice}</p>}
      {loading ? <p role="status" className="mt-5 text-sm text-muted-foreground">Loading activity…</p>
        : error ? <div role="alert" className="mt-5 text-sm text-destructive">{error}<Button variant="outline" className="mt-3 block" onClick={reload}>Retry activity</Button></div>
          : !events.length ? <p className="mt-5 text-sm text-muted-foreground">No activity recorded yet. Add a worknote or save a project change.</p>
            : <ol className="mt-5 divide-y" aria-label="Activity entries">
              {events.map((event) => (
                <li key={event.id} className="min-w-0 py-4 first:pt-0" data-activity-id={event.id}>
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm"><span className="font-semibold">{activityTitle(event)}</span><span className="rounded bg-muted px-2 py-0.5 text-xs">{activityScope(event)}</span><span className="text-muted-foreground">by {event.actor_name ?? 'Employee'}</span></div>
                  <time dateTime={event.occurred_at} className="mt-1 block text-xs text-muted-foreground">{formatUpdatedAt(event.occurred_at)}</time>
                  <dl className="mt-2 space-y-2 text-sm">
                    {activityChanges(event).map((change) => (
                      <div key={change.field} className="min-w-0 break-words">
                        <dt className="text-xs font-medium text-muted-foreground">{change.label}</dt>
                        <dd className="mt-0.5 whitespace-pre-wrap">{change.summary ?? (change.long
                          ? <details><summary className="cursor-pointer text-primary">View remarks change</summary><p className="mt-2">Before: {change.before}</p><p className="mt-2">After: {change.after}</p></details>
                          : <><span>{change.before}</span><span aria-hidden="true"> → </span><span className="sr-only"> changed to </span><span className="font-medium">{change.after}</span></>)}</dd>
                      </div>
                    ))}
                  </dl>
                  {event.worknote && <p className="mt-3 border-l-2 pl-3 text-sm leading-6 whitespace-pre-wrap break-words">{event.worknote}</p>}
                </li>
              ))}
            </ol>}
      {moreError && <p role="alert" className="mt-3 text-sm text-destructive">{moreError} Loaded entries are retained.</p>}
      {!loading && !error && cursor && <Button variant="outline" className="mt-3" disabled={loadingMore} onClick={loadMore}>{loadingMore ? 'Loading older activity…' : moreError ? 'Retry older activity' : 'Load older activity'}</Button>}
      {addingNote && <WorknoteDialog projectId={projectId} onClose={() => setAddingNote(false)} onSaved={() => { setAddingNote(false); setNotice('Project worknote added.'); reload() }} />}
    </section>
  )
}
