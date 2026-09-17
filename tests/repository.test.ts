import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { D1Database } from '@cloudflare/workers-types'
import { Repository } from '../src/lib/repository'

function fixture() {
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec(readFileSync('migrations/0001_initial.sql', 'utf8'))
  sqlite.exec(readFileSync('migrations/0002_auth.sql', 'utf8'))
  sqlite.exec(readFileSync('migrations/0003_profile_auth_link.sql', 'utf8'))
  sqlite.exec(readFileSync('migrations/0004_user_invitations.sql', 'utf8'))
  sqlite.exec(`INSERT INTO "user" (id,name,email,"emailVerified","createdAt","updatedAt") VALUES
    ('admin','Admin','admin@example.com',1,0,0), ('alice','Alice','alice@example.com',1,0,0), ('bob','Bob','bob@example.com',1,0,0);
    INSERT INTO profili(id,email,ruolo,auth_user_id) VALUES
    ('admin','admin@example.com','admin','admin'), ('alice','alice@example.com','user','alice'), ('bob','bob@example.com','user','bob')`)
  // Run the production SQL against SQLite with the D1 prepare/bind result shape.
  const db = { prepare(sql: string) {
    const statement = sqlite.prepare(sql)
    let values: (string | number | null)[] = []
    return {
      bind(...args: typeof values) { values = args; return this },
      async first() { return statement.get(...values) || null },
      async all() { return { results: statement.all(...values) } },
      async run() { return { meta: { changes: Number(statement.run(...values).changes) } } },
      executeForTest() { return statement.run(...values) },
    }
  }, async batch(statements: Array<{ executeForTest(): unknown }>) {
    sqlite.exec('BEGIN')
    try {
      const results = statements.map(statement => statement.executeForTest())
      sqlite.exec('COMMIT')
      return results
    } catch (error) {
      sqlite.exec('ROLLBACK')
      throw error
    }
  } } as unknown as D1Database
  return { sqlite, admin: new Repository(db, 'admin'), alice: new Repository(db, 'alice'), bob: new Repository(db, 'bob'), anonymous: new Repository(db, 'missing') }
}

test('calendar CRUD, half-days, duplicates, and date validation', async () => {
  const { sqlite, alice } = fixture()
  try {
    await alice.addEvent('2026-09-17', 'ferie', true)
    const events = await alice.events('2026-09-01', '2026-09-30')
    assert.equal(events.length, 1)
    assert.equal(events[0].mezza_giornata, true)
    await assert.rejects(alice.addEvent('2026-09-17', 'ufficio', false), /già un evento/)
    await assert.rejects(alice.addEvent('2026-02-30', 'ufficio', false), /Data non valida/)
    await assert.rejects(alice.addEvent('2026-09-18', 'invalid', false), /non valido/)
    await assert.rejects(alice.events('2026-09-30', '2026-09-01'), /Intervallo/)
    await alice.deleteEvent(events[0].id)
    assert.deepEqual(await alice.events('2026-09-01', '2026-09-30'), [])
  } finally { sqlite.close() }
})

test('users cannot read/write another calendar or administer profiles/export', async () => {
  const { sqlite, alice, bob, anonymous } = fixture()
  try {
    await bob.addEvent('2026-09-17', 'ufficio', false)
    const [event] = await bob.events('2026-09-01', '2026-09-30')
    await assert.rejects(alice.events('2026-09-01', '2026-09-30', 'bob'), /Non autorizzato/)
    await assert.rejects(alice.addEvent('2026-09-18', 'ferie', false, 'bob'), /Non autorizzato/)
    await assert.rejects(alice.deleteEvent(event.id), /non autorizzato/)
    await assert.rejects(alice.deleteEvent(event.id, 'bob'), /Non autorizzato/)
    await assert.rejects(alice.updateProfile('alice', 'A', 'B', 'admin'), /permessi/)
    await assert.rejects(alice.removeProfile('bob'), /permessi/)
    await assert.rejects(alice.members(), /permessi/)
    await assert.rejects(alice.teamEvents('2026-09-01', '2026-09-30'), /permessi/)
    await assert.rejects(anonymous.othersHolidays('2026-09-01', '2026-09-30'), /non autorizzato/)
    assert.equal((await bob.events('2026-09-01', '2026-09-30')).length, 1)
  } finally { sqlite.close() }
})

test('admins archive colleagues, remove credentials, and preserve anonymized history', async () => {
  const { sqlite, admin, alice } = fixture()
  try {
    await admin.updateProfile('alice', 'Alice', 'Rossi', 'user')
    await admin.addEvent('2026-09-17', 'ferie', false, 'alice')
    assert.equal((await admin.teamEvents('2026-09-01', '2026-09-30')).length, 1)
    assert.equal((await admin.othersHolidays('2026-09-01', '2026-09-30'))[0].nome, 'Alice Rossi')
    await assert.rejects(admin.removeProfile('admin'), /tuo account/)
    await assert.rejects(admin.updateProfile('admin', '', '', 'user'), /tuo ruolo/)
    await admin.removeProfile('alice')
    await assert.rejects(alice.events('2026-09-01', '2026-09-30'), /disattivato/)
    await assert.rejects(alice.addEvent('2026-09-18', 'ufficio', false), /disattivato/)
    await assert.rejects(admin.addEvent('2026-09-18', 'ufficio', false, 'alice'), /non disponibile/)
    assert.equal((await admin.members()).length, 2)
    assert.deepEqual(await admin.teamEvents('2026-09-01', '2026-09-30'), [])
    assert.deepEqual(await admin.othersHolidays('2026-09-01', '2026-09-30'), [])
    assert.equal(sqlite.prepare('SELECT count(*) AS n FROM eventi_calendario').get()?.n, 1)
    const archived = sqlite.prepare('SELECT email, nome, cognome, auth_user_id FROM profili WHERE id = ?').get('alice')
    assert.equal(archived?.email, 'deleted-alice@invalid.smartshift')
    assert.equal(archived?.nome, 'Account')
    assert.equal(archived?.cognome, 'eliminato')
    assert.equal(archived?.auth_user_id, null)
    assert.equal(sqlite.prepare('SELECT count(*) AS n FROM "user" WHERE id = ?').get('alice')?.n, 0)
  } finally { sqlite.close() }
})

test('bound SQL handles hostile text without changing its meaning', async () => {
  const { sqlite, admin } = fixture()
  try {
    const name = "Robert'); DROP TABLE profili; --"
    await admin.updateProfile('alice', name, '', 'user')
    assert.equal((await admin.profile('alice')).nome, name)
    assert.equal((await admin.members()).length, 3)
  } finally { sqlite.close() }
})

test('an invited user cannot use application data before changing the temporary password', async () => {
  const { sqlite, alice } = fixture()
  try {
    sqlite.prepare(`UPDATE profili SET must_change_password = 1, invitation_status = 'sent', temporary_password_expires_at = ? WHERE id = 'alice'`)
      .run(new Date(Date.now() + 60_000).toISOString())
    await assert.rejects(alice.events('2026-09-01', '2026-09-30'), /primo accesso/)
    await assert.rejects(alice.addEvent('2026-09-17', 'ufficio', false), /primo accesso/)
  } finally { sqlite.close() }
})
