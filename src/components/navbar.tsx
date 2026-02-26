import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Calendar, Users, FileSpreadsheet, LogOut, Home } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

export async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  // Andiamo a leggere il profilo dell'utente loggato per scoprire il suo ruolo
  const { data: profile } = await supabase
    .from('profili')
    .select('ruolo, nome, cognome')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.ruolo === 'admin'
  
  // Questa è una Server Action per fare il logout direttamente dalla Navbar
  const handleSignOut = async () => {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <nav className="border-b bg-white dark:bg-[#111827] dark:border-slate-800 shadow-sm sticky top-0 z-50 transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          
          {/* Logo e Link Principali (A sinistra) */}
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="rounded-lg bg-blue-600 p-2">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">SmartShift</span>
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
          <div className="flex items-center gap-4">
            {isAdmin && (
              <div className="hidden md:flex items-center space-x-1 border-r pr-4 mr-2 border-gray-200 dark:border-slate-700">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full mr-2">
                  Admin
                </span>
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
              
              <div className="hidden sm:block text-right border-l pl-4 ml-1 border-gray-200 dark:border-slate-700">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{profile?.nome || 'Utente'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
              </div>
              
              <form action={handleSignOut}>
                <Button type="submit" variant="ghost" size="icon" className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30" title="Esci">
                  <LogOut className="h-5 w-5" />
                </Button>
              </form>
            </div>
          </div>
          
        </div>
      </div>

      {/* --- MENU BOTTOM MOBILE RESPONSIVE --- */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#111827] border-t border-gray-200 dark:border-slate-800 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-50 px-2 pb-safe transition-colors">
        <div className="flex justify-around items-center h-16">
          <Link href="/dashboard" className="flex flex-col items-center justify-center w-full h-full text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-slate-800 transition-colors">
            <Home className="h-5 w-5 mb-1" />
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link href="/dashboard/calendario" className="flex flex-col items-center justify-center w-full h-full text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-slate-800 transition-colors">
            <Calendar className="h-5 w-5 mb-1" />
            <span className="text-[10px] font-medium">Turni</span>
          </Link>
          {isAdmin && (
            <>
              <Link href="/dashboard/esporta" className="flex flex-col items-center justify-center w-full h-full text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-slate-800 transition-colors">
                <FileSpreadsheet className="h-5 w-5 mb-1" />
                <span className="text-[10px] font-medium">Esporta</span>
              </Link>
              <Link href="/dashboard/team" className="flex flex-col items-center justify-center w-full h-full text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-slate-800 transition-colors relative">
                <span className="absolute top-1 right-2 w-2 h-2 bg-blue-500 rounded-full"></span>
                <Users className="h-5 w-5 mb-1" />
                <span className="text-[10px] font-medium">Team</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
