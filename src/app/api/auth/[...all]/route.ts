import { getAuth, getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return (await getAuth()).handler(request)
}

export async function POST(request: Request) {
  if (new URL(request.url).pathname.endsWith('/change-password') && (await getCurrentUser())?.must_change_password) {
    return Response.json({ message: 'Usa la procedura di primo accesso.' }, { status: 403 })
  }
  return (await getAuth()).handler(request)
}
