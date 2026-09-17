import { requireUser, getRepository } from '@/lib/auth'
import { redirect } from 'next/navigation'
import TeamClient from './team-client'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function TeamPage() {
  const user = await requireUser()
  if (user.ruolo !== 'admin') redirect('/dashboard')
  const repository = await getRepository()
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const [teamMembers, todaysEvents] = await Promise.all([
    repository.members(), repository.teamEvents(todayStr, todayStr),
  ])

  // Calcola statistiche di oggi
  const stats = {
    ufficio: todaysEvents?.filter(e => e.tipo === 'ufficio').length || 0,
    smartworking: todaysEvents?.filter(e => e.tipo === 'smartworking').length || 0,
    ferie: todaysEvents?.filter(e => e.tipo === 'ferie').length || 0,
    malattia: todaysEvents?.filter(e => e.tipo === 'malattia').length || 0,
    assenti_non_giustificati: (teamMembers?.filter(member => !member.must_change_password).length || 0) - (todaysEvents?.length || 0)
  }

  return (
    <TeamClient 
      initialMembers={teamMembers || []} 
      todaysEvents={todaysEvents || []} 
      stats={stats} 
    />
  )
}
