import { test } from 'node:test'
import assert from 'node:assert/strict'
import { summarizeDashboard } from '../src/lib/dashboard'
import type { CalendarEvent, Profile } from '../src/lib/models'

const member = (id: string, nome: string, ruolo: 'user' | 'admin' = 'user') => ({
  id, nome, cognome: '', email: `${id}@example.com`, ruolo, is_active: true,
  created_at: '', must_change_password: false, temporary_password_expires_at: null,
  invitation_status: 'completed', invited_at: null, invitation_sent_at: null, invited_by: null,
}) satisfies Profile

const event = (utente_id: string, data: string, tipo: CalendarEvent['tipo'], mezza_giornata = false) => ({
  id: `${utente_id}-${data}`, utente_id, data, tipo, mezza_giornata, stato: 'approvato', created_at: '',
}) satisfies CalendarEvent

test('dashboard totals count half days and build the current work week', () => {
  const summary = summarizeDashboard([
    event('alice', '2026-09-14', 'ufficio'),
    event('bob', '2026-09-14', 'smartworking', true),
    event('bob', '2026-09-15', 'permesso', true),
    event('alice', '2026-09-19', 'ferie'),
  ], [member('alice', 'Alice'), member('bob', 'Bob')], new Date(2026, 8, 19, 12))

  assert.equal(summary.monthTotals.ufficio, 1)
  assert.equal(summary.monthTotals.smartworking, 0.5)
  assert.equal(summary.monthTotals.permesso, 0.5)
  assert.equal(summary.monthTotals.ferie, 1)
  assert.deepEqual(summary.week.map(day => day.date), ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18'])
  assert.equal(summary.week[0].planned, 2)
})

test('Friday insight ranks the longest completed smart-working streak', () => {
  const summary = summarizeDashboard([
    event('alice', '2026-09-04', 'smartworking'),
    event('alice', '2026-09-11', 'smartworking'),
    event('alice', '2026-09-18', 'smartworking'),
    event('bob', '2026-09-04', 'smartworking'),
    event('bob', '2026-09-18', 'smartworking'),
    event('bob', '2026-09-25', 'smartworking'),
  ], [member('alice', 'Alice'), member('bob', 'Bob', 'admin')], new Date(2026, 8, 19, 12))

  assert.equal(summary.completedFridayCount, 3)
  assert.equal(summary.smartFridays[0].name, 'Alice')
  assert.equal(summary.smartFridays[0].longestStreak, 3)
  assert.equal(summary.smartFridays[1].longestStreak, 1)
  assert.equal(summary.smartFridays[1].total, 2)
})
