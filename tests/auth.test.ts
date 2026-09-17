import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createAuth } from '../src/lib/auth-options'
import { provisionSql } from '../scripts/provision-sql.mjs'

const origin = 'http://localhost:3000'
const password = 'test-password-long-and-unique'
async function fixture() {
  const db = new DatabaseSync(':memory:')
  for (const migration of ['0001_initial', '0002_auth', '0003_profile_auth_link']) {
    db.exec(readFileSync(`migrations/${migration}.sql`, 'utf8'))
  }
  db.exec(await provisionSql('admin@example.com', password, 'admin'))
  const auth = createAuth(db, { baseURL: origin, secret: 'test-secret-at-least-32-characters-long-random' })
  async function request(path: string, body?: object, cookie = '', requestOrigin = origin, ip = '203.0.113.1') {
    return auth.handler(new Request(`${origin}/api/auth${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', Origin: requestOrigin, Cookie: cookie, 'cf-connecting-ip': ip },
      body: body ? JSON.stringify(body) : undefined,
    }))
  }
  return { db, request }
}

test('password login issues HttpOnly session, rejects wrong credentials, and logout revokes it', async () => {
  const { db, request } = await fixture()
  try {
    assert.equal((await request('/sign-in/email', { email: 'admin@example.com', password: 'wrong-password' })).status, 401)
    const login = await request('/sign-in/email', { email: 'admin@example.com', password })
    assert.equal(login.status, 200)
    const cookie = login.headers.getSetCookie().map(v => v.split(';')[0]).join('; ')
    assert.match(login.headers.get('set-cookie')!, /httponly/i)
    const session = await (await request('/get-session', undefined, cookie)).json()
    assert.equal(session.user.email, 'admin@example.com')
    assert.equal((await request('/sign-out', {}, cookie)).status, 200)
    assert.equal(await (await request('/get-session', undefined, cookie)).json(), null)
  } finally { db.close() }
})

test('registration is closed, cross-origin login is rejected, and login attempts are rate limited', async () => {
  const { db, request } = await fixture()
  try {
    assert.notEqual((await request('/sign-up/email', { email: 'attacker@example.com', password, name: 'X' })).status, 200)
    assert.equal((await request('/sign-in/email', { email: 'admin@example.com', password }, '', 'https://attacker.example')).status, 403)
    let status = 0
    for (let attempt = 0; attempt < 6; attempt++) {
      status = (await request('/sign-in/email', { email: 'admin@example.com', password: 'wrong-password' }, '', origin, '203.0.113.2')).status
    }
    assert.equal(status, 429)
    assert.equal(db.prepare('SELECT count(*) AS n FROM "user"').get()?.n, 1)
  } finally { db.close() }
})

test('password change requires current password; operator reset revokes sessions without reactivating users', async () => {
  const { db, request } = await fixture()
  try {
    const login = await request('/sign-in/email', { email: 'admin@example.com', password })
    const cookie = login.headers.getSetCookie().map(v => v.split(';')[0]).join('; ')
    assert.notEqual((await request('/change-password', { currentPassword: 'wrong', newPassword: 'new-password-long-enough', revokeOtherSessions: true }, cookie)).status, 200)
    assert.equal((await request('/change-password', { currentPassword: password, newPassword: 'new-password-long-enough', revokeOtherSessions: true }, cookie)).status, 200)
    db.exec('UPDATE profili SET is_active = 0')
    db.exec(await provisionSql('admin@example.com', password, 'user'))
    assert.equal(await (await request('/get-session', undefined, cookie)).json(), null)
    const profile = db.prepare('SELECT ruolo, is_active FROM profili').get()
    assert.equal(profile?.ruolo, 'admin')
    assert.equal(profile?.is_active, 0)
  } finally { db.close() }
})
