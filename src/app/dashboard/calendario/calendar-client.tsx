'use client'

import { useState, useEffect } from 'react'
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isToday, addMonths, subMonths, getDay, isWeekend } from 'date-fns'
import { it } from 'date-fns/locale'
import { getItalianHoliday } from '@/utils/holidays'
import { ChevronLeft, ChevronRight, Plus, Trash2, Users } from 'lucide-react'
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
  'smartworking': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/50',
  'ferie': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800 hover:bg-red-200 dark:hover:bg-red-900/50',
  'malattia': 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800 hover:bg-orange-200 dark:hover:bg-orange-900/50',
  'ufficio': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800 hover:bg-green-200 dark:hover:bg-green-900/50',
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
    <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors">
      
      {targetUserName && (
        <div className="bg-amber-50 dark:bg-amber-950/30 px-6 py-3 border-b border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 font-medium flex items-center">
          <span className="mr-2">⚠️</span> Stai modificando il calendario per conto di: <strong className="ml-1 text-amber-900 dark:text-amber-100">{targetUserName}</strong>
        </div>
      )}

      {/* Intestazione Mese */}
      <div className="flex items-center justify-between p-6 border-b dark:border-slate-800">
        <h2 className="text-2xl font-bold capitalize text-gray-900 dark:text-white">
          {format(currentMonth, 'MMMM yyyy', { locale: it })}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth} className="h-10 w-10 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth} className="h-10 w-10 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="p-3 sm:p-6">
        {/* Nomi dei giorni della settimana */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 md:gap-4 mb-2 md:mb-4">
          {[
            { short: 'L', full: 'Lun' }, { short: 'M', full: 'Mar' }, { short: 'M', full: 'Mer' }, 
            { short: 'G', full: 'Gio' }, { short: 'V', full: 'Ven' }, { short: 'S', full: 'Sab' }, { short: 'D', full: 'Dom' }
          ].map((day, i) => (
            <div key={i} className="text-center font-bold text-gray-400 text-[10px] sm:text-xs uppercase tracking-wider">
              <span className="md:hidden">{day.short}</span>
              <span className="hidden md:inline">{day.full}</span>
            </div>
          ))}
        </div>

        {/* Griglia giorni del mese */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 md:gap-4">
          
          {/* Spazi vuoti di padding iniziale */}
          {Array.from({ length: paddingDays }).map((_, i) => (
            <div key={`pad-${i}`} className="min-h-[90px] md:h-28 bg-gray-50/50 dark:bg-[#111827]/50 rounded-lg md:rounded-xl border border-dashed border-gray-200 dark:border-slate-800"></div>
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
                className={`
                  min-h-[90px] md:h-28 p-1 sm:p-2 md:p-3 rounded-lg md:rounded-xl border transition-all relative flex flex-col group cursor-pointer overflow-hidden
                  ${today ? 'border-blue-400 dark:border-blue-600 bg-blue-50/20 dark:bg-blue-900/10 shadow-sm' 
                    : holidayName && !dayEvent ? 'border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-900/20' 
                    : weekend && !dayEvent ? 'border-gray-300 dark:border-slate-700 bg-gray-100/60 dark:bg-slate-800/40' 
                    : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-[#111827] hover:border-gray-300 dark:hover:border-slate-600 hover:shadow-sm'}
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
                    mt-auto p-1.5 md:p-2 rounded-md md:rounded-lg border flex flex-col relative
                    ${TYPE_COLORS[dayEvent.tipo] || 'bg-gray-100'}
                  `}>
                    <span className="text-[10px] md:text-xs font-bold leading-none md:leading-tight truncate">
                      {TYPE_LABELS[dayEvent.tipo] || dayEvent.tipo}
                    </span>
                    {dayEvent.mezza_giornata && (
                      <span className="text-[8px] md:text-[10px] uppercase font-bold opacity-70 mt-0.5">Mezza G.</span>
                    )}

                    {/* Bottone Cancella (Appare solo quando passi col mouse) */}
                    <button 
                      onClick={(e) => handleDelete(dayEvent.id, e)}
                      className="absolute -top-1.5 -right-1.5 md:-top-2 md:-right-2 bg-white dark:bg-slate-800 rounded-full p-1 border dark:border-slate-700 shadow-sm text-red-500 dark:text-red-400 md:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 dark:hover:bg-red-900/50"
                      title="Rimuovi"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ) : holidayName ? (
                  // Marker Festività
                  <div className="absolute inset-x-1 sm:inset-x-2 bottom-1.5 md:bottom-3 flex items-center justify-center p-1 md:p-2 text-center text-[8px] md:text-[10px] leading-tight font-bold text-red-600 dark:text-red-400 bg-red-100/60 dark:bg-red-900/30 rounded-lg md:group-hover:opacity-0 transition-opacity">
                    <span className="hidden sm:inline">🎉</span> {holidayName}
                  </div>
                ) : weekend && !holidayName ? (
                  // Marker Weekend
                  <div className="absolute inset-x-1 sm:inset-x-2 bottom-1.5 md:bottom-3 flex items-center justify-center p-1 md:p-2 text-center text-[8px] md:text-[10px] leading-tight font-bold text-gray-500 dark:text-gray-400 bg-gray-200/50 dark:bg-slate-800/80 rounded-lg md:group-hover:opacity-0 transition-opacity">
                    {getDay(day) === 6 ? 'Sab' : 'Dom'}
                  </div>
                ) : null}

                {/* Indicatore Colleghi Fuori Sede (Ferie, Smart, Malattia) */}
                {!weekend && !holidayName && absentColleagues.length > 0 && (
                  <div 
                    className="absolute inset-x-1 sm:inset-x-2 bottom-0.5 md:bottom-1.5 flex items-center p-0.5 sm:p-1 bg-gray-50/80 dark:bg-[#111827]/80 border border-gray-100 dark:border-slate-800 rounded text-[8px] md:text-[10px] leading-tight text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all z-20 cursor-help"
                    title={`Fuori ufficio:\n${absentColleagues.map(c => `- ${c.nome} (${c.tipo})`).join('\n')}`}
                  >
                    <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 shrink-0" />
                    <span className="truncate">{absentColleagues.length}</span>
                  </div>
                )}

                {/* Bottone "Più" che appare solo al passaggio del mouse sui giorni vuoti, anche sui festivi e weekend */}
                {!dayEvent && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10 pointer-events-none hidden md:flex">
                    <div className="bg-white dark:bg-slate-800 rounded-full p-2 shadow-md text-gray-400 border border-gray-200 dark:border-slate-700 pointer-events-auto">
                      <Plus className="w-5 h-5" />
                    </div>
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
                  <SelectItem value="smartworking">🏠 Smartworking</SelectItem>
                  <SelectItem value="ufficio">🏢 In Ufficio</SelectItem>
                  <SelectItem value="ferie">🌴 Ferie</SelectItem>
                  <SelectItem value="malattia">🤒 Malattia</SelectItem>
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
    </div>
  )
}
