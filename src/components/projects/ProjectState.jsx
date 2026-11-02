import { Card, CardContent } from '@/components/ui/card'

export default function ProjectState({ title, children, loading = false, error = false }) {
  return (
    <Card className="mt-6 shadow-none">
      <CardContent className="py-12 text-center" role={error ? 'alert' : 'status'} aria-busy={loading}>
        <h2 className="font-semibold">{title}</h2>
        {children && <div className="mt-2 text-sm text-muted-foreground">{children}</div>}
      </CardContent>
    </Card>
  )
}
