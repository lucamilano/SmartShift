import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import TeamClient from './team-client'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verifica che sia Admin
  const { data: profile } = await supabase
    .from('profili')
    .select('ruolo')
    .eq('id', user.id)
    .single()

  if (profile?.ruolo !== 'admin') {
    redirect('/dashboard') // Solo Admin possono accedere qui
  }

  // Estrai tutti i colleghi attivi
  const { data: teamMembers } = await supabase
    .from('profili')
    .select('*')
    .eq('is_active', true)
    .order('cognome', { ascending: true })

  // Estrai le presenze di OGGI
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const { data: todaysEvents } = await supabase
    .from('eventi_calendario')
    .select('*')
    .eq('data', todayStr)

  // Calcola statistiche di oggi
  const stats = {
    ufficio: todaysEvents?.filter(e => e.tipo === 'ufficio').length || 0,
    smartworking: todaysEvents?.filter(e => e.tipo === 'smartworking').length || 0,
    ferie: todaysEvents?.filter(e => e.tipo === 'ferie').length || 0,
    malattia: todaysEvents?.filter(e => e.tipo === 'malattia').length || 0,
    assenti_non_giustificati: (teamMembers?.length || 0) - (todaysEvents?.length || 0)
  }

  return (
    <TeamClient 
      initialMembers={teamMembers || []} 
      todaysEvents={todaysEvents || []} 
      stats={stats} 
    />
  )
}
