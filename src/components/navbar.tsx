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
    <nav className="sticky top-0 z-50 border-b bg-background/95">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center bg-brand text-sm font-bold text-white" aria-hidden="true">S</span>
              <span className="text-lg font-semibold tracking-[-0.03em]">SmartShift</span>
            </Link>
            <div className="hidden items-center gap-5 md:flex">
              <NavLink href="/dashboard" exact>Dashboard</NavLink>
              <NavLink href="/dashboard/calendario">Calendario</NavLink>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <div className="mr-1 hidden items-center gap-5 border-r pr-4 md:flex">
                <NavLink href="/dashboard/esporta">Esporta</NavLink>
                <NavLink href="/dashboard/team">Team</NavLink>
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

      {isAdmin && <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card px-2 pb-safe shadow-[0_-8px_28px_-24px_rgba(0,0,0,.6)] md:hidden">
        <div className="flex h-16 items-center justify-around">
          <NavLink href="/dashboard" mobile exact>
            <LayoutDashboard className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Oggi</span>
          </NavLink>
          <NavLink href="/dashboard/calendario" mobile>
            <Calendar className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Calendario</span>
          </NavLink>
          <NavLink href="/dashboard/esporta" mobile>
            <FileSpreadsheet className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Esporta</span>
          </NavLink>
          <NavLink href="/dashboard/team" mobile>
            <Users className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Team</span>
          </NavLink>
        </div>
      </div>}
    </nav>
  )
}
