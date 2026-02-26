import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { CalendarPlus, CalendarDays, FileDown, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Leggiamo i dati extra dal database
  const { data: profile } = await supabase
    .from('profili')
    .select('nome, cognome, ruolo')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.ruolo === 'admin'

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Benvenuto */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-[#111827] p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Ciao, {profile?.nome || 'Collega'}! 👋
          </h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1 text-sm md:text-base">Questa è la tua panoramica per pianificare le giornate in ufficio.</p>
        </div>
        
        {isAdmin && (
          <div className="px-3 py-1.5 md:px-4 md:py-2 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 rounded-lg flex items-center border border-amber-200 dark:border-amber-900 w-full md:w-auto">
            <ShieldAlert className="w-4 h-4 md:w-5 md:h-5 mr-2 shrink-0" />
            <span className="font-semibold text-xs md:text-sm">Modalità Admin attiva</span>
          </div>
        )}
      </div>

      {/* Griglia Azioni Rapide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card: Le mie presenze */}
        <Card className="hover:border-blue-300 dark:hover:border-blue-700 transition-colors shadow-sm dark:bg-[#111827] dark:border-slate-800">
          <CardHeader>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center mb-4">
              <CalendarDays className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-xl dark:text-white">Il mio calendario</CardTitle>
            <CardDescription className="dark:text-slate-400">
              Visualizza i tuoi turni programmati per questo mese. Modifica i giorni di smartworking o ferie.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base shadow-sm">
              <Link href="/dashboard/calendario">
                Vai al Calendario
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Card: Segnala Presenza Rapida */}
        <Card className="hover:border-green-300 dark:hover:border-green-700 transition-colors shadow-sm bg-gradient-to-br from-white to-green-50/30 dark:from-[#111827] dark:to-green-950/20 dark:border-slate-800">
          <CardHeader>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-xl flex items-center justify-center mb-4">
              <CalendarPlus className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-xl dark:text-white">Nuova Richiesta</CardTitle>
            <CardDescription className="dark:text-slate-400">
              Inserisci velocemente un nuovo permesso, una malattia o un giorno di ferie extra.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full border-green-200 dark:border-green-900/50 hover:bg-green-50 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400 h-12 text-base">
              <Link href="/dashboard/calendario?action=new">
                Inserisci Richiesta
              </Link>
            </Button>
          </CardContent>
        </Card>

      </div>

      {/* Sezione Visibile SOLO agli Admin */}
      {isAdmin && (
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-slate-800">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Strumenti di Amministrazione</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="hover:border-purple-300 dark:hover:border-purple-700 transition-colors bg-purple-50/30 dark:bg-[#111827] dark:border-slate-800">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center text-purple-900 dark:text-purple-300">
                  <FileDown className="w-5 h-5 mr-2" /> Esportazione Dati
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
                  Genera file Excel o CSV scaricabili con tutte le presenze, assenze e turni.
                </p>
                <Button asChild variant="secondary" className="w-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/70">
                  <Link href="/dashboard/esporta">
                    Vai all'esportazione
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

    </div>
  )
}
