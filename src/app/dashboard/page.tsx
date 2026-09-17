import { requireUser } from '@/lib/auth'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
  const profile = await requireUser()
  const isAdmin = profile.ruolo === 'admin'

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <header>
        <p className="text-sm text-muted-foreground">Panoramica</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
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
          <div className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-medium">Inserisci una presenza</h3>
              <p className="mt-1 text-sm text-muted-foreground">Registra una giornata in ufficio, smartworking, ferie o malattia.</p>
            </div>
            <Button asChild variant="outline" className="self-start sm:self-auto">
              <Link href="/dashboard/calendario?action=new">Vai al calendario</Link>
            </Button>
          </div>
        </div>
      </section>

      {isAdmin && (
        <section aria-labelledby="admin-title" className="border-t pt-7">
          <h2 id="admin-title" className="text-lg font-semibold">Amministrazione</h2>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-medium">Esportazione dati</h3>
              <p className="mt-1 text-sm text-muted-foreground">Genera il foglio mensile delle presenze del team.</p>
            </div>
            <Button asChild variant="outline" className="self-start sm:self-auto">
              <Link href="/dashboard/esporta">Apri esportazione</Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}
