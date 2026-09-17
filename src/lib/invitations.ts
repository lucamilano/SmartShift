import { hashPassword } from 'better-auth/crypto'
import type { D1Database } from '@cloudflare/workers-types'
import type { Profile } from './models'
import { UserError } from './repository'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const INVITATION_HOURS = 24

function validateName(value: string, label: string) {
  const clean = value.trim()
  if (!clean || clean.length > 100) throw new UserError(`${label} obbligatorio, massimo 100 caratteri.`)
  return clean
}

function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase()
  if (email.length > 254 || !EMAIL.test(email)) throw new UserError('Indirizzo email non valido.')
  return email
}

function temporaryPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(18))
  const value = btoa(String.fromCharCode(...bytes)).replaceAll('+', 'A').replaceAll('/', 'b').replaceAll('=', '')
  return `S!${value}9a`
}

export async function createInvitation(db: D1Database, actor: Profile, input: { nome: string; cognome: string; email: string }) {
  if (actor.ruolo !== 'admin' || !actor.is_active || actor.must_change_password) throw new UserError('Non hai i permessi di amministratore.')
  const nome = validateName(input.nome, 'Nome')
  const cognome = validateName(input.cognome, 'Cognome')
  const email = normalizeEmail(input.email)
  if (await db.prepare('SELECT 1 FROM profili WHERE email = ? UNION SELECT 1 FROM "user" WHERE email = ? LIMIT 1').bind(email, email).first()) {
    throw new UserError('Esiste già un account con questa email.')
  }

  const id = crypto.randomUUID()
  const password = temporaryPassword()
  const passwordHash = await hashPassword(password)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + INVITATION_HOURS * 60 * 60 * 1000).toISOString()
  const epoch = now.getTime()
  try {
    await db.batch([
      db.prepare('INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt") VALUES (?, ?, ?, 0, ?, ?)')
        .bind(id, `${nome} ${cognome}`, email, epoch, epoch),
      db.prepare('INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(`${id}:credential`, id, 'credential', id, passwordHash, epoch, epoch),
      db.prepare(`INSERT INTO profili
        (id, email, nome, cognome, ruolo, auth_user_id, must_change_password, temporary_password_expires_at, invitation_status, invited_at, invited_by)
        VALUES (?, ?, ?, ?, 'user', ?, 1, ?, 'pending', ?, ?)`)
        .bind(id, email, nome, cognome, id, expiresAt, now.toISOString(), actor.id),
    ])
  } catch (error) {
    if (String(error).toLowerCase().includes('unique')) throw new UserError('Esiste già un account con questa email.')
    throw error
  }
  return { id, deliveryId: crypto.randomUUID(), nome, cognome, email, password, expiresAt }
}

export async function renewInvitation(db: D1Database, actor: Profile, profileId: string) {
  if (actor.ruolo !== 'admin' || !actor.is_active || actor.must_change_password) throw new UserError('Non hai i permessi di amministratore.')
  const profile = await db.prepare(`SELECT id, email, nome, cognome FROM profili
    WHERE id = ? AND is_active = 1 AND must_change_password = 1`).bind(profileId).first<{id:string;email:string;nome:string;cognome:string}>()
  if (!profile) throw new UserError('Invito non disponibile o primo accesso già completato.')
  const password = temporaryPassword()
  const passwordHash = await hashPassword(password)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + INVITATION_HOURS * 60 * 60 * 1000).toISOString()
  await db.batch([
    db.prepare(`UPDATE account SET password = ?, "updatedAt" = ? WHERE "userId" = ? AND "providerId" = 'credential'`)
      .bind(passwordHash, now.getTime(), profile.id),
    db.prepare(`UPDATE profili SET temporary_password_expires_at = ?, invitation_status = 'pending', invited_at = ?, invited_by = ? WHERE id = ? AND must_change_password = 1`)
      .bind(expiresAt, now.toISOString(), actor.id, profile.id),
    db.prepare('DELETE FROM session WHERE "userId" = ?').bind(profile.id),
  ])
  return { ...profile, deliveryId: crypto.randomUUID(), password, expiresAt }
}

export async function recordInvitationDelivery(db: D1Database, id: string, delivered: boolean) {
  await db.prepare(`UPDATE profili SET invitation_status = ?, invitation_sent_at = CASE WHEN ? THEN ? ELSE invitation_sent_at END
    WHERE id = ? AND must_change_password = 1`).bind(delivered ? 'sent' : 'failed', Number(delivered), new Date().toISOString(), id).run()
}

export async function sendInvitationEmail(config: { apiKey?: string; from?: string; fromName?: string; appURL: string }, invite: {id:string;deliveryId:string;nome:string;cognome:string;email:string;password:string;expiresAt:string}) {
  if (!config.apiKey) throw new UserError('Account creato, ma invio email non configurato. Configura Resend e usa “Reinvia invito”.')
  const fullName = `${invite.nome} ${invite.cognome}`
  const expiry = new Intl.DateTimeFormat('it-IT', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Rome' }).format(new Date(invite.expiresAt))
  const from = config.from || `${config.fromName || 'SmartShift'} <onboarding@resend.dev>`
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${config.apiKey}`,
      'content-type': 'application/json',
      'idempotency-key': invite.deliveryId,
      'user-agent': 'SmartShift/1.0',
    },
    body: JSON.stringify({
      from,
      to: [invite.email],
      subject: 'Il tuo accesso a SmartShift',
      text: `Ciao ${fullName},\n\nil tuo account SmartShift è stato creato.\n\nAccedi a ${config.appURL}/login\nEmail: ${invite.email}\nPassword temporanea: ${invite.password}\n\nLa password scade il ${expiry} e dovrai cambiarla al primo accesso.\n`,
      tags: [{ name: 'category', value: 'smartshift-invitation' }],
    }),
  })
  if (!response.ok) throw new UserError('Account creato, ma il provider email ha rifiutato l’invio. Usa “Reinvia invito”.')
}
