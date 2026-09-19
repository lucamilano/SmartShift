import Link from 'next/link'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { ArrowRight, CalendarDays } from 'lucide-react'
import { requireUser, getRepository } from '@/lib/auth'
import { dashboardRange, PRESENCE_LABELS, PRESENCE_TYPES, summarizeDashboard, type PresenceType } from '@/lib/dashboard'
import type { Profile } from '@/lib/models'

export const dynamic = 'force-dynamic'

const TYPE_STYLE: Record<PresenceType, string> = {
  ufficio: 'bg-emerald-600', smartworking: 'bg-blue-600', permesso: 'bg-violet-500', ferie: 'bg-amber-500', malattia: 'bg-rose-500',
}
const formatDays = (value: number) => Number.isInteger(value) ? String(value) : value.toLocaleString('it-IT')

export default async function DashboardPage() {
  const user = await requireUser()
  const repository = await getRepository()
  const today = new Date()
  const range = dashboardRange(today)
  const isAdmin = user.ruolo === 'admin'
  const [members, events] = await Promise.all([
    isAdmin ? repository.members() : Promise.resolve([user] as Profile[]),
    isAdmin ? repository.teamEvents(range.start, range.end) : repository.events(range.start, range.end),
  ])
  const summary = summarizeDashboard(events, members, today)
  const firstName = user.nome?.trim() || 'utente'
  const todayEvent = events.find(event => event.utente_id === user.id && event.data === format(today, 'yyyy-MM-dd'))

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <header className="flex flex-col gap-5 border-b border-brand/15 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="page-kicker">{format(today, 'EEEE d MMMM', { locale: it })}</p>
          <h1 className="page-title">Buongiorno, {firstName}</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            {isAdmin ? 'La situazione del team, dalla giornata di oggi alle tendenze del mese.' : 'La tua pianificazione, dalla giornata di oggi al riepilogo del mese.'}
          </p>
        </div>
        <Link href="/dashboard/calendario" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-strong hover:text-brand dark:text-brand">
          Apri il calendario <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </header>

      <section aria-labelledby="today-title">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <div><p className="page-kicker">Primo colpo d’occhio</p><h2 id="today-title" className="text-2xl font-semibold tracking-[-0.03em]">Oggi</h2></div>
          {isAdmin && <p className="text-sm text-muted-foreground">{summary.todayPlanned} di {members.length} pianificati</p>}
        </div>
        {isAdmin ? (
          <dl className="grid grid-cols-2 border-y border-brand/15 bg-card sm:grid-cols-5 sm:divide-x sm:divide-brand/15">
            {PRESENCE_TYPES.map(type => (
              <div key={type} className="relative px-4 py-5 sm:px-6">
                <span className={`absolute inset-y-4 left-0 w-1 ${TYPE_STYLE[type]}`} aria-hidden="true" />
                <dt className="text-sm text-muted-foreground">{PRESENCE_LABELS[type]}</dt>
                <dd className="mt-1 text-3xl font-semibold tabular-nums">{formatDays(summary.todayTotals[type])}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <div className="border-l-2 border-brand bg-accent/25 px-5 py-5">
            <p className="text-sm text-muted-foreground">La tua giornata</p>
            <p className="mt-1 text-xl font-semibold">{todayEvent ? PRESENCE_LABELS[todayEvent.tipo] : 'Non ancora pianificata'}</p>
            {todayEvent?.mezza_giornata && <p className="mt-1 text-sm text-muted-foreground">Mezza giornata</p>}
          </div>
        )}
      </section>

      <section aria-labelledby="week-title">
        <div className="mb-4"><p className="page-kicker">Da lunedì a venerdì</p><h2 id="week-title" className="text-2xl font-semibold tracking-[-0.03em]">Settimana in corso</h2></div>
        <div className="overflow-x-auto border bg-card">
          <div className="grid min-w-[680px] grid-cols-5 divide-x">
            {summary.week.map(day => {
              const date = new Date(`${day.date}T12:00:00`)
              const isToday = day.date === format(today, 'yyyy-MM-dd')
              return (
                <div key={day.date} className={isToday ? 'bg-accent/35' : undefined}>
                  <div className="border-b px-4 py-3"><p className={`text-sm font-semibold capitalize ${isToday ? 'text-brand-strong dark:text-brand' : ''}`}>{format(date, 'EEEE', { locale: it })}</p><p className="text-xs text-muted-foreground">{format(date, 'd MMM')}</p></div>
                  <dl className="space-y-2 px-4 py-3">
                    {PRESENCE_TYPES.map(type => <div key={type} className="flex items-center justify-between gap-2 text-xs"><dt className="flex items-center gap-1.5 text-muted-foreground"><span className={`size-1.5 ${TYPE_STYLE[type]}`} />{PRESENCE_LABELS[type]}</dt><dd className="font-semibold tabular-nums">{formatDays(day.totals[type])}</dd></div>)}
                  </dl>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <div className={`grid gap-8 ${isAdmin ? 'lg:grid-cols-[1.25fr_.75fr]' : ''}`}>
        <section aria-labelledby="month-title">
          <div className="mb-4"><p className="page-kicker">{format(today, 'MMMM yyyy', { locale: it })}</p><h2 id="month-title" className="text-2xl font-semibold tracking-[-0.03em]">Riepilogo del mese</h2></div>
          <div className="border bg-card p-5 sm:p-6">
            <dl className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-5">
              {PRESENCE_TYPES.map(type => <div key={type}><dt className="flex items-center gap-2 text-sm text-muted-foreground"><span className={`size-2 ${TYPE_STYLE[type]}`} />{PRESENCE_LABELS[type]}</dt><dd className="mt-2 text-3xl font-semibold tabular-nums">{formatDays(summary.monthTotals[type])}</dd><p className="mt-1 text-xs text-muted-foreground">giorni pianificati</p></div>)}
            </dl>
          </div>
        </section>

        {isAdmin && (
          <section aria-labelledby="friday-title">
            <div className="mb-4"><p className="page-kicker">Equilibrio del team</p><h2 id="friday-title" className="text-2xl font-semibold tracking-[-0.03em]">Venerdì in smart</h2></div>
            <div className="border-l-2 border-warm bg-warm/15 px-5 py-5">
              <p className="text-sm leading-relaxed text-muted-foreground">Serie consecutive sui {summary.completedFridayCount} venerdì già trascorsi nel mese.</p>
              {summary.smartFridays.some(person => person.longestStreak >= 2) ? (
                <ol className="mt-4 divide-y divide-warm/30">
                  {summary.smartFridays.filter(person => person.longestStreak >= 2).slice(0, 5).map((person, index) => (
                    <li key={person.userId} className="flex items-center justify-between gap-4 py-3 first:pt-0">
                      <div><p className="text-sm font-semibold"><span className="mr-2 text-warm-foreground">{index + 1}.</span>{person.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{person.role === 'admin' ? 'Admin' : 'Utente'} · {person.total} venerdì totali</p></div>
                      <div className="text-right"><strong className="text-2xl tabular-nums text-warm-foreground">{person.longestStreak}</strong><p className="text-[11px] text-muted-foreground">consecutivi</p></div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="mt-5 flex items-start gap-3"><CalendarDays className="mt-0.5 size-5 text-warm-foreground" aria-hidden="true" /><p className="text-sm">Nessuna serie di almeno due venerdì consecutivi da segnalare.</p></div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
