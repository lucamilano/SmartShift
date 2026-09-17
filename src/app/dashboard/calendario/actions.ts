'use server'

import { getRepository } from '@/lib/auth'
import { UserError } from '@/lib/repository'
import { revalidatePath } from 'next/cache'

export async function getUserEvents(startDate: string, endDate: string, targetUserId?: string) {
  return (await getRepository()).events(startDate, endDate, targetUserId)
}

export async function getOthersHolidays(startDate: string, endDate: string) {
  return (await getRepository()).othersHolidays(startDate, endDate)
}

export async function addEvent(date: string, type: string, isHalfDay = false, targetUserId?: string) {
  const repository = await getRepository()
  try {
    await repository.addEvent(date, type, isHalfDay, targetUserId)
  } catch (error) {
    if (error instanceof UserError) return { error: error.message }
    console.error('Unable to create calendar event', error)
    return { error: 'Impossibile salvare la presenza. Riprova.' }
  }
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function deleteEvent(eventId: string, targetUserId?: string) {
  const repository = await getRepository()
  try {
    await repository.deleteEvent(eventId, targetUserId)
  } catch (error) {
    if (error instanceof UserError) return { error: error.message }
    console.error('Unable to delete calendar event', error)
    return { error: 'Impossibile eliminare la presenza. Riprova.' }
  }
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}
