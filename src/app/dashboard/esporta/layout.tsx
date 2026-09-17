import { requireUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function ExportLayout({ children }: { children: React.ReactNode }) {
  if ((await requireUser()).ruolo !== 'admin') redirect('/dashboard')
  return children
}
