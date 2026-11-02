import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/useAuth'
import { useEmployees } from '@/features/work-items/useEmployees'

export default function AssigneeSelect({ streamType, value, currentAssignee, onChange, disabled }) {
  const { profile } = useAuth()
  const { data: employees, loading, error, reload } = useEmployees()
  const [search, setSearch] = useState('')
  const matching = employees.filter((employee) => employee.display_name.toLowerCase().includes(search.trim().toLowerCase()))
  const selected = employees.find(({ id }) => id === value) ?? (currentAssignee?.id === value ? currentAssignee : null)
  const visible = selected && !matching.some(({ id }) => id === selected.id) ? [selected, ...matching] : matching
  const blocked = disabled || loading || Boolean(error)
  return (
    <fieldset className="space-y-2 rounded-md border p-3">
      <legend className="px-1 text-sm font-medium">Assignee</legend>
      <label className="block text-xs text-muted-foreground" htmlFor={`assignee-search-${streamType}`}>Search employees across all departments</label>
      <input id={`assignee-search-${streamType}`} type="search" value={search} disabled={blocked} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring" />
      <label className="sr-only" htmlFor={`assignee-${streamType}`}>Assigned employee</label>
      <select id={`assignee-${streamType}`} value={value} disabled={blocked} onChange={(event) => onChange(event.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring">
        <option value="">Unassigned</option>
        {visible.map((employee) => {
          const inactive = !loading && !error && !employees.some(({ id }) => id === employee.id)
          const duplicate = employees.some((other) => other.id !== employee.id && other.display_name === employee.display_name)
          return <option key={employee.id} value={employee.id} disabled={inactive}>{employee.display_name}{inactive ? ' (current inactive assignee)' : duplicate ? ` · ${employee.id.slice(-6)}` : ''}</option>
        })}
      </select>
      {loading && <p role="status" className="text-xs text-muted-foreground">Loading employees…</p>}
      {error && <div role="alert" className="text-sm text-destructive">{error}<Button variant="outline" className="mt-2" onClick={reload}>Retry employees</Button></div>}
      {!loading && !error && search && !matching.length && <p role="status" className="text-xs text-muted-foreground">No matching employees. Your current selection is unchanged.</p>}
      <Button variant="outline" disabled={blocked} onClick={() => { setSearch(''); onChange(profile.id) }}>Assign to me</Button>
    </fieldset>
  )
}
