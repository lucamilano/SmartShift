import { requireUser, getRepository } from '@/lib/auth'
import { redirect } from 'next/navigation'
import CalendarClient from './calendar-client'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import { getOthersHolidays } from './actions'

export const dynamic = 'force-dynamic'

export default async function CalendarioPage({ searchParams }: { searchParams: Promise<{ userId?: string }> }) {
  const user = await requireUser()
  const repository = await getRepository()
  const { userId: targetUserId } = await searchParams
  const effectiveUserId = targetUserId || user.id
  if (effectiveUserId !== user.id && user.ruolo !== 'admin') redirect('/dashboard/calendario')
  const targetProfile = await repository.profile(effectiveUserId)
  const targetUserName = effectiveUserId === user.id ? '' :
    ([targetProfile.nome, targetProfile.cognome].filter(Boolean).join(' ') || targetProfile.email)

  // Carichiamo gli eventi del mese corrente per il primo rendering
  const startDate = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const endDate = format(endOfMonth(new Date()), 'yyyy-MM-dd')

  const initialEvents = await repository.events(startDate, endDate, effectiveUserId)

  const initialOthersHolidays = await getOthersHolidays(startDate, endDate)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {targetUserName ? `Calendario di ${targetUserName}` : 'Il mio calendario'}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground sm:text-base">
          {targetUserName 
            ? 'Stai modificando la pianificazione di questo collega.'
            : 'Seleziona un giorno per aggiungere una presenza; usa il cestino per rimuoverla.'}
        </p>
      </header>

      <CalendarClient initialEvents={initialEvents || []} initialOthersHolidays={initialOthersHolidays || []} targetUserId={targetUserId} targetUserName={targetUserName} />
    </div>
  )
}
