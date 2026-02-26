'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getUserEvents(startDate: string, endDate: string, targetUserId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let effectiveUserId = user.id
  if (targetUserId && targetUserId !== user.id) {
    const { data: profile } = await supabase
      .from('profili')
      .select('ruolo')
      .eq('id', user.id)
      .single()
    if (profile?.ruolo !== 'admin') {
      return []
    }
    effectiveUserId = targetUserId
  }

  const { data, error } = await supabase
    .from('eventi_calendario')
    .select('*')
    .eq('utente_id', effectiveUserId)
    .gte('data', startDate)
    .lte('data', endDate)

  if (error) {
    console.error('Error fetching events:', error)
    return []
  }

  return data
}

// Nuova funzione: ottiene solo le ferie approvate di TUTTI i colleghi nel mese (da mostrare nel calendario)
export async function getOthersHolidays(startDate: string, endDate: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('eventi_calendario')
    .select(`
      id, data, tipo,
      profili!inner ( nome, cognome )
    `)
    .eq('profili.is_active', true)
    .neq('utente_id', user.id) // Escludi se stesso
    .in('tipo', ['ferie', 'smartworking', 'malattia']) // Prendi assenze dalla sede
    .gte('data', startDate)
    .lte('data', endDate)

  if (error) {
    console.error('Error fetching others holidays:', error)
    return []
  }

  // Mappa il risultato per l'uso nel client
  return data.map((e: any) => ({
    data: e.data,
    nome: `${e.profili?.nome} ${e.profili?.cognome}`,
    tipo: e.tipo
  }))
}

export async function addEvent(date: string, type: string, isHalfDay: boolean = false, targetUserId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorizzato' }

  let effectiveUserId = user.id
  if (targetUserId && targetUserId !== user.id) {
    const { data: profile } = await supabase
      .from('profili')
      .select('ruolo')
      .eq('id', user.id)
      .single()
    if (profile?.ruolo !== 'admin') {
      return { error: 'Non hai i permessi di Admin per compiere questa azione' }
    }
    effectiveUserId = targetUserId
  }

  const { error } = await supabase
    .from('eventi_calendario')
    .insert([
      {
        utente_id: effectiveUserId,
        data: date,
        tipo: type,
        mezza_giornata: isHalfDay,
        stato: 'approvato' // Salviamo sempre come approvato per snellire
      }
    ])
    
  if (error) {
    // Gestione errore Unique Constraint
    if (error.code === '23505') return { error: 'C è già un evento in questa data. Cancellalo prima di inserirne uno nuovo.' }
    return { error: 'Errore generico: ' + error.message }
  }

  revalidatePath('/dashboard/calendario')
  revalidatePath('/dashboard/team')
  return { success: true }
}

export async function deleteEvent(eventId: string, targetUserId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorizzato' }

  let effectiveUserId = user.id
  if (targetUserId && targetUserId !== user.id) {
    const { data: profile } = await supabase
      .from('profili')
      .select('ruolo')
      .eq('id', user.id)
      .single()
    if (profile?.ruolo !== 'admin') {
      return { error: 'Non hai i permessi di Admin per compiere questa azione' }
    }
    effectiveUserId = targetUserId
  }

  const { error } = await supabase
    .from('eventi_calendario')
    .delete()
    .eq('id', eventId)
    .eq('utente_id', effectiveUserId)

  if (error) return { error: error.message }
  
  revalidatePath('/dashboard/calendario')
  revalidatePath('/dashboard/team')
  return { success: true }
}
