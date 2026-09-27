'use client'

import { useState, useEffect, useRef } from 'react'
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isToday, addMonths, subMonths, getDay, isWeekend } from 'date-fns'
import { it } from 'date-fns/locale'
import { getItalianHoliday } from '@/utils/holidays'
import { BriefcaseBusiness, CalendarPlus, Check, ChevronLeft, ChevronRight, Clock3, HeartPulse, Home, Plane, ShieldCheck, Trash2, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { addEvents, deleteEvent, getUserEvents, getTeamSchedule } from './actions'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
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

type TeamScheduleEntry = {
  data: string
  tipo: string
  mezza_giornata: boolean
  utente_id: string
  email: string
  nome: string
  cognome: string
  ruolo: 'user' | 'admin'
}

const TYPE_COLORS: Record<string, string> = {
  'smartworking': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  'ferie': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-200 border-yellow-300 dark:border-yellow-800',
  'permesso': 'bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-300 border-violet-200 dark:border-violet-800',
  'malattia': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800',
  'ufficio': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800',
}

const TYPE_LABELS: Record<string, string> = {
  'smartworking': 'Smartworking',
  'ferie': 'Ferie',
  'permesso': 'Permesso',
  'malattia': 'Malattia',
  'ufficio': 'In Ufficio',
}

const EVENT_OPTIONS = [
  { value: 'ufficio', label: 'In ufficio', note: 'Presenza in sede', icon: BriefcaseBusiness, color: 'text-emerald-700 dark:text-emerald-300', selected: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' },
  { value: 'smartworking', label: 'Smartworking', note: 'Lavoro da remoto', icon: Home, color: 'text-blue-700 dark:text-blue-300', selected: 'border-blue-500 bg-blue-50 dark:bg-blue-950/40' },
  { value: 'permesso', label: 'Permesso', note: 'Assenza autorizzata', icon: Clock3, color: 'text-violet-700 dark:text-violet-300', selected: 'border-violet-500 bg-violet-50 dark:bg-violet-950/40' },
  { value: 'ferie', label: 'Ferie', note: 'Giornata di ferie', icon: Plane, color: 'text-amber-700 dark:text-amber-300', selected: 'border-amber-500 bg-amber-50 dark:bg-amber-950/40' },
  { value: 'malattia', label: 'Malattia', note: 'Assenza per malattia', icon: HeartPulse, color: 'text-red-700 dark:text-red-300', selected: 'border-red-500 bg-red-50 dark:bg-red-950/40' },
] as const

export default function CalendarClient({ 
  initialEvents, 
  initialTeamSchedule,
  targetUserId, 
  targetUserName 
}: { 
  initialEvents: Event[], 
  initialTeamSchedule: TeamScheduleEntry[],
  targetUserId?: string, 
  targetUserName?: string 
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [teamSchedule, setTeamSchedule] = useState<TeamScheduleEntry[]>(initialTeamSchedule)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [isMultiSelecting, setIsMultiSelecting] = useState(false)
  const [teamDetailDate, setTeamDetailDate] = useState<Date | null>(null)
  const [mobileDetailDate, setMobileDetailDate] = useState<Date | null>(null)
  const mobileDetailRef = useRef<HTMLDivElement>(null)
  
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
  const nextMonth = () => { setMobileDetailDate(null); setCurrentMonth(addMonths(currentMonth, 1)) }
  const prevMonth = () => { setMobileDetailDate(null); setCurrentMonth(subMonths(currentMonth, 1)) }

  // Ricarica i dati (senza ricaricare la pagina) quando si cambia mese
  useEffect(() => {
    const fetchEvents = async () => {
      const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
      const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
      
      const [myData, teamData] = await Promise.all([
        getUserEvents(start, end, targetUserId),
        getTeamSchedule(start, end)
      ])
      
      setEvents(myData)
      setTeamSchedule(teamData)
    }
    fetchEvents()
  }, [currentMonth, targetUserId])

  useEffect(() => {
    if (mobileDetailDate) mobileDetailRef.current?.scrollIntoView({ block: 'nearest' })
  }, [mobileDetailDate])

  // Calcola quante celle vuote mettere all'inizio (il giorno 0 per Date-fns è Domenica)
  const firstDayOfMonth = getDay(startOfMonth(currentMonth))
  const paddingDays = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  })

  // Apre la modale per l'inserimento
  const handleDayClick = (day: Date, openEditor = false) => {
    const dayStr = format(day, 'yyyy-MM-dd')
    const existingEvent = events.find(e => e.data === dayStr)

    if (isMultiSelecting) {
      if (existingEvent) {
        showAlert('Giorno già pianificato', 'Puoi selezionare solo giorni ancora liberi.')
        return
      }
      setSelectedDates(current => current.includes(dayStr) ? current.filter(date => date !== dayStr) : [...current, dayStr])
      return
    }

    if (!openEditor && window.matchMedia('(max-width: 639px)').matches) {
      setMobileDetailDate(day)
      return
    }
    
    if (existingEvent) {
      showAlert('Giorno già pianificato', "C'è già un evento in questa data. Rimuovilo prima di inserirne un altro.")
      return
    }

    const isHoliday = getItalianHoliday(day)
    if (isHoliday) {
      showConfirm(
        'Giorno festivo',
        `Il giorno selezionato è ${isHoliday}. Vuoi davvero inserire un evento in un giorno festivo?`,
        () => {
          setSelectedDate(day)
          setIsModalOpen(true)
        }
      )
      return
    } else if (isWeekend(day)) {
      showConfirm(
        'Fine settimana',
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
    const dates = selectedDates.length > 0
      ? [...selectedDates].sort()
      : selectedDate ? [format(selectedDate, 'yyyy-MM-dd')] : []
    if (dates.length === 0) return
    setLoading(true)
    const res = await addEvents(dates, eventType, isHalfDay === 'true', targetUserId)
    setLoading(false)
    
    if (res.error) {
      showAlert('Salvataggio non riuscito', res.error)
    } else {
      setIsModalOpen(false)
      setSelectedDates([])
      setIsMultiSelecting(false)
      // Ricarichiamo in tempo reale
      const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
      const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
      const [newEvents, newTeamSchedule] = await Promise.all([
        getUserEvents(start, end, targetUserId),
        getTeamSchedule(start, end),
      ])
      setEvents(newEvents)
      setTeamSchedule(newTeamSchedule)
    }
  }

  // Elimina un giorno
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation() // Evita che il click sul cestino apra anche la modale per inserire
    const res = await deleteEvent(id, targetUserId)
    if (!res.error) {
      setEvents(events.filter(ev => ev.id !== id))
      setTeamSchedule(teamSchedule.filter(entry => !(entry.utente_id === targetUserId && entry.data === events.find(event => event.id === id)?.data)))
    } else {
      showAlert('Rimozione non riuscita', res.error)
    }
  }

  return (
    <section className="overflow-hidden border border-border/80 bg-card shadow-[0_18px_45px_-38px_rgba(13,70,66,.55)]" aria-label="Calendario mensile">
      
      {targetUserName && (
        <div className="bg-amber-50 dark:bg-amber-950/30 px-4 py-3 border-b border-amber-200 dark:border-amber-900 text-sm text-amber-900 dark:text-amber-200">
          Stai modificando il calendario di <strong>{targetUserName}</strong>.
        </div>
      )}

      {/* Intestazione Mese */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand/15 bg-accent/35 p-3 sm:p-4 sm:px-5">
        <h2 className="text-xl font-semibold capitalize tracking-[-0.02em]">
          {format(currentMonth, 'MMMM yyyy', { locale: it })}
        </h2>
        <div className="flex w-full items-center justify-between gap-2 sm:w-auto">
          <Button variant={isMultiSelecting ? 'default' : 'outline'} onClick={() => {
            if (isMultiSelecting) {
              setSelectedDates([])
              setIsMultiSelecting(false)
            } else {
              setSelectedDate(null)
              setSelectedDates([])
              setIsMultiSelecting(true)
            }
          }} className="gap-2 px-3">
            {isMultiSelecting ? <X className="size-4" /> : <CalendarPlus className="size-4" />}
            <span>{isMultiSelecting ? 'Annulla' : 'Più giorni'}</span>
          </Button>
          <div className="flex gap-2"><Button variant="outline" size="icon" onClick={prevMonth} aria-label="Mese precedente">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth} aria-label="Mese successivo">
            <ChevronRight className="h-5 w-5" />
          </Button></div>
        </div>
      </div>

      <div className="p-1.5 sm:p-4">
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
            <div key={`pad-${i}`} className="min-h-12 bg-muted/20 sm:min-h-24"></div>
          ))}

          {/* Giorni Reali */}
          {days.map((day) => {
            const dayStr = format(day, 'yyyy-MM-dd')
            const dayEvent = events.find(e => e.data === dayStr)
            const isSelected = selectedDates.includes(dayStr)
            const today = isToday(day)
            const holidayName = getItalianHoliday(day)
            const weekend = isWeekend(day)
            const scheduledPeople = teamSchedule.filter(entry => entry.data === dayStr)
            
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
                aria-pressed={isMultiSelecting ? isSelected : undefined}
                aria-label={`${format(day, 'd MMMM yyyy', { locale: it })}${dayEvent ? `, ${TYPE_LABELS[dayEvent.tipo] || dayEvent.tipo}` : ''}${holidayName ? `, ${holidayName}` : ''}${scheduledPeople.length ? `, ${scheduledPeople.length} persone pianificate` : ''}${isSelected ? ', selezionato' : ''}`}
                className={`
                  min-h-12 min-w-0 sm:min-h-24 p-1 sm:p-2 rounded-sm border transition-colors relative flex flex-col group cursor-pointer overflow-hidden focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-1
                  ${isSelected || (!isMultiSelecting && mobileDetailDate && format(mobileDetailDate, 'yyyy-MM-dd') === dayStr) ? 'border-brand bg-accent ring-2 ring-brand ring-offset-1 dark:ring-offset-background'
                    : today ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-950/20'
                    : holidayName && !dayEvent ? 'border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-900/20' 
                    : weekend && !dayEvent ? 'border-border bg-muted/60'
                    : 'border-border bg-background hover:border-foreground/40'}
                `}
              >
                {/* Etichetta del Giorno */}
                <span className={`
                  inline-flex items-center justify-center size-7 text-sm font-semibold rounded-full sm:mb-1
                  ${today ? 'bg-blue-600 dark:bg-blue-500 text-white' : 'text-foreground'}
                `}>
                  {format(day, 'd')}
                </span>

                {isSelected && (
                  <span className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-brand text-brand-foreground shadow-sm" aria-hidden="true">
                    <Check className="size-4" />
                  </span>
                )}
                
                {/* Contenuto del Giorno: L'Evento */}
                {dayEvent ? (
                  <div className={`
                    mt-auto hidden p-1.5 rounded-sm border sm:flex flex-col relative
                    ${TYPE_COLORS[dayEvent.tipo] || 'bg-muted'}
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
                      className="absolute -top-1.5 -right-1.5 grid size-8 place-items-center rounded-sm border bg-background text-destructive transition-opacity hover:bg-destructive/10 focus-visible:opacity-100 lg:opacity-0 group-hover:opacity-100"
                      title="Rimuovi"
                      aria-label={`Rimuovi ${TYPE_LABELS[dayEvent.tipo] || dayEvent.tipo} del ${format(day, 'd MMMM yyyy', { locale: it })}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ) : holidayName ? (
                  // Marker Festività
                  <div className="absolute inset-x-1 bottom-1 flex items-center justify-center p-1 text-center text-xs leading-tight font-medium text-red-700 dark:text-red-400">
                    <span className="hidden sm:inline">{holidayName}</span>
                  </div>
                ) : weekend && !holidayName ? (
                  // Marker Weekend
                  <div className="absolute inset-x-1 bottom-1 flex items-center justify-center p-1 text-center text-xs leading-tight text-muted-foreground">
                    <span className="hidden sm:inline">{getDay(day) === 6 ? 'Sab' : 'Dom'}</span>
                  </div>
                ) : null}

                {/* Quadro giornaliero del team */}
                {scheduledPeople.length > 0 && !isMultiSelecting && (
                  <button
                    type="button"
                    onClick={(event) => { event.stopPropagation(); setTeamDetailDate(day) }}
                    className="absolute right-1 top-1 z-20 hidden min-h-8 items-center gap-0.5 border border-brand/20 bg-card/95 px-1 py-1 text-[11px] font-semibold text-brand-strong shadow-[0_1px_3px_rgba(0,0,0,.08)] transition-colors hover:border-brand hover:bg-accent sm:inline-flex sm:gap-1 sm:px-1.5 dark:text-brand"
                    aria-label={`Mostra le ${scheduledPeople.length} persone pianificate il ${format(day, 'd MMMM yyyy', { locale: it })}`}
                  >
                    <Users className="hidden size-3 shrink-0 sm:block" aria-hidden="true" />
                    <span>{scheduledPeople.length}</span>
                    <span className="hidden xl:inline">persone</span>
                  </button>
                )}

                <span className="mt-auto flex items-center justify-center gap-0.5 sm:hidden" aria-hidden="true">
                  {dayEvent && <span className={`size-1.5 rounded-full ${dayEvent.tipo === 'smartworking' ? 'bg-blue-600' : dayEvent.tipo === 'ferie' ? 'bg-amber-500' : dayEvent.tipo === 'permesso' ? 'bg-violet-500' : dayEvent.tipo === 'malattia' ? 'bg-rose-500' : 'bg-emerald-600'}`} />}
                  {scheduledPeople.length > 0 && <span className="size-1.5 rounded-full bg-brand" />}
                </span>

              </div>
            )
          })}
        </div>
      </div>

      <div ref={mobileDetailRef} className="border-t px-4 py-4 sm:hidden" aria-live="polite">
        {mobileDetailDate ? (() => {
          const dateKey = format(mobileDetailDate, 'yyyy-MM-dd')
          const event = events.find(item => item.data === dateKey)
          const people = teamSchedule.filter(item => item.data === dateKey)
          return <div className="space-y-3">
            <div><p className="page-kicker">Giorno selezionato</p><h3 className="text-lg font-semibold capitalize">{format(mobileDetailDate, 'EEEE d MMMM', { locale: it })}</h3></div>
            <p className="text-sm">{event ? `${TYPE_LABELS[event.tipo] || event.tipo}${event.mezza_giornata ? ' · Mezza giornata' : ''}` : getItalianHoliday(mobileDetailDate) || 'Nessuna pianificazione'}</p>
            <div className="flex flex-wrap gap-2">
              {event ? <Button variant="outline" className="text-destructive" onClick={click => handleDelete(event.id, click)}><Trash2 className="size-4" /> Rimuovi</Button> : <Button onClick={() => handleDayClick(mobileDetailDate, true)}><CalendarPlus className="size-4" /> Pianifica</Button>}
              {people.length > 0 && <Button variant="outline" onClick={() => setTeamDetailDate(mobileDetailDate)}><Users className="size-4" /> Team ({people.length})</Button>}
            </div>
          </div>
        })() : <p className="text-sm text-muted-foreground">Tocca un giorno per vedere i dettagli e pianificarlo.</p>}
      </div>

      {isMultiSelecting && (
        <div className="fixed inset-x-3 bottom-[calc(4rem+env(safe-area-inset-bottom)+0.75rem)] z-40 mx-auto flex max-w-xl items-center gap-3 border border-brand/25 bg-card/95 p-3 shadow-[0_18px_55px_-18px_rgba(13,70,66,.5)] backdrop-blur sm:p-4 md:bottom-5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{selectedDates.length === 0 ? 'Seleziona i giorni' : `${selectedDates.length} ${selectedDates.length === 1 ? 'giorno selezionato' : 'giorni selezionati'}`}</p>
            <p className="truncate text-xs text-muted-foreground">Tocca i giorni liberi per aggiungerli o rimuoverli.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setSelectedDates([]); setIsMultiSelecting(false) }}>Annulla</Button>
          <Button size="sm" disabled={selectedDates.length === 0} onClick={() => { setSelectedDate(null); setIsModalOpen(true) }}>
            Continua
          </Button>
        </div>
      )}

      <Dialog open={Boolean(teamDetailDate)} onOpenChange={(open) => { if (!open) setTeamDetailDate(null) }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <p className="page-kicker">Quadro del team</p>
            <DialogTitle className="text-2xl capitalize">{teamDetailDate ? format(teamDetailDate, 'EEEE d MMMM', { locale: it }) : ''}</DialogTitle>
            <DialogDescription>Chi ha pianificato la giornata e con quale modalità.</DialogDescription>
          </DialogHeader>
          <div className="divide-y border-y">
            {teamSchedule.filter(entry => entry.data === (teamDetailDate ? format(teamDetailDate, 'yyyy-MM-dd') : '')).map(entry => {
              const label = [entry.nome, entry.cognome].filter(Boolean).join(' ') || entry.email
              return <div key={entry.utente_id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{label}</p>
                  <p className="text-xs text-muted-foreground">{entry.ruolo === 'admin' ? 'Admin' : 'Utente'}</p>
                </div>
                <div className={`shrink-0 border px-2.5 py-1 text-xs font-semibold ${TYPE_COLORS[entry.tipo] || 'bg-muted'}`}>
                  {TYPE_LABELS[entry.tipo] || entry.tipo}{entry.mezza_giornata ? ' · ½ giornata' : ''}
                </div>
              </div>
            })}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setTeamDetailDate(null)}>Chiudi</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modale Inserimento */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="grid h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-none grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-2xl">
          <DialogHeader>
            <div className="border-b border-brand/15 bg-accent/30 px-5 py-4 pr-12 sm:px-6 sm:py-5 sm:pr-12">
              <p className="page-kicker">Nuova pianificazione</p>
              <DialogTitle className="text-2xl capitalize">{selectedDates.length > 0 ? `${selectedDates.length} ${selectedDates.length === 1 ? 'giorno selezionato' : 'giorni selezionati'}` : selectedDate ? format(selectedDate, 'EEEE d MMMM', { locale: it }) : ''}</DialogTitle>
              <DialogDescription className="mt-2">{targetUserName ? `Applica la pianificazione a ${targetUserName}.` : selectedDates.length > 1 ? 'La stessa pianificazione sarà applicata a tutti i giorni.' : 'Scegli attività e durata della giornata.'}</DialogDescription>
            </div>
          </DialogHeader>

          <div className="min-h-0 space-y-7 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
            {selectedDates.length > 0 && (
              <div className="border-l-2 border-brand bg-accent/25 px-3 py-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Date incluse</p>
                <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Date selezionate">
                  {[...selectedDates].sort().map(date => (
                    <span key={date} className="shrink-0 border border-brand/20 bg-card px-2.5 py-1.5 text-xs font-semibold capitalize">
                      {format(new Date(`${date}T12:00:00`), 'EEE d MMM', { locale: it })}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <fieldset>
              <legend className="text-sm font-semibold">Come sarà organizzata la giornata?</legend>
              <div className="mt-3 space-y-4" role="radiogroup">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {EVENT_OPTIONS.slice(0, 2).map(option => {
                    const Icon = option.icon
                    const selected = eventType === option.value
                    return <button key={option.value} type="button" role="radio" aria-checked={selected} onClick={() => setEventType(option.value)} className={`flex min-h-24 items-center gap-4 border-2 p-4 text-left transition-[border-color,background-color,box-shadow] ${selected ? `${option.selected} shadow-sm` : 'bg-card hover:border-brand/40 hover:bg-accent/20'}`}>
                      <span className={`grid size-11 shrink-0 place-items-center rounded-full bg-background/80 ${option.color}`}><Icon className="size-6" aria-hidden="true" /></span>
                      <span className="min-w-0"><span className="block text-base font-semibold">{option.label}</span><span className="block text-xs text-muted-foreground">{option.note}</span></span>
                      {selected && <ShieldCheck className="ml-auto size-5 shrink-0 text-brand" aria-hidden="true" />}
                    </button>
                  })}
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Altre opzioni</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {EVENT_OPTIONS.slice(2).map(option => {
                      const Icon = option.icon
                      const selected = eventType === option.value
                      return <button key={option.value} type="button" role="radio" aria-checked={selected} onClick={() => setEventType(option.value)} className={`flex min-h-14 items-center gap-2.5 border p-3 text-left transition-[border-color,background-color] ${selected ? option.selected : 'bg-card hover:border-brand/40 hover:bg-accent/20'}`}>
                        <Icon className={`size-4 shrink-0 ${option.color}`} aria-hidden="true" />
                        <span className="min-w-0"><span className="block text-sm font-semibold">{option.label}</span><span className="hidden text-xs text-muted-foreground lg:block">{option.note}</span></span>
                        {selected && <ShieldCheck className="ml-auto size-4 shrink-0 text-brand" aria-hidden="true" />}
                      </button>
                    })}
                  </div>
                </div>
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-semibold">Durata</legend>
              <div className="mt-3 grid grid-cols-2 border bg-muted/35 p-1">
                <button type="button" aria-pressed={isHalfDay === 'false'} onClick={() => setIsHalfDay('false')} className={`min-h-11 px-2 text-sm font-semibold transition-colors ${isHalfDay === 'false' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Giornata intera</button>
                <button type="button" aria-pressed={isHalfDay === 'true'} onClick={() => setIsHalfDay('true')} className={`min-h-11 px-2 text-sm font-semibold transition-colors ${isHalfDay === 'true' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Mezza giornata</button>
              </div>
            </fieldset>

            <div className="flex items-center justify-between gap-4 border-l-2 border-brand bg-accent/25 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Riepilogo</span>
              <strong className="text-right">{TYPE_LABELS[eventType]} · {isHalfDay === 'true' ? 'Mezza giornata' : 'Giornata intera'}{selectedDates.length > 1 ? ` · ${selectedDates.length} giorni` : ''}</strong>
            </div>
          </div>

          <DialogFooter className="border-t bg-muted/20 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Annulla</Button>
            <Button onClick={handleCreate} disabled={loading}>
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
              className={alertConfig.isConfirm ? "bg-amber-600 text-white hover:bg-amber-700" : undefined}
            >
              {alertConfig.isConfirm ? 'Procedi ugualmente' : 'Ho capito'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
