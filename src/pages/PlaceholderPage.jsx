import { ArrowRight, PanelsTopLeft } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function PlaceholderPage({ title, description, placeholder, icon: Icon = PanelsTopLeft }) {
  return (
    <section aria-labelledby="page-title">
      <p className="mb-2 text-xs font-semibold tracking-wider text-primary uppercase">Barndos workspace</p>
      <h1 id="page-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>

      <Card className="mt-8 border-dashed shadow-none">
        <CardContent className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
          <span className="mb-5 flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Icon className="size-6" aria-hidden="true" />
          </span>
          <h2 className="text-base font-semibold">{title === 'Page not found' ? 'Let’s get you back' : `${title} preview`}</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{placeholder}</p>
          <Button asChild variant="outline" className="mt-6">
            <Link to={title === 'Projects' ? '/dashboard' : '/projects'}>
              {title === 'Projects' ? 'Go to Dashboard' : 'Go to Projects'}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}
