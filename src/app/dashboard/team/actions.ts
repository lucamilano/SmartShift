'use server'

import { getRepository } from '@/lib/auth'
import { UserError } from '@/lib/repository'
import { revalidatePath } from 'next/cache'

export async function updateProfile(userId: string, nome: string, cognome: string, ruolo: string) {
  const repository = await getRepository()
  try {
    await repository.updateProfile(userId, nome, cognome, ruolo)
  } catch (error) {
    if (error instanceof UserError) return { error: error.message }
    console.error('Unable to update profile', error)
    return { error: 'Impossibile salvare il profilo. Riprova.' }
  }
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function deleteUserAction(userIdToDelete: string) {
  const repository = await getRepository()
  try {
    await repository.deactivateProfile(userIdToDelete)
  } catch (error) {
    if (error instanceof UserError) return { error: error.message }
    console.error('Unable to deactivate profile', error)
    return { error: 'Impossibile disattivare il profilo. Riprova.' }
  }
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}
