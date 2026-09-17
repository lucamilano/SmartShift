import { getAuth, getCurrentUser } from '@/lib/auth'
import { getEnvironment } from '@/lib/cloudflare'
import { isInvitationExpired } from '@/lib/invitation-status'

export async function POST(request: Request) {
  const env = await getEnvironment()
  if (request.headers.get('origin') !== env.APP_URL) return Response.json({ error: 'Origine non valida.' }, { status: 403 })
  const user = await getCurrentUser()
  if (!user || !user.must_change_password) return Response.json({ error: 'Procedura non disponibile.' }, { status: 403 })
  if (isInvitationExpired(user.temporary_password_expires_at)) {
    return Response.json({ error: 'La password temporanea è scaduta. Chiedi un nuovo invito.' }, { status: 410 })
  }
  const body = await request.json().catch(() => null) as { currentPassword?: unknown; newPassword?: unknown } | null
  if (!body || typeof body.currentPassword !== 'string' || typeof body.newPassword !== 'string') {
    return Response.json({ error: 'Dati non validi.' }, { status: 400 })
  }
  if (body.currentPassword === body.newPassword) return Response.json({ error: 'La nuova password deve essere diversa da quella temporanea.' }, { status: 400 })

  const authRequest = new Request(new URL('/api/auth/change-password', request.url), {
    method: 'POST', headers: request.headers,
    body: JSON.stringify({ currentPassword: body.currentPassword, newPassword: body.newPassword, revokeOtherSessions: true }),
  })
  const changed = await (await getAuth()).handler(authRequest)
  if (!changed.ok) return Response.json({ error: 'Cambio non riuscito. Controlla la password temporanea e i requisiti.' }, { status: changed.status })

  const result = await env.DB.prepare(`UPDATE profili SET must_change_password = 0, temporary_password_expires_at = NULL,
    invitation_status = 'completed' WHERE id = ? AND must_change_password = 1`).bind(user.id).run()
  if (!result.meta.changes) return Response.json({ error: 'Stato account non aggiornato. Riprova.' }, { status: 409 })
  return new Response(changed.body, { status: changed.status, headers: changed.headers })
}
