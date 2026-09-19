import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types'
import type { Profile } from '../src/lib/models'
import { createInvitation, renewInvitation, sendInvitationEmail } from '../src/lib/invitations'
import { Repository } from '../src/lib/repository'

function fixture() {
  const sqlite = new DatabaseSync(':memory:')
  for (const migration of ['0001_initial', '0002_auth', '0003_profile_auth_link', '0004_user_invitations', '0005_calendar_permission_type']) {
    sqlite.exec(readFileSync(`migrations/${migration}.sql`, 'utf8'))
  }
  sqlite.exec(`INSERT INTO "user" (id,name,email,"emailVerified","createdAt","updatedAt") VALUES ('admin','Admin','admin@example.com',1,0,0);
    INSERT INTO profili(id,email,nome,cognome,ruolo,auth_user_id) VALUES ('admin','admin@example.com','Ada','Admin','admin','admin');`)

  type Wrapped = D1PreparedStatement & { executeForTest(): unknown }
  type SqlValue = string | number | bigint | null | Uint8Array
  const db = {
    prepare(sql: string) {
      const statement = sqlite.prepare(sql)
      let values: SqlValue[] = []
      return {
        bind(...args: SqlValue[]) { values = args; return this },
        async first() { return statement.get(...values) || null },
        async all() { return { results: statement.all(...values) } },
        async run() { return { meta: { changes: Number(statement.run(...values).changes) } } },
        executeForTest() { return statement.run(...values) },
      } as unknown as Wrapped
    },
    async batch(statements: Wrapped[]) {
      sqlite.exec('BEGIN')
      try { const results = statements.map(statement => statement.executeForTest()); sqlite.exec('COMMIT'); return results }
      catch (error) { sqlite.exec('ROLLBACK'); throw error }
    },
  } as unknown as D1Database
  const admin = sqlite.prepare('SELECT * FROM profili WHERE id = ?').get('admin') as unknown as Profile
  admin.is_active = true
  admin.must_change_password = false
  return { sqlite, db, admin }
}

test('admin invitation creates a base user with a hashed, expiring temporary password', async () => {
  const { sqlite, db, admin } = fixture()
  try {
    const invitation = await createInvitation(db, admin, { nome: '  Alice ', cognome: ' Rossi ', email: ' ALICE@example.com ' })
    assert.equal(invitation.email, 'alice@example.com')
    assert.equal(invitation.expiresAt.slice(0, 10), new Date(Date.now() + 86_400_000).toISOString().slice(0, 10))
    const profile = sqlite.prepare('SELECT * FROM profili WHERE email = ?').get('alice@example.com')
    assert.equal(profile?.ruolo, 'user')
    assert.equal(profile?.must_change_password, 1)
    assert.equal(profile?.invitation_status, 'pending')
    const account = sqlite.prepare('SELECT password FROM account WHERE "userId" = ?').get(invitation.id)
    assert.notEqual(account?.password, invitation.password)
    assert.equal(JSON.stringify(profile).includes(invitation.password), false)
    await assert.rejects(createInvitation(db, admin, { nome: 'Altro', cognome: 'Nome', email: 'alice@example.com' }), /già un account/)
  } finally { sqlite.close() }
})

test('reinviting rotates the credential, revokes sessions, and never promotes the user', async () => {
  const { sqlite, db, admin } = fixture()
  try {
    const first = await createInvitation(db, admin, { nome: 'Alice', cognome: 'Rossi', email: 'alice@example.com' })
    sqlite.prepare(`INSERT INTO session(id,"expiresAt",token,"createdAt","updatedAt","userId") VALUES ('s',9999999999999,'t',0,0,?)`).run(first.id)
    const oldHash = sqlite.prepare('SELECT password FROM account WHERE "userId" = ?').get(first.id)?.password
    const second = await renewInvitation(db, admin, first.id)
    const newHash = sqlite.prepare('SELECT password FROM account WHERE "userId" = ?').get(first.id)?.password
    assert.notEqual(second.password, first.password)
    assert.notEqual(newHash, oldHash)
    assert.equal(sqlite.prepare('SELECT count(*) AS n FROM session WHERE "userId" = ?').get(first.id)?.n, 0)
    assert.equal(sqlite.prepare('SELECT ruolo FROM profili WHERE id = ?').get(first.id)?.ruolo, 'user')
  } finally { sqlite.close() }
})

test('a deleted email creates a separate new profile without recovering the former identity', async () => {
  const { sqlite, db, admin } = fixture()
  try {
    const first = await createInvitation(db, admin, { nome: 'Alice', cognome: 'Rossi', email: 'alice@example.com' })
    sqlite.prepare(`INSERT INTO eventi_calendario(id,utente_id,data,tipo) VALUES ('event',?,'2026-09-17','ferie')`).run(first.id)
    await new Repository(db, 'admin').removeProfile(first.id)

    const second = await createInvitation(db, admin, { nome: 'Beatrice', cognome: 'Verdi', email: 'alice@example.com' })
    assert.notEqual(second.id, first.id)
    const newProfile = sqlite.prepare('SELECT nome, cognome, ruolo, is_active FROM profili WHERE id = ?').get(second.id)
    assert.equal(newProfile?.nome, 'Beatrice')
    assert.equal(newProfile?.cognome, 'Verdi')
    assert.equal(newProfile?.ruolo, 'user')
    assert.equal(newProfile?.is_active, 1)
    const oldProfile = sqlite.prepare('SELECT email, nome, cognome, is_active FROM profili WHERE id = ?').get(first.id)
    assert.equal(oldProfile?.email, `deleted-${first.id}@invalid.smartshift`)
    assert.equal(oldProfile?.nome, 'Account')
    assert.equal(oldProfile?.cognome, 'eliminato')
    assert.equal(oldProfile?.is_active, 0)
    assert.equal(sqlite.prepare('SELECT count(*) AS n FROM eventi_calendario WHERE utente_id = ?').get(first.id)?.n, 1)
    assert.equal(sqlite.prepare('SELECT count(*) AS n FROM eventi_calendario WHERE utente_id = ?').get(second.id)?.n, 0)
  } finally { sqlite.close() }
})

test('invitation delivery uses the Resend API without exposing the key in the payload', async () => {
  const originalFetch = globalThis.fetch
  let captured: { url?: string; authorization?: string; body?: string } = {}
  globalThis.fetch = async (input, init) => {
    captured = {
      url: String(input),
      authorization: new Headers(init?.headers).get('authorization') || undefined,
      body: String(init?.body),
    }
    return new Response(JSON.stringify({ id: 'email-id' }), { status: 200 })
  }
  try {
    await sendInvitationEmail(
      { apiKey: 'secret-test-key', appURL: 'https://smartshift.example' },
      { id: 'user', deliveryId: 'delivery', nome: 'Alice', cognome: 'Rossi', email: 'alice@example.com', password: 'Temporary-Password-123!', expiresAt: new Date(Date.now() + 60_000).toISOString() },
    )
    assert.equal(captured.url, 'https://api.resend.com/emails')
    assert.equal(captured.authorization, 'Bearer secret-test-key')
    assert.match(captured.body || '', /onboarding@resend\.dev/)
    assert.match(captured.body || '', /Temporary-Password-123!/) // Resend needs the temporary credential to deliver it.
    assert.equal((captured.body || '').includes('secret-test-key'), false)
  } finally { globalThis.fetch = originalFetch }
})
