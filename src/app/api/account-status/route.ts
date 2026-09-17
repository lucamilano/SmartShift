import { getCurrentUser } from '@/lib/auth'
import { isInvitationExpired } from '@/lib/invitation-status'

export async function GET() {
  const user = await getCurrentUser()
  const headers = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json' }
  if (!user) return Response.json({ status: 'unauthenticated' }, { status: 401, headers })
  if (user.must_change_password) {
    const expired = isInvitationExpired(user.temporary_password_expires_at)
    return Response.json({ status: expired ? 'invitation-expired' : 'password-change-required' }, { status: expired ? 410 : 200, headers })
  }
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
}
