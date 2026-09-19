import { requireUser, getRepository } from '@/lib/auth'
import { redirect } from 'next/navigation'
import CalendarClient from './calendar-client'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import { getTeamSchedule } from './actions'
import { CalendarUserPicker } from './calendar-user-picker'

export const dynamic = 'force-dynamic'

export default async function CalendarioPage({ searchParams }: { searchParams: Promise<{ userId?: string }> }) {
  const user = await requireUser()
  const repository = await getRepository()
  const { userId: targetUserId } = await searchParams
  const effectiveUserId = targetUserId || user.id
  if (effectiveUserId !== user.id && user.ruolo !== 'admin') redirect('/dashboard/calendario')
  const [targetProfile, calendarUsers] = await Promise.all([
    repository.profile(effectiveUserId),
    user.ruolo === 'admin' ? repository.members() : Promise.resolve([]),
  ])
  const targetUserName = effectiveUserId === user.id ? '' :
    ([targetProfile.nome, targetProfile.cognome].filter(Boolean).join(' ') || targetProfile.email)

  // Carichiamo gli eventi del mese corrente per il primo rendering
  const startDate = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const endDate = format(endOfMonth(new Date()), 'yyyy-MM-dd')

  const initialEvents = await repository.events(startDate, endDate, effectiveUserId)

  const initialTeamSchedule = await getTeamSchedule(startDate, endDate)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="page-kicker">Pianificazione mensile</p>
          <h1 className="page-title">
            {targetUserName ? `Calendario di ${targetUserName}` : 'Il mio calendario'}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {targetUserName
              ? 'Stai modificando la pianificazione di questo collega.'
              : 'Seleziona un giorno per aggiungere una presenza; usa il cestino per rimuoverla.'}
          </p>
        </div>
        {user.ruolo === 'admin' && (
          <CalendarUserPicker users={calendarUsers} selectedUserId={effectiveUserId} loggedUserId={user.id} />
        )}
      </header>

      <CalendarClient initialEvents={initialEvents || []} initialTeamSchedule={initialTeamSchedule || []} targetUserId={effectiveUserId} targetUserName={targetUserName} />
    </div>
  )
}
