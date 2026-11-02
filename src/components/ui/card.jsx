import { cn } from '@/lib/utils'

function Card({ className, ...props }) {
  return <div data-slot="card" className={cn('rounded-xl border border-border bg-card text-card-foreground shadow-sm', className)} {...props} />
}

function CardContent({ className, ...props }) {
  return <div data-slot="card-content" className={cn('p-6', className)} {...props} />
}

export { Card, CardContent }
