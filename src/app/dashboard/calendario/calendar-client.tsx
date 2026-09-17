'use client'

import { useState, useEffect } from 'react'
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isToday, addMonths, subMonths, getDay, isWeekend } from 'date-fns'
import { it } from 'date-fns/locale'
import { getItalianHoliday } from '@/utils/holidays'
import { ChevronLeft, ChevronRight, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { addEvent, deleteEvent, getUserEvents, getOthersHolidays } from './actions'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type Event = {
  id: string
  data: string
  tipo: string
  mezza_giornata: boolean
}

type OtherHoliday = {
  data: string
  nome: string
  tipo: string
}

const TYPE_COLORS: Record<string, string> = {
  'smartworking': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  'ferie': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-200 border-yellow-300 dark:border-yellow-800',
  'malattia': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800',
  'ufficio': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800',
}

const TYPE_LABELS: Record<string, string> = {
  'smartworking': 'Smartworking',
  'ferie': 'Ferie',
  'malattia': 'Malattia',
  'ufficio': 'In Ufficio',
}

export default function CalendarClient({ 
  initialEvents, 
  initialOthersHolidays,
  targetUserId, 
  targetUserName 
}: { 
  initialEvents: Event[], 
  initialOthersHolidays: OtherHoliday[],
  targetUserId?: string, 
  targetUserName?: string 
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [othersHolidays, setOthersHolidays] = useState<OtherHoliday[]>(initialOthersHolidays)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [eventType, setEventType] = useState('smartworking')
  const [isHalfDay, setIsHalfDay] = useState<'false' | 'true'>('false')
  const [loading, setLoading] = useState(false)

  // State per modali Custom (Alert / Confirm)
  const [alertOpen, setAlertOpen] = useState(false)
  const [alertConfig, setAlertConfig] = useState<{
    title: string, 
    description: string, 
    isConfirm: boolean,
    onConfirm?: () => void
  }>({ title: '', description: '', isConfirm: false })

  const showAlert = (title: string, description: string) => {
    setAlertConfig({ title, description, isConfirm: false })
    setAlertOpen(true)
  }

  const showConfirm = (title: string, description: string, onConfirm: () => void) => {
    setAlertConfig({ title, description, isConfirm: true, onConfirm })
    setAlertOpen(true)
  }

  // Mesi precedenti e successivi
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

  // Ricarica i dati (senza ricaricare la pagina) quando si cambia mese
  useEffect(() => {
    const fetchEvents = async () => {
      const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
      const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
      
      const [myData, othersData] = await Promise.all([
        getUserEvents(start, end, targetUserId),
        getOthersHolidays(start, end)
      ])
      
      setEvents(myData)
      setOthersHolidays(othersData)
    }
    fetchEvents()
  }, [currentMonth, targetUserId])

  // Calcola quante celle vuote mettere all'inizio (il giorno 0 per Date-fns è Domenica)
  const firstDayOfMonth = getDay(startOfMonth(currentMonth))
  const paddingDays = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  })

  // Apre la modale per l'inserimento
  const handleDayClick = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd')
    const existingEvent = events.find(e => e.data === dayStr)
    
    if (existingEvent) {
      showAlert('Giorno Occupato', "C'è già un evento inserito in questa data. Clicca sul cestino per rimuoverlo.")
      return
    }

    const isHoliday = getItalianHoliday(day)
    if (isHoliday) {
      showConfirm(
        'Attenzione: Giorno Festivo', 
        `Il giorno selezionato è ${isHoliday}. Vuoi davvero inserire un evento in un giorno festivo?`,
        () => {
          setSelectedDate(day)
          setIsModalOpen(true)
        }
      )
      return
    } else if (isWeekend(day)) {
      showConfirm(
        'Attenzione: Fine Settimana', 
        `Il giorno selezionato è il weekend (${getDay(day) === 6 ? 'Sabato' : 'Domenica'}). Vuoi davvero inserire un evento?`,
        () => {
          setSelectedDate(day)
          setIsModalOpen(true)
        }
      )
      return
    }

    setSelectedDate(day)
    setIsModalOpen(true)
  }

  // Esegue l'azione di salvataggio
  const handleCreate = async () => {
    if (!selectedDate) return
    setLoading(true)
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const res = await addEvent(dateStr, eventType, isHalfDay === 'true', targetUserId)
    setLoading(false)
    
    if (res.error) {
      showAlert('Errore di Salvataggio', res.error)
    } else {
      setIsModalOpen(false)
      // Ricarichiamo in tempo reale
      const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
      const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
      const newEvents = await getUserEvents(start, end, targetUserId)
      setEvents(newEvents)
    }
  }

  // Elimina un giorno
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation() // Evita che il click sul cestino apra anche la modale per inserire
    const res = await deleteEvent(id, targetUserId)
    if (!res.error) {
      setEvents(events.filter(ev => ev.id !== id))
    } else {
      showAlert('Errore Cancellazione', res.error)
    }
  }

  return (
    <section className="border bg-card overflow-hidden" aria-label="Calendario mensile">
      
      {targetUserName && (
        <div className="bg-amber-50 dark:bg-amber-950/30 px-4 py-3 border-b border-amber-200 dark:border-amber-900 text-sm text-amber-900 dark:text-amber-200">
          Stai modificando il calendario di <strong>{targetUserName}</strong>.
        </div>
      )}

      {/* Intestazione Mese */}
      <div className="flex items-center justify-between p-4 border-b sm:px-5">
        <h2 className="text-xl font-semibold capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: it })}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth} aria-label="Mese precedente" className="h-10 w-10 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth} aria-label="Mese successivo" className="h-10 w-10 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="p-2 sm:p-4">
        {/* Nomi dei giorni della settimana */}
        <div className="grid grid-cols-7 gap-1 mb-2 sm:gap-2">
          {[
            { short: 'L', full: 'Lun' }, { short: 'M', full: 'Mar' }, { short: 'M', full: 'Mer' }, 
            { short: 'G', full: 'Gio' }, { short: 'V', full: 'Ven' }, { short: 'S', full: 'Sab' }, { short: 'D', full: 'Dom' }
          ].map((day, i) => (
            <div key={i} className="text-center text-xs font-medium text-muted-foreground">
              <span className="md:hidden">{day.short}</span>
              <span className="hidden md:inline">{day.full}</span>
            </div>
          ))}
        </div>

        {/* Griglia giorni del mese */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          
          {/* Spazi vuoti di padding iniziale */}
          {Array.from({ length: paddingDays }).map((_, i) => (
            <div key={`pad-${i}`} className="min-h-20 bg-muted/20 sm:min-h-24"></div>
          ))}

          {/* Giorni Reali */}
          {days.map((day) => {
            const dayStr = format(day, 'yyyy-MM-dd')
            const dayEvent = events.find(e => e.data === dayStr)
            const today = isToday(day)
            const holidayName = getItalianHoliday(day)
            const weekend = isWeekend(day)
            const absentColleagues = othersHolidays.filter(h => h.data === dayStr)
            
            return (
              <div 
                key={day.toString()} 
                onClick={() => handleDayClick(day)}
                onKeyDown={(event) => {
                  if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault()
                    handleDayClick(day)
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`${format(day, 'd MMMM yyyy', { locale: it })}${dayEvent ? `, ${TYPE_LABELS[dayEvent.tipo] || dayEvent.tipo}` : ''}`}
                className={`
                  min-h-20 sm:min-h-24 p-1.5 sm:p-2 rounded-sm border transition-colors relative flex flex-col group cursor-pointer overflow-hidden
                  ${today ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-950/20'
                    : holidayName && !dayEvent ? 'border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-900/20' 
                    : weekend && !dayEvent ? 'border-gray-300 dark:border-slate-700 bg-gray-100/60 dark:bg-slate-800/40' 
                    : 'border-border bg-background hover:border-gray-400 dark:hover:border-slate-600'}
                `}
              >
                {/* Etichetta del Giorno */}
                <span className={`
                  inline-flex items-center justify-center w-6 h-6 md:w-7 md:h-7 text-xs md:text-sm font-semibold rounded-full mb-1
                  ${today ? 'bg-blue-600 dark:bg-blue-500 text-white' : 'text-gray-700 dark:text-gray-300'}
                `}>
                  {format(day, 'd')}
                </span>
                
                {/* Contenuto del Giorno: L'Evento */}
                {dayEvent ? (
                  <div className={`
                    mt-auto p-1.5 rounded-sm border flex flex-col relative
                    ${TYPE_COLORS[dayEvent.tipo] || 'bg-gray-100'}
                  `}>
                    <span className="text-xs font-semibold leading-tight truncate">
                      {TYPE_LABELS[dayEvent.tipo] || dayEvent.tipo}
                    </span>
                    {dayEvent.mezza_giornata && (
                      <span className="text-xs opacity-70 mt-0.5">Mezza giornata</span>
                    )}

                    {/* Bottone Cancella (Appare solo quando passi col mouse) */}
                    <button 
                      onClick={(e) => handleDelete(dayEvent.id, e)}
                      className="absolute -top-1.5 -right-1.5 bg-background rounded-sm p-1 border text-red-600 dark:text-red-400 md:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 dark:hover:bg-red-950"
                      title="Rimuovi"
                      aria-label={`Rimuovi ${TYPE_LABELS[dayEvent.tipo] || dayEvent.tipo} del ${format(day, 'd MMMM yyyy', { locale: it })}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ) : holidayName ? (
                  // Marker Festività
                  <div className="absolute inset-x-1 bottom-1 flex items-center justify-center p-1 text-center text-xs leading-tight font-medium text-red-700 dark:text-red-400">
                    {holidayName}
                  </div>
                ) : weekend && !holidayName ? (
                  // Marker Weekend
                  <div className="absolute inset-x-1 bottom-1 flex items-center justify-center p-1 text-center text-xs leading-tight text-muted-foreground">
                    {getDay(day) === 6 ? 'Sab' : 'Dom'}
                  </div>
                ) : null}

                {/* Indicatore Colleghi Fuori Sede (Ferie, Smart, Malattia) */}
                {!weekend && !holidayName && absentColleagues.length > 0 && (
                  <div 
                    className="absolute inset-x-1 bottom-1 flex items-center p-1 bg-background border rounded-sm text-xs leading-tight text-muted-foreground z-20 cursor-help"
                    title={`Fuori ufficio:\n${absentColleagues.map(c => `- ${c.nome} (${c.tipo})`).join('\n')}`}
                    aria-label={`${absentColleagues.length} colleghi fuori ufficio`}
                  >
                    <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 shrink-0" />
                    <span className="truncate">{absentColleagues.length}</span>
                  </div>
                )}

              </div>
            )
          })}
        </div>
      </div>

      {/* Modale Inserimento */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Inserisci Presenza</DialogTitle>
            <DialogDescription>
              Stai pianificando per il <strong>{selectedDate ? format(selectedDate, 'd MMMM yyyy', { locale: it }) : ''}</strong>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700">Tipo di attività</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Seleziona..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="smartworking">Smartworking</SelectItem>
                  <SelectItem value="ufficio">In ufficio</SelectItem>
                  <SelectItem value="ferie">Ferie</SelectItem>
                  <SelectItem value="malattia">Malattia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700">Durata</Label>
              <Select value={isHalfDay} onValueChange={(val: 'true' | 'false') => setIsHalfDay(val)}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">Giornata Intera</SelectItem>
                  <SelectItem value="true">Mezza Giornata</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Annulla</Button>
            <Button onClick={handleCreate} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? 'Salvataggio...' : 'Conferma'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Alert/Confirm Modale */}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertConfig.title}</AlertDialogTitle>
            <AlertDialogDescription>{alertConfig.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {alertConfig.isConfirm && (
              <AlertDialogCancel>Annulla</AlertDialogCancel>
            )}
            <AlertDialogAction 
              onClick={() => {
                if (alertConfig.isConfirm && alertConfig.onConfirm) {
                  alertConfig.onConfirm()
                }
              }}
              className={alertConfig.isConfirm ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700"}
            >
              {alertConfig.isConfirm ? 'Procedi ugualmente' : 'Ho Capito'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
