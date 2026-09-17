export function isInvitationExpired(expiresAt: string | null) {
  return !expiresAt || Date.parse(expiresAt) <= Date.now()
}
