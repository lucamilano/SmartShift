import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { LogoutButton } from '@/components/logout-button'
import { Button } from '@/components/ui/button'
import { Calendar, Users, FileSpreadsheet, KeyRound } from 'lucide-react'
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
          
          <div className="flex items-center gap-6">
            <Link href="/dashboard/calendario">
              <span className="text-lg font-semibold tracking-tight">SmartShift</span>
            </Link>
            <Link href="/dashboard/calendario" className="hidden text-sm text-muted-foreground hover:text-foreground md:block">
              Calendario
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <div className="mr-1 hidden items-center gap-5 border-r pr-4 md:flex">
                <Link href="/dashboard/esporta" className="text-sm text-muted-foreground hover:text-foreground">Esporta</Link>
                <Link href="/dashboard/team" className="text-sm text-muted-foreground hover:text-foreground">Team</Link>
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

      {isAdmin && <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background px-2 pb-safe md:hidden">
        <div className="flex h-16 items-center justify-around">
          <Link href="/dashboard/calendario" className="flex h-full w-full flex-col items-center justify-center text-muted-foreground hover:text-foreground">
            <Calendar className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Calendario</span>
          </Link>
          <Link href="/dashboard/esporta" className="flex h-full w-full flex-col items-center justify-center text-muted-foreground hover:text-foreground">
            <FileSpreadsheet className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Esporta</span>
          </Link>
          <Link href="/dashboard/team" className="flex h-full w-full flex-col items-center justify-center text-muted-foreground hover:text-foreground">
            <Users className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Team</span>
          </Link>
        </div>
      </div>}
    </nav>
  )
}
