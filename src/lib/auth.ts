import 'server-only'
import { cache } from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getEnvironment } from './cloudflare'
import { createAuth } from './auth-options'
import { Repository } from './repository'
import type { Profile } from './models'

export async function getAuth() {
  const env = await getEnvironment()
  return createAuth(env.DB, { baseURL: env.APP_URL, secret: env.BETTER_AUTH_SECRET })
}

// No shared session cache: check the stored session and active profile on every request.
export const getCurrentUser = cache(async (): Promise<Profile | null> => {
  const session = await (await getAuth()).api.getSession({ headers: await headers() })
  if (!session) return null
  const { DB } = await getEnvironment()
  const row = await DB.prepare('SELECT * FROM profili WHERE auth_user_id = ? AND is_active = 1')
    .bind(session.user.id).first<Omit<Profile, 'is_active'> & { is_active: number }>()
  return row ? { ...row, is_active: Boolean(row.is_active) } : null
})

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
}

export async function getRepository() {
  const user = await requireUser()
  return new Repository((await getEnvironment()).DB, user.id)
}
