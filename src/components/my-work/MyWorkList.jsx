import { Link } from 'react-router'
import { Card, CardContent } from '@/components/ui/card'
import StatusChip from '@/components/projects/StatusChip'
import DeadlineBadge from '@/components/work-items/DeadlineBadge'
import { formatDeadline, WORKSTREAMS } from '@/features/projects/projectModel'

function ProjectLink({ item, returnPath }) {
  return <Link to={`/projects/${item.project_id}`} state={{ myWorkReturn: returnPath }} className="block rounded-sm break-words focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"><span className="text-xs font-medium text-primary">{item.project_no}</span><span className="mt-1 block font-medium hover:underline">{item.client_name}</span></Link>
}
function Deadline({ item }) {
  return <><span className="block">{item.due_date ? <time dateTime={item.due_date}>{formatDeadline(item.due_date)}</time> : 'No deadline'}</span><DeadlineBadge state={item.deadline_state} /></>
}
function Priority({ item }) {
  return <><span className={item.priority_level === 'High' ? 'font-medium text-rose-800' : ''}>{item.priority_level}</span><span className="mt-1 block text-xs text-muted-foreground">{item.queue_position ? `Queue #${item.queue_position}` : 'No queue position'}</span></>
}
const streamName = (type) => WORKSTREAMS.find((stream) => stream.type === type)?.label ?? type

export default function MyWorkList({ items, returnPath }) {
  return (
    <Card className="shadow-none"><CardContent className="p-4 sm:p-5">
      <div className="hidden xl:block">
        <table className="w-full table-fixed text-left text-sm">
          <caption className="sr-only">Your assignments, ordered by Tennessee deadline, queue position and project.</caption>
          <thead className="border-b text-xs text-muted-foreground"><tr><th scope="col" className="w-[26%] py-3 pr-3 font-medium">Project / client</th><th scope="col" className="w-[16%] px-2 py-3 font-medium">Workstream</th><th scope="col" className="w-[21%] px-2 py-3 font-medium">Deadline (Tennessee CT)</th><th scope="col" className="w-[17%] px-2 py-3 font-medium">Priority / queue</th><th scope="col" className="py-3 pl-2 font-medium">Status</th></tr></thead>
          <tbody className="divide-y divide-border">{items.map((item) => <tr key={item.id} className="align-top hover:bg-muted/30"><th scope="row" className="py-4 pr-3 font-normal"><ProjectLink item={item} returnPath={returnPath} /></th><td className="px-2 py-4">{streamName(item.workstream_type)}</td><td className="px-2 py-4"><Deadline item={item} /></td><td className="px-2 py-4"><Priority item={item} /></td><td className="py-4 pl-2"><StatusChip status={item.status} /></td></tr>)}</tbody>
        </table>
      </div>
      <ul className="space-y-3 xl:hidden" aria-label="Your assignments">{items.map((item) => <li key={item.id} className="rounded-lg border p-4 text-sm"><ProjectLink item={item} returnPath={returnPath} /><p className="mt-2 font-medium">{streamName(item.workstream_type)}</p><dl className="mt-4 grid gap-4 sm:grid-cols-2"><div><dt className="mb-1 text-xs text-muted-foreground">Deadline (Tennessee CT)</dt><dd><Deadline item={item} /></dd></div><div><dt className="mb-1 text-xs text-muted-foreground">Priority / queue</dt><dd><Priority item={item} /></dd></div><div><dt className="mb-1 text-xs text-muted-foreground">Status</dt><dd><StatusChip status={item.status} /></dd></div></dl></li>)}</ul>
    </CardContent></Card>
  )
}
