import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { LogoutButton } from '@/components/logout-button'
import { Button } from '@/components/ui/button'
import { Calendar, Users, FileSpreadsheet, KeyRound, LayoutDashboard } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { NavLink } from '@/components/nav-link'

export async function Navbar() {
  const user = await getCurrentUser()
  if (!user) return null
  const profile = user

  const isAdmin = profile?.ruolo === 'admin'
  
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 min-w-0 justify-between gap-2 items-center">
          
          <div className="flex min-w-0 items-center gap-6">
            <Link href="/dashboard" className="flex min-h-11 min-w-0 items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center bg-primary text-sm font-bold text-primary-foreground" aria-hidden="true">S</span>
              <span className="truncate text-base font-semibold tracking-[-0.03em] sm:text-lg">SmartShift</span>
            </Link>
            <nav aria-label="Navigazione principale" className="hidden items-center gap-5 lg:flex">
              <NavLink href="/dashboard" exact>Dashboard</NavLink>
              <NavLink href="/dashboard/calendario">Calendario</NavLink>
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {isAdmin && (
              <nav aria-label="Amministrazione" className="mr-1 hidden items-center gap-5 border-r pr-4 lg:flex">
                <NavLink href="/dashboard/esporta">Esporta</NavLink>
                <NavLink href="/dashboard/team">Team</NavLink>
              </nav>
            )}
            
            <div className="flex items-center gap-0 sm:gap-2">
              <ThemeToggle />
              
              <div className="hidden max-w-36 min-w-0 xl:block text-right border-l pl-3 ml-1">
                <p className="truncate text-sm font-medium">{profile?.nome || 'Utente'}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
              
              <Button asChild variant="ghost" size="icon" title="Cambia password"><Link href="/dashboard/account" aria-label="Cambia password"><KeyRound className="h-5 w-5" /></Link></Button>
              <LogoutButton />
            </div>
          </div>
          
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card px-[max(0.5rem,env(safe-area-inset-left))] pb-[env(safe-area-inset-bottom)] pr-[max(0.5rem,env(safe-area-inset-right))] shadow-[0_-8px_28px_-24px_rgba(0,0,0,.6)] lg:hidden" aria-label="Navigazione mobile">
        <div className="flex h-16 items-center justify-around">
          <NavLink href="/dashboard" mobile exact>
            <LayoutDashboard className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Oggi</span>
          </NavLink>
          <NavLink href="/dashboard/calendario" mobile>
            <Calendar className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Calendario</span>
          </NavLink>
          {isAdmin && <NavLink href="/dashboard/esporta" mobile>
            <FileSpreadsheet className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Esporta</span>
          </NavLink>}
          {isAdmin && <NavLink href="/dashboard/team" mobile>
            <Users className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Team</span>
          </NavLink>}
        </div>
      </nav>
    </header>
  )
}
