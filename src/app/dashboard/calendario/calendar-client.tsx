'use client'

import { useState, useEffect, useRef } from 'react'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addWeeks, eachDayOfInterval, format, isToday, addMonths, subMonths, getDay, isWeekend } from 'date-fns'
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
  const [agendaDate, setAgendaDate] = useState(new Date())
  const [mobileView, setMobileView] = useState<'agenda' | 'month'>('agenda')
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState(false)
  const [reload, setReload] = useState(0)
  const [status, setStatus] = useState('')
  const [deleting, setDeleting] = useState(false)
  const lastDayTrigger = useRef<HTMLElement | null>(null)
  const teamTrigger = useRef<HTMLElement | null>(null)
  const selectionTrigger = useRef<HTMLButtonElement>(null)
  const restoreDayFocus = () => {
    const target = lastDayTrigger.current
    if (target?.isConnected) target.focus()
    else selectionTrigger.current?.focus()
  }
  const openTeam = (day: Date) => {
    teamTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setTeamDetailDate(day)
  }
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [teamSchedule, setTeamSchedule] = useState<TeamScheduleEntry[]>(initialTeamSchedule)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [isMultiSelecting, setIsMultiSelecting] = useState(false)
  const [teamDetailDate, setTeamDetailDate] = useState<Date | null>(null)
  const [mobileDetailDate, setMobileDetailDate] = useState<Date | null>(null)
  
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
  const changeMonth = (month: Date) => {
    setCurrentMonth(month)
    setAgendaDate(startOfMonth(month))
    setMobileDetailDate(null)
  }
  const nextMonth = () => changeMonth(addMonths(currentMonth, 1))
  const prevMonth = () => changeMonth(subMonths(currentMonth, 1))
  const changeWeek = (direction: number) => {
    const date = addWeeks(agendaDate, direction)
    setAgendaDate(date)
    setCurrentMonth(date)
  }

  // Ricarica i dati (senza ricaricare la pagina) quando si cambia mese
  useEffect(() => {
    let active = true
    const fetchEvents = async () => {
      const monthStart = startOfMonth(currentMonth)
      const monthEnd = endOfMonth(currentMonth)
      const agendaStart = startOfWeek(agendaDate, { weekStartsOn: 1 })
      const agendaEnd = endOfWeek(agendaDate, { weekStartsOn: 1 })
      const start = format(monthStart < agendaStart ? monthStart : agendaStart, 'yyyy-MM-dd')
      const end = format(monthEnd > agendaEnd ? monthEnd : agendaEnd, 'yyyy-MM-dd')
      
      setFetching(true)
      setFetchError(false)
      try {
        const [myData, teamData] = await Promise.all([
          getUserEvents(start, end, targetUserId),
          getTeamSchedule(start, end)
        ])
        if (active) {
          setEvents(myData)
          setTeamSchedule(teamData)
        }
      } catch {
        if (active) setFetchError(true)
      } finally {
        if (active) setFetching(false)
      }
    }
    fetchEvents()
    return () => { active = false }
  }, [currentMonth, agendaDate, targetUserId, reload])

  // Calcola quante celle vuote mettere all'inizio (il giorno 0 per Date-fns è Domenica)
  const firstDayOfMonth = getDay(startOfMonth(currentMonth))
  const paddingDays = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  })
  const weekStart = startOfWeek(agendaDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(agendaDate, { weekStartsOn: 1 })
  const agendaDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  // Apre la modale per l'inserimento
  const handleDayClick = (day: Date, openEditor = false) => {
    if (fetching || fetchError || loading || deleting) return
    if (document.activeElement instanceof HTMLElement && !document.activeElement.closest('[role="dialog"]')) lastDayTrigger.current = document.activeElement
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
      setMobileDetailDate(day)
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
    setStatus('')
    setLoading(true)
    try {
      const res = await addEvents(dates, eventType, isHalfDay === 'true', targetUserId)
      if (res.error) {
        showAlert('Salvataggio non riuscito', res.error)
        return
      }
      setIsModalOpen(false)
      setMobileDetailDate(null)
      setSelectedDates([])
      setIsMultiSelecting(false)
      setStatus(`Pianificazione salvata per ${dates.length} ${dates.length === 1 ? 'giorno' : 'giorni'}.`)
      setReload(value => value + 1)
    } catch {
      showAlert('Salvataggio non riuscito', 'Impossibile salvare la pianificazione. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  // Elimina un giorno
  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const event = events.find(item => item.id === id)
    if (!event || deleting) return
    showConfirm('Rimuovere la pianificazione?', `${TYPE_LABELS[event.tipo]} del ${format(new Date(`${event.data}T12:00:00`), 'd MMMM yyyy', { locale: it })}. Dopo la rimozione potrai pianificare nuovamente il giorno.`, async () => {
      setDeleting(true)
      setStatus('')
      try {
        const res = await deleteEvent(id, targetUserId)
        if (res.error) {
          showAlert('Rimozione non riuscita', res.error)
          return
        }
        setStatus('Pianificazione rimossa.')
        setReload(value => value + 1)
      } catch {
        showAlert('Rimozione non riuscita', 'Impossibile rimuovere la pianificazione. Riprova.')
      } finally {
        setDeleting(false)
      }
    })
  }

  return (
    <section className={`calendar-workspace border border-border/80 bg-card shadow-[0_18px_45px_-38px_rgba(13,70,66,.55)] ${isMultiSelecting ? 'pb-6' : ''}`} aria-label="Calendario e pianificazione">
      <p role="status" className={status && !fetching ? 'border-b bg-accent p-4 text-base font-medium' : 'sr-only'}>{fetching ? 'Caricamento calendario…' : status}</p>
      
      {targetUserName && (
        <div className="bg-amber-50 dark:bg-amber-950/30 px-4 py-3 border-b border-amber-200 dark:border-amber-900 text-sm text-amber-900 dark:text-amber-200">
          Stai modificando il calendario di <strong>{targetUserName}</strong>.
        </div>
      )}

      {/* Intestazione Mese */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand/15 bg-accent/35 p-3 sm:p-4 sm:px-5">
        <h2 aria-live="polite" className="text-xl font-semibold capitalize tracking-[-0.02em]">
          {format(currentMonth, 'MMMM yyyy', { locale: it })}
        </h2>
        <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto">
          <Button ref={selectionTrigger} variant={isMultiSelecting ? 'default' : 'outline'} aria-pressed={isMultiSelecting} onClick={() => {
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
          <div className="flex gap-2"><Button variant="outline" onClick={() => { const today = new Date(); setCurrentMonth(today); setAgendaDate(today) }}>Oggi</Button><Button variant="outline" size="icon" onClick={prevMonth} aria-label="Mese precedente">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth} aria-label="Mese successivo">
            <ChevronRight className="h-5 w-5" />
          </Button></div>
        </div>
      </div>

      {fetchError && <div role="alert" className="space-y-2 border-b p-4"><p>Impossibile caricare il calendario. Riprova prima di modificare i giorni.</p><Button variant="outline" onClick={() => setReload(value => value + 1)}>Riprova</Button></div>}
      <div className="space-y-4 p-4 sm:hidden">
        <div className="grid grid-cols-2 gap-2" aria-label="Vista calendario">
          <Button variant={mobileView === 'agenda' ? 'default' : 'outline'} aria-pressed={mobileView === 'agenda'} onClick={() => setMobileView('agenda')}>Agenda</Button>
          <Button variant={mobileView === 'month' ? 'default' : 'outline'} aria-pressed={mobileView === 'month'} onClick={() => setMobileView('month')}>Mese</Button>
        </div>
        <p className="text-base text-muted-foreground">{isMultiSelecting ? 'Seleziona i giorni liberi, anche in settimane o mesi diversi.' : 'Controlla le attività e pianifica una giornata.'}</p>
        {mobileView === 'agenda' && <>
          <div className="flex items-center justify-between gap-2">
            <Button variant="outline" size="icon" aria-label="Settimana precedente" onClick={() => changeWeek(-1)}><ChevronLeft aria-hidden="true" /></Button>
            <h3 className="text-center text-base font-semibold" aria-live="polite">{format(agendaDays[0], 'd MMM', { locale: it })} – {format(agendaDays[agendaDays.length - 1], 'd MMM', { locale: it })}</h3>
            <Button variant="outline" size="icon" aria-label="Settimana successiva" onClick={() => changeWeek(1)}><ChevronRight aria-hidden="true" /></Button>
          </div>
          <ul className="space-y-3" aria-label="Giornate della settimana" aria-busy={fetching}>
            {agendaDays.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd')
              const event = events.find(item => item.data === dateKey)
              const people = teamSchedule.filter(item => item.data === dateKey)
              const selected = selectedDates.includes(dateKey)
              const holiday = getItalianHoliday(day)
              return <li key={dateKey} className={`rounded-lg border p-4 ${selected ? 'border-brand bg-accent' : 'bg-background'}`}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-base font-semibold capitalize"><time dateTime={dateKey}>{format(day, 'EEEE d MMMM', { locale: it })}</time></h4>
                  {isToday(day) && <span className="rounded-full bg-primary px-2 py-1 text-sm font-semibold text-primary-foreground">Oggi</span>}
                </div>
                {holiday && <p className="mb-2 text-base text-muted-foreground">{holiday}</p>}
                {event ? <p className={`mb-3 rounded-md border px-3 py-2 text-base font-semibold ${TYPE_COLORS[event.tipo]}`}>
                  {TYPE_LABELS[event.tipo]}<span className="block text-base font-normal">{event.mezza_giornata ? 'Mezza giornata' : 'Giornata intera'}</span>
                </p> : <p className="mb-3 text-base text-muted-foreground">{isWeekend(day) && !holiday ? 'Fine settimana · ' : ''}Nessuna pianificazione</p>}
                <div className="flex flex-wrap gap-2">
                  {isMultiSelecting ? <Button className="w-full whitespace-normal" variant={selected ? 'default' : 'outline'} disabled={Boolean(event) || fetching || fetchError} aria-pressed={selected} aria-label={`${selected ? 'Deseleziona' : 'Seleziona'} ${format(day, 'd MMMM', { locale: it })}`} onClick={() => handleDayClick(day)}>{event ? 'Già pianificato' : selected ? <><Check aria-hidden="true" /> Selezionato</> : 'Seleziona giorno'}</Button>
                    : <>
                      <Button variant={event ? 'outline' : 'default'} disabled={fetching || fetchError || deleting} onClick={() => handleDayClick(day, !event)} aria-label={`${event ? 'Dettagli' : 'Pianifica'} ${format(day, 'd MMMM', { locale: it })}`}>{event ? 'Dettagli' : <><CalendarPlus aria-hidden="true" /> Pianifica</>}</Button>
                      {people.length > 0 && <Button variant="outline" disabled={fetching || fetchError} onClick={() => openTeam(day)} aria-label={`Team del ${format(day, 'd MMMM', { locale: it })}: ${people.length} persone`}><Users aria-hidden="true" /> Team ({people.length})</Button>}
                    </>}
                </div>
              </li>
            })}
          </ul>
        </>}
      </div>

      <div className={`${mobileView === 'agenda' ? 'hidden sm:block' : ''} p-2 sm:p-4`} aria-busy={fetching}>
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
                className={`
                  min-h-14 min-w-0 sm:min-h-36 p-1 sm:p-2 rounded-sm border transition-colors relative flex flex-col group
                  ${isSelected || (!isMultiSelecting && mobileDetailDate && format(mobileDetailDate, 'yyyy-MM-dd') === dayStr) ? 'border-brand bg-accent ring-2 ring-brand ring-offset-1 dark:ring-offset-background'
                    : today ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-950/20'
                    : holidayName && !dayEvent ? 'border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-900/20' 
                    : weekend && !dayEvent ? 'border-border bg-muted/60'
                    : 'border-border bg-background hover:border-foreground/40'}
                `}
              >
                <button type="button" onClick={() => handleDayClick(day)} disabled={fetching || fetchError || deleting || (isMultiSelecting && Boolean(dayEvent))} className="absolute inset-0 z-10 rounded-sm" aria-current={today ? 'date' : undefined} aria-pressed={isMultiSelecting ? isSelected : undefined} aria-label={`${format(day, 'EEEE d MMMM yyyy', { locale: it })}${today ? ', oggi' : ''}${dayEvent ? `, ${TYPE_LABELS[dayEvent.tipo] || dayEvent.tipo}, ${dayEvent.mezza_giornata ? 'mezza giornata' : 'giornata intera'}` : ', nessuna pianificazione'}${holidayName ? `, ${holidayName}` : ''}${scheduledPeople.length ? `, ${scheduledPeople.length} persone pianificate` : ''}${isSelected ? ', selezionato' : ''}`} />
                {/* Etichetta del Giorno */}
                <span className={`
                  inline-flex items-center justify-center size-7 text-sm font-semibold rounded-full sm:mb-1
                  ${today ? 'bg-primary text-primary-foreground' : 'text-foreground'}
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
                      disabled={fetching || fetchError || deleting}
                      className="relative z-20 mt-2 grid min-h-11 w-full place-items-center rounded-sm border bg-background text-red-800 hover:bg-accent dark:text-red-200"
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
                    onClick={(event) => { event.stopPropagation(); openTeam(day) }}
                    disabled={fetching || fetchError}
                    className="relative z-20 mt-2 hidden min-h-11 items-center justify-center gap-1 border border-brand/20 bg-card px-1 py-1 text-sm font-semibold text-brand-strong hover:bg-accent sm:inline-flex dark:text-brand"
                    aria-label={`Mostra le ${scheduledPeople.length} persone pianificate il ${format(day, 'd MMMM yyyy', { locale: it })}`}
                  >
                    <Users className="hidden size-3 shrink-0 sm:block" aria-hidden="true" />
                    <span>{scheduledPeople.length}</span>
                    <span className="hidden xl:inline">persone</span>
                  </button>
                )}

                <span className="mt-auto flex items-center justify-center gap-0.5 sm:hidden" aria-hidden="true">
                  {dayEvent && (() => { const Icon = EVENT_OPTIONS.find(option => option.value === dayEvent.tipo)?.icon || CalendarPlus; return <Icon className="size-3.5 text-foreground" /> })()}
                  {scheduledPeople.length > 0 && <Users className="size-3.5 text-foreground" />}
                </span>

              </div>
            )
          })}
        </div>
      </div>

      <Dialog open={Boolean(mobileDetailDate)} onOpenChange={open => { if (!open) setMobileDetailDate(null) }}>
        <DialogContent className="calendar-sheet" onCloseAutoFocus={event => { event.preventDefault(); restoreDayFocus() }}>
        {mobileDetailDate ? (() => {
          const dateKey = format(mobileDetailDate, 'yyyy-MM-dd')
          const event = events.find(item => item.data === dateKey)
          const people = teamSchedule.filter(item => item.data === dateKey)
          return <div className="space-y-3">
            <DialogHeader><p className="page-kicker">Giorno selezionato</p><DialogTitle className="pr-10 text-xl font-semibold capitalize">{format(mobileDetailDate, 'EEEE d MMMM', { locale: it })}</DialogTitle><DialogDescription className="text-base">{event ? `${TYPE_LABELS[event.tipo] || event.tipo} · ${event.mezza_giornata ? 'Mezza giornata' : 'Giornata intera'}` : getItalianHoliday(mobileDetailDate) || 'Nessuna pianificazione'}</DialogDescription></DialogHeader>
            <div className="flex flex-wrap gap-2">
              {event ? <Button disabled={deleting || fetching || fetchError} variant="outline" className="text-red-800 dark:text-red-200" onClick={click => handleDelete(event.id, click)}><Trash2 className="size-4" /> {deleting ? 'Rimozione…' : 'Rimuovi'}</Button> : <Button disabled={fetching || fetchError} onClick={() => handleDayClick(mobileDetailDate, true)}><CalendarPlus className="size-4" /> Pianifica</Button>}
              {people.length > 0 && <Button disabled={fetching || fetchError} variant="outline" onClick={() => openTeam(mobileDetailDate)}><Users className="size-4" /> Team ({people.length})</Button>}
            </div>
          </div>
        })() : <DialogTitle>Dettagli giornata</DialogTitle>}
        </DialogContent>
      </Dialog>

      {isMultiSelecting && (
        <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom)+0.75rem)] z-30 m-3 flex flex-wrap items-center gap-3 border border-brand/25 bg-card p-3 shadow-lg sm:p-4 lg:bottom-5">
          <div className="min-w-0 flex-1">
            <p role="status" className="text-base font-semibold">{selectedDates.length === 0 ? 'Seleziona i giorni' : `${selectedDates.length} ${selectedDates.length === 1 ? 'giorno selezionato' : 'giorni selezionati'}`}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setSelectedDates([]); setIsMultiSelecting(false) }}>Annulla</Button>
          <Button size="sm" disabled={selectedDates.length === 0 || fetching || fetchError} onClick={event => { lastDayTrigger.current = event.currentTarget; setSelectedDate(null); setIsModalOpen(true) }}>
            Continua
          </Button>
        </div>
      )}

      <Dialog open={Boolean(teamDetailDate)} onOpenChange={(open) => { if (!open) setTeamDetailDate(null) }}>
        <DialogContent className="calendar-sheet" onCloseAutoFocus={event => { event.preventDefault(); if (teamTrigger.current?.isConnected) teamTrigger.current.focus(); else restoreDayFocus() }}>
          <DialogHeader>
            <p className="page-kicker">Quadro del team</p>
            <DialogTitle className="text-2xl capitalize">{teamDetailDate ? format(teamDetailDate, 'EEEE d MMMM', { locale: it }) : ''}</DialogTitle>
            <DialogDescription>Chi ha pianificato la giornata e con quale modalità.</DialogDescription>
          </DialogHeader>
          <div className="divide-y border-y">
            {teamSchedule.filter(entry => entry.data === (teamDetailDate ? format(teamDetailDate, 'yyyy-MM-dd') : '')).map(entry => {
              const label = [entry.nome, entry.cognome].filter(Boolean).join(' ') || entry.email
              return <div key={entry.utente_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="break-words text-base font-semibold">{label}</p>
                  <p className="text-sm text-muted-foreground">{entry.ruolo === 'admin' ? 'Admin' : 'Utente'}</p>
                </div>
                <div className={`max-w-full border px-2.5 py-1 text-base font-semibold ${TYPE_COLORS[entry.tipo] || 'bg-muted'}`}>
                  {TYPE_LABELS[entry.tipo] || entry.tipo}{entry.mezza_giornata ? ' · ½ giornata' : ''}
                </div>
              </div>
            })}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setTeamDetailDate(null)}>Chiudi</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modale Inserimento */}
      <Dialog open={isModalOpen} onOpenChange={open => { if (!loading) setIsModalOpen(open) }}>
        <DialogContent className="calendar-editor grid max-h-[calc(100dvh-1rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-2xl" onCloseAutoFocus={event => { event.preventDefault(); restoreDayFocus() }}>
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
                <div className="flex flex-wrap gap-2 pb-1" aria-label="Date selezionate">
                  {[...selectedDates].sort().map(date => (
                    <span key={date} className="shrink-0 border border-brand/20 bg-card px-2.5 py-1.5 text-xs font-semibold capitalize">
                      {format(new Date(`${date}T12:00:00`), 'EEE d MMM', { locale: it })}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedDates.some(date => { const day = new Date(`${date}T12:00:00`); return isWeekend(day) || getItalianHoliday(day) }) && (
              <p className="border-l-2 border-amber-700 bg-amber-50 p-3 text-base text-amber-950 dark:bg-amber-950 dark:text-amber-100">La selezione include giorni festivi o del fine settimana. Confermando, pianificherai anche queste date.</p>
            )}

            <fieldset>
              <legend className="text-sm font-semibold">Come sarà organizzata la giornata?</legend>
              <div className="mt-3 space-y-4">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {EVENT_OPTIONS.slice(0, 2).map(option => {
                    const Icon = option.icon
                    const selected = eventType === option.value
                    return <label key={option.value} className={`calendar-option relative flex min-h-20 cursor-pointer items-center gap-3 border-2 p-3 text-left ${selected ? `${option.selected} shadow-sm` : 'bg-card hover:bg-accent/20'}`}>
                      <input type="radio" name="calendar-activity" value={option.value} checked={selected} onChange={() => setEventType(option.value)} className="size-5 shrink-0 accent-primary" />
                      <span className={`grid size-11 shrink-0 place-items-center rounded-full bg-background/80 ${option.color}`}><Icon className="size-6" aria-hidden="true" /></span>
                      <span className="min-w-0"><span className="block text-base font-semibold">{option.label}</span><span className="block text-xs text-muted-foreground">{option.note}</span></span>
                      {selected && <ShieldCheck className="ml-auto size-5 shrink-0 text-brand" aria-hidden="true" />}
                    </label>
                  })}
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Altre opzioni</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {EVENT_OPTIONS.slice(2).map(option => {
                      const Icon = option.icon
                      const selected = eventType === option.value
                      return <label key={option.value} className={`calendar-option relative flex min-h-14 cursor-pointer items-center gap-2.5 border p-3 text-left ${selected ? option.selected : 'bg-card hover:bg-accent/20'}`}>
                        <input type="radio" name="calendar-activity" value={option.value} checked={selected} onChange={() => setEventType(option.value)} className="size-5 shrink-0 accent-primary" />
                        <Icon className={`size-4 shrink-0 ${option.color}`} aria-hidden="true" />
                        <span className="min-w-0"><span className="block text-sm font-semibold">{option.label}</span><span className="hidden text-xs text-muted-foreground lg:block">{option.note}</span></span>
                        {selected && <ShieldCheck className="ml-auto size-4 shrink-0 text-brand" aria-hidden="true" />}
                      </label>
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
            <Button variant="ghost" disabled={loading} onClick={() => setIsModalOpen(false)}>Annulla</Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? 'Salvataggio...' : 'Conferma'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Alert/Confirm Modale */}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent className="calendar-confirm max-h-[calc(100dvh-1rem)] overflow-y-auto">
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
              className={alertConfig.isConfirm ? "bg-primary text-primary-foreground" : undefined}
            >
              {alertConfig.isConfirm ? 'Conferma' : 'Ho capito'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
