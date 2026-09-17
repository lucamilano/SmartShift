import { requireUser } from '@/lib/auth'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
  const profile = await requireUser()

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Ciao, {profile.nome || 'Collega'}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Consulta e aggiorna la pianificazione delle tue giornate.
        </p>
      </header>

      <section aria-labelledby="attivita-title">
        <h2 id="attivita-title" className="text-lg font-semibold">Attività</h2>
        <div className="mt-3 divide-y border-y">
          <div className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-medium">Il mio calendario</h3>
              <p className="mt-1 text-sm text-muted-foreground">Visualizza e modifica turni, smartworking, ferie e assenze.</p>
            </div>
            <Button asChild className="self-start sm:self-auto">
              <Link href="/dashboard/calendario">Apri calendario</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
