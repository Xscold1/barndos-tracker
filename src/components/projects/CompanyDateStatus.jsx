import { Button } from '@/components/ui/button'
import { formatDeadline } from '@/features/projects/projectModel'

export default function CompanyDateStatus({ companyToday, error, onRetry }) {
  if (!companyToday) return null
  return (
    <div className="mt-4 text-xs text-muted-foreground">
      <p>Company date: <span className="font-medium">{formatDeadline(companyToday)}</span> · Tennessee time (CT). Deadline indicators use this date.</p>
      {error && <div role="alert" className="mt-2 flex flex-wrap items-center gap-3 rounded-md border p-3 text-sm"><p>The Tennessee date could not be refreshed. Indicators remain as of {formatDeadline(companyToday)}.</p><Button variant="outline" onClick={onRetry}>Retry company date</Button></div>}
    </div>
  )
}
