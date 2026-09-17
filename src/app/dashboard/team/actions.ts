'use server'

import { getCurrentUser, getRepository } from '@/lib/auth'
import { getEnvironment } from '@/lib/cloudflare'
import { createInvitation, recordInvitationDelivery, renewInvitation, sendInvitationEmail } from '@/lib/invitations'
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

function publicMember(member: { id: string; email: string; nome: string; cognome: string }) {
  return { id: member.id, email: member.email, nome: member.nome, cognome: member.cognome, ruolo: 'user' as const, must_change_password: true, invitation_status: 'pending' as const }
}

export async function createUserAction(nome: string, cognome: string, email: string) {
  const actor = await getCurrentUser()
  if (!actor) return { error: 'Sessione scaduta. Accedi di nuovo.' }
  const env = await getEnvironment()
  try {
    const invitation = await createInvitation(env.DB, actor, { nome, cognome, email })
    try {
      await sendInvitationEmail({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM, fromName: env.EMAIL_FROM_NAME, appURL: env.APP_URL }, invitation)
      await recordInvitationDelivery(env.DB, invitation.id, true)
      revalidatePath('/dashboard/team')
      return { success: true, member: { ...publicMember(invitation), invitation_status: 'sent' as const } }
    } catch (error) {
      await recordInvitationDelivery(env.DB, invitation.id, false)
      revalidatePath('/dashboard/team')
      return {
        warning: error instanceof UserError ? error.message : 'Account creato, ma invio email non riuscito.',
        temporaryPassword: invitation.password,
        member: { ...publicMember(invitation), invitation_status: 'failed' as const },
      }
    }
  } catch (error) {
    if (error instanceof UserError) return { error: error.message }
    console.error('Unable to create user invitation', error)
    return { error: 'Impossibile creare l’account. Riprova.' }
  }
}

export async function resendInvitationAction(profileId: string) {
  const actor = await getCurrentUser()
  if (!actor) return { error: 'Sessione scaduta. Accedi di nuovo.' }
  const env = await getEnvironment()
  try {
    const invitation = await renewInvitation(env.DB, actor, profileId)
    try {
      await sendInvitationEmail({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM, fromName: env.EMAIL_FROM_NAME, appURL: env.APP_URL }, invitation)
      await recordInvitationDelivery(env.DB, invitation.id, true)
      revalidatePath('/dashboard/team')
      return { success: true }
    } catch (error) {
      await recordInvitationDelivery(env.DB, invitation.id, false)
      return {
        error: error instanceof UserError ? error.message : 'Invio email non riuscito.',
        temporaryPassword: invitation.password,
      }
    }
  } catch (error) {
    if (error instanceof UserError) return { error: error.message }
    console.error('Unable to resend invitation', error)
    return { error: 'Impossibile reinviare l’invito. Riprova.' }
  }
}
