import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import FirstAccessForm from './first-access-form'
import { isInvitationExpired } from '@/lib/invitation-status'

export const dynamic = 'force-dynamic'

export default async function FirstAccessPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (!user.must_change_password) redirect('/dashboard')
  const expired = isInvitationExpired(user.temporary_password_expires_at)
  return <FirstAccessForm email={user.email} expired={expired} />
}
