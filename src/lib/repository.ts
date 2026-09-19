import type { D1Database } from '@cloudflare/workers-types'
import type { CalendarEvent, Profile } from './models'

type ProfileRow = Omit<Profile, 'is_active' | 'must_change_password'> & { is_active: number; must_change_password: number }
type EventRow = Omit<CalendarEvent, 'mezza_giornata'> & { mezza_giornata: number }

export class UserError extends Error {}

export function validateDate(value: string) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) {
    throw new UserError('Data non valida.')
  }
}

function validateRange(start: string, end: string) {
  validateDate(start)
  validateDate(end)
  if (start > end) throw new UserError('Intervallo di date non valido.')
}

// Every application query is scoped to an authenticated, active actor.
// D1 has no PostgreSQL RLS: these checks are the authorization boundary.
export class Repository {
  constructor(private db: D1Database, private actorId: string) {}

  async currentProfile(): Promise<Profile> {
    const row = await this.db.prepare('SELECT * FROM profili WHERE id = ? AND is_active = 1')
      .bind(this.actorId).first<ProfileRow>()
    if (!row) throw new UserError('Account non autorizzato o disattivato.')
    const profile = { ...row, is_active: Boolean(row.is_active), must_change_password: Boolean(row.must_change_password) }
    if (profile.must_change_password) throw new UserError('Completa il primo accesso prima di usare SmartShift.')
    return profile
  }

  private async admin() {
    const actor = await this.currentProfile()
    if (actor.ruolo !== 'admin') throw new UserError('Non hai i permessi di amministratore.')
    return actor
  }

  private async target(targetId = this.actorId) {
    const actor = await this.currentProfile()
    if (targetId !== actor.id && actor.ruolo !== 'admin') throw new UserError('Non autorizzato.')
    const row = await this.db.prepare('SELECT * FROM profili WHERE id = ? AND is_active = 1')
      .bind(targetId).first<ProfileRow>()
    if (!row) throw new UserError('Utente non disponibile.')
    return { ...row, is_active: Boolean(row.is_active), must_change_password: Boolean(row.must_change_password) }
  }

  async profile(targetId: string) {
    return this.target(targetId)
  }

  async members(): Promise<Profile[]> {
    await this.admin()
    const { results } = await this.db.prepare('SELECT * FROM profili WHERE is_active = 1 ORDER BY cognome, nome, email').all<ProfileRow>()
    return results.map(row => ({ ...row, is_active: Boolean(row.is_active), must_change_password: Boolean(row.must_change_password) }))
  }

  async events(start: string, end: string, targetId?: string): Promise<CalendarEvent[]> {
    const target = await this.target(targetId)
    validateRange(start, end)
    const { results } = await this.db.prepare('SELECT * FROM eventi_calendario WHERE utente_id = ? AND data BETWEEN ? AND ? ORDER BY data')
      .bind(target.id, start, end).all<EventRow>()
    return results.map(row => ({ ...row, mezza_giornata: Boolean(row.mezza_giornata) }))
  }

  async teamEvents(start: string, end: string): Promise<CalendarEvent[]> {
    await this.admin()
    validateRange(start, end)
    const { results } = await this.db.prepare('SELECT e.* FROM eventi_calendario e JOIN profili p ON p.id = e.utente_id WHERE p.is_active = 1 AND e.data BETWEEN ? AND ? ORDER BY e.data')
      .bind(start, end).all<EventRow>()
    return results.map(row => ({ ...row, mezza_giornata: Boolean(row.mezza_giornata) }))
  }

  async teamSchedule(start: string, end: string) {
    await this.currentProfile()
    validateRange(start, end)
    const { results } = await this.db.prepare(`SELECT e.data, e.tipo, e.mezza_giornata,
      p.id AS utente_id, p.email, p.nome, p.cognome, p.ruolo
      FROM eventi_calendario e JOIN profili p ON p.id = e.utente_id
      WHERE p.is_active = 1 AND e.stato = 'approvato' AND e.data BETWEEN ? AND ?
      ORDER BY e.data, p.cognome, p.nome, p.email`)
      .bind(start, end).all<{
        data: string; tipo: CalendarEvent['tipo']; mezza_giornata: number; utente_id: string
        email: string; nome: string; cognome: string; ruolo: Profile['ruolo']
      }>()
    return results.map(row => ({ ...row, mezza_giornata: Boolean(row.mezza_giornata) }))
  }

  async othersHolidays(start: string, end: string, targetId?: string) {
    const target = await this.target(targetId)
    validateRange(start, end)
    const { results } = await this.db.prepare(`SELECT e.data, e.tipo, trim(p.nome || ' ' || p.cognome) AS nome
      FROM eventi_calendario e JOIN profili p ON p.id = e.utente_id
      WHERE p.is_active = 1 AND e.utente_id != ? AND e.tipo IN ('ferie', 'permesso', 'smartworking', 'malattia')
      AND e.stato = 'approvato' AND e.data BETWEEN ? AND ? ORDER BY e.data`)
      .bind(target.id, start, end).all<{ data: string; tipo: string; nome: string }>()
    return results
  }

  async addEvent(date: string, type: string, halfDay: boolean, targetId?: string) {
    const target = await this.target(targetId)
    validateDate(date)
    if (!['ferie', 'permesso', 'smartworking', 'malattia', 'ufficio'].includes(type) || typeof halfDay !== 'boolean') {
      throw new UserError('Tipo di presenza non valido.')
    }
    const result = await this.db.prepare(`INSERT INTO eventi_calendario (id, utente_id, data, tipo, mezza_giornata)
      VALUES (?, ?, ?, ?, ?) ON CONFLICT (utente_id, data) DO NOTHING`)
      .bind(crypto.randomUUID(), target.id, date, type, Number(halfDay)).run()
    if (!result.meta.changes) throw new UserError('Esiste già un evento in questa data. Cancellalo prima di inserirne uno nuovo.')
  }

  async deleteEvent(eventId: string, targetId?: string) {
    const target = await this.target(targetId)
    const result = await this.db.prepare('DELETE FROM eventi_calendario WHERE id = ? AND utente_id = ?')
      .bind(eventId, target.id).run()
    if (!result.meta.changes) throw new UserError('Evento non trovato o non autorizzato.')
  }

  async updateProfile(id: string, nome: string, cognome: string, ruolo: string) {
    await this.admin()
    if (typeof nome !== 'string' || typeof cognome !== 'string' || nome.length > 100 || cognome.length > 100 || !['user', 'admin'].includes(ruolo)) {
      throw new UserError('Dati del profilo non validi.')
    }
    if (id === this.actorId && ruolo !== 'admin') throw new UserError('Non puoi rimuovere il tuo ruolo di amministratore.')
    const result = await this.db.prepare('UPDATE profili SET nome = ?, cognome = ?, ruolo = ? WHERE id = ? AND is_active = 1')
      .bind(nome.trim(), cognome.trim(), ruolo, id).run()
    if (!result.meta.changes) throw new UserError('Utente non disponibile.')
  }

  async removeProfile(id: string) {
    await this.admin()
    if (id === this.actorId) throw new UserError('Non puoi rimuovere il tuo account.')
    const profile = await this.db.prepare('SELECT id, auth_user_id FROM profili WHERE id = ? AND is_active = 1')
      .bind(id).first<{ id: string; auth_user_id: string | null }>()
    if (!profile) throw new UserError('Utente non disponibile.')

    // Keep calendar rows for operational traceability, but remove the identity and
    // all authentication material.  The original email is released so a later
    // invitation creates a genuinely new profile, rather than reviving this one.
    const archivedEmail = `deleted-${profile.id}@invalid.smartshift`
    const statements = [
      this.db.prepare(`UPDATE profili SET
        email = ?, nome = 'Account', cognome = 'eliminato', ruolo = 'user', is_active = 0,
        auth_user_id = NULL, must_change_password = 0, temporary_password_expires_at = NULL,
        invitation_status = 'completed', invited_at = NULL, invitation_sent_at = NULL, invited_by = NULL
        WHERE id = ? AND is_active = 1`).bind(archivedEmail, profile.id),
    ]
    if (profile.auth_user_id) statements.push(this.db.prepare('DELETE FROM "user" WHERE id = ?').bind(profile.auth_user_id))
    await this.db.batch(statements)
  }
}
