import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { LogoutButton } from '@/components/logout-button'
import { Button } from '@/components/ui/button'
import { Calendar, Users, FileSpreadsheet, KeyRound, Home } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

export async function Navbar() {
  const user = await getCurrentUser()
  if (!user) return null
  const profile = user

  const isAdmin = profile?.ruolo === 'admin'
  
  return (
    <nav className="border-b bg-background sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          
          {/* Logo e Link Principali (A sinistra) */}
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-lg font-semibold tracking-tight">SmartShift</span>
            </Link>
            
            <div className="hidden md:flex space-x-1">
              <Button asChild variant="ghost" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800">
                <Link href="/dashboard">
                  <Home className="mr-2 h-4 w-4" /> Home
                </Link>
              </Button>
              <Button asChild variant="ghost" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800">
                <Link href="/dashboard/calendario">
                  <Calendar className="mr-2 h-4 w-4" /> Turni e Ferie
                </Link>
              </Button>
            </div>
          </div>

          {/* Menu Admin e Logout (A destra) */}
          <div className="flex items-center gap-2">
            {isAdmin && (
              <div className="hidden md:flex items-center space-x-1 border-r pr-3 mr-1">
                <Button asChild variant="ghost" className="text-gray-600 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800">
                  <Link href="/dashboard/esporta">
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> Esporta
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="text-gray-600 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800">
                  <Link href="/dashboard/team">
                    <Users className="mr-2 h-4 w-4" /> Team
                  </Link>
                </Button>
              </div>
            )}
            
            <div className="flex items-center gap-2 sm:gap-3">
              <ThemeToggle />
              
              <div className="hidden lg:block text-right border-l pl-3 ml-1">
                <p className="text-sm font-medium">{profile?.nome || 'Utente'}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              
              <Button asChild variant="ghost" size="icon" title="Cambia password"><Link href="/dashboard/account" aria-label="Cambia password"><KeyRound className="h-5 w-5" /></Link></Button>
              <LogoutButton />
            </div>
          </div>
          
        </div>
      </div>

      {/* --- MENU BOTTOM MOBILE RESPONSIVE --- */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-50 px-2 pb-safe">
        <div className="flex justify-around items-center h-16">
          <Link href="/dashboard" className="flex flex-col items-center justify-center w-full h-full text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-slate-800 transition-colors">
            <Home className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Home</span>
          </Link>
          <Link href="/dashboard/calendario" className="flex flex-col items-center justify-center w-full h-full text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-slate-800 transition-colors">
            <Calendar className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Turni</span>
          </Link>
          {isAdmin && (
            <>
              <Link href="/dashboard/esporta" className="flex flex-col items-center justify-center w-full h-full text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-slate-800 transition-colors">
                <FileSpreadsheet className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">Esporta</span>
              </Link>
              <Link href="/dashboard/team" className="flex flex-col items-center justify-center w-full h-full text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-slate-800 transition-colors">
                <Users className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">Team</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
