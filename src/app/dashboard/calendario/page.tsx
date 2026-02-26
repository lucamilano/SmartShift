import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import CalendarClient from './calendar-client'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import { getOthersHolidays } from './actions'

export const dynamic = 'force-dynamic'

export default async function CalendarioPage({ searchParams }: { searchParams: Promise<{ userId?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const resolvedSearchParams = await searchParams
  const targetUserId = resolvedSearchParams.userId

  let effectiveUserId = user.id
  let targetUserName = ''

  if (targetUserId && targetUserId !== user.id) {
    const { data: profile } = await supabase
      .from('profili')
      .select('ruolo')
      .eq('id', user.id)
      .single()
      
    if (profile?.ruolo === 'admin') {
      effectiveUserId = targetUserId
      
      const { data: targetProfile } = await supabase
        .from('profili')
        .select('nome, cognome')
        .eq('id', targetUserId)
        .single()
        
      if (targetProfile) {
        targetUserName = `${targetProfile.nome} ${targetProfile.cognome}`
      }
    }
  }

  // Carichiamo gli eventi del mese corrente per il primo rendering
  const startDate = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const endDate = format(endOfMonth(new Date()), 'yyyy-MM-dd')

  const { data: initialEvents } = await supabase
    .from('eventi_calendario')
    .select('*')
    .eq('utente_id', effectiveUserId)
    .gte('data', startDate)
    .lte('data', endDate)

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
