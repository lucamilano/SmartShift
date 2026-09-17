import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  return new Response(null, { status: await getCurrentUser() ? 204 : 401, headers: { 'Cache-Control': 'no-store' } })
}
