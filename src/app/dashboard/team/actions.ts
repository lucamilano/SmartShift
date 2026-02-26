'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(userId: string, nome: string, cognome: string, ruolo: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorizzato' }

  // Controllo permessi Admin
  const { data: profile } = await supabase
    .from('profili')
    .select('ruolo')
    .eq('id', user.id)
    .single()

  if (profile?.ruolo !== 'admin') {
    return { error: 'Non hai i permessi di Admin' }
  }

  // Eseguiamo l'aggiornamento
  const { error } = await supabase
    .from('profili')
    .update({ 
      nome: nome, 
      cognome: cognome, 
      ruolo: ruolo 
    })
    .eq('id', userId)

  if (error) {
    return { error: 'Errore durante il salvataggio: ' + error.message }
  }

  // Ricarica i dati della pagina
  revalidatePath('/dashboard/team')
  return { success: true }
}

export async function deleteUserAction(userIdToDelete: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorizzato' }

  // Check if admin
  const { data: profile } = await supabase
    .from('profili')
    .select('ruolo')
    .eq('id', user.id)
    .single()

  if (profile?.ruolo !== 'admin') {
    return { error: 'Non hai i permessi di Admin' }
  }

  // Prevent self deletion
  if (user.id === userIdToDelete) {
    return { error: 'Non puoi cancellare il tuo stesso account.' }
  }

  // Eseguiamo un SOFT DELETE oscurando il profilo anziché cancellarlo
  const { error } = await supabase
    .from('profili')
    .update({ is_active: false })
    .eq('id', userIdToDelete)

  if (error) {
    return { error: 'Errore durante la disattivazione dell\'utente: ' + error.message }
  }

  revalidatePath('/dashboard/team')
  return { success: true }
}
