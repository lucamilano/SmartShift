import { requireUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

import { Navbar } from '@/components/navbar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireUser()
  if (user.must_change_password) redirect('/primo-accesso')
  return (
    <div className="min-h-screen flex flex-col font-sans text-foreground">
      <Navbar />
      <main className={`mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 ${user.ruolo === 'admin' ? 'pb-24 md:pb-10' : 'pb-10'}`}>
        {children}
      </main>
    </div>
  )
}
