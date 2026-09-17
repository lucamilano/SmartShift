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
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 mb-8 transition-colors">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          {targetUserName ? `Calendario di ${targetUserName}` : 'Il Mio Calendario'}
        </h1>
        <p className="text-gray-500 dark:text-slate-400 mt-2 text-lg">
          {targetUserName 
            ? 'Stai agendo come Amministratore per questo collega. Modifica i giorni o inserisci nuove presenze.' 
            : 'Pianifica le tue giornate. Clicca su un giorno vuoto per inserire una presenza, o sulla piccola cestino per cancellarla se hai sbagliato.'}
        </p>
      </div>

      <CalendarClient initialEvents={initialEvents || []} initialOthersHolidays={initialOthersHolidays || []} targetUserId={targetUserId} targetUserName={targetUserName} />
    </div>
  )
}
