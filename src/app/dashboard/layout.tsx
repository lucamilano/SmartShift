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
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900 dark:bg-[#0B1120] dark:text-gray-100 transition-colors">
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
        {children}
      </main>
    </div>
  )
}
