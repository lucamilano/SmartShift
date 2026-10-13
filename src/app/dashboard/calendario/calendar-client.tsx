'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addWeeks, eachDayOfInterval, format, isToday, addMonths, subMonths, getDay, isWeekend } from 'date-fns'
import { it } from 'date-fns/locale'
import { getItalianHoliday } from '@/utils/holidays'
import { CalendarPlus, Check, ChevronLeft, ChevronRight, ShieldCheck, Users, X } from 'lucide-react'
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

import { CalendarDay, CalendarDayPanel, CalendarStatus, EVENT_OPTIONS, TYPE_LABELS, type CalendarEntry, type TeamEntry } from './calendar-view'

export default function CalendarClient({ 
  initialEvents, 
  initialTeamSchedule,
  targetUserId, 
  targetUserName 
}: { 
  initialEvents: CalendarEntry[],
  initialTeamSchedule: TeamEntry[],
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
  const selectionTrigger = useRef<HTMLButtonElement>(null)
  const dayDetailTitle = useRef<HTMLHeadingElement>(null)
  const restoreDayFocus = () => {
    const target = lastDayTrigger.current
    if (target?.isConnected) target.focus()
    else selectionTrigger.current?.focus()
  }
  const openTeam = (day: Date) => {
    if (document.activeElement instanceof HTMLElement) lastDayTrigger.current = document.activeElement
    setDetailAnchor(lastDayTrigger.current)
    setTeamExpanded(true)
    setDetailDate(day)
  }
  const [events, setEvents] = useState<CalendarEntry[]>(initialEvents)
  const [teamSchedule, setTeamSchedule] = useState<TeamEntry[]>(initialTeamSchedule)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [isMultiSelecting, setIsMultiSelecting] = useState(false)
  const [detailAnchor, setDetailAnchor] = useState<HTMLElement | null>(null)
  const [teamExpanded, setTeamExpanded] = useState(false)
  const [detailDate, setDetailDate] = useState<Date | null>(null)
  
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
    confirmLabel?: string,
    isDestructive?: boolean,
    onConfirm?: () => void
  }>({ title: '', description: '', isConfirm: false })

  const showAlert = (title: string, description: string) => {
    setAlertConfig({ title, description, isConfirm: false })
    setAlertOpen(true)
  }

  const showConfirm = (title: string, description: string, onConfirm: () => void, options: { confirmLabel?: string, isDestructive?: boolean } = {}) => {
    setAlertConfig({ title, description, isConfirm: true, onConfirm, ...options })
    setAlertOpen(true)
  }

  // Mesi precedenti e successivi
  const changeMonth = (month: Date) => {
    setCurrentMonth(month)
    setAgendaDate(startOfMonth(month))
    setDetailDate(null)
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
      const monthStart = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 })
      const monthEnd = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 })
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

  const days = useMemo(() => eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 }),
  }), [currentMonth])
  const eventsByDate = useMemo(() => new Map(events.map(event => [event.data, event])), [events])
  const peopleByDate = useMemo(() => {
    const grouped = new Map<string, TeamEntry[]>()
    for (const entry of teamSchedule) {
      const people = grouped.get(entry.data) || []
      people.push(entry)
      grouped.set(entry.data, people)
    }
    return grouped
  }, [teamSchedule])
  const weekStart = startOfWeek(agendaDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(agendaDate, { weekStartsOn: 1 })
  const agendaDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  // Apre la modale per l'inserimento
  const handleDayClick = (day: Date, openEditor = false) => {
    if (fetching || fetchError || loading || deleting) return
    if (document.activeElement instanceof HTMLElement && !document.activeElement.closest('[role="dialog"]')) lastDayTrigger.current = document.activeElement
    const dayStr = format(day, 'yyyy-MM-dd')
    const existingEvent = eventsByDate.get(dayStr)

    if (isMultiSelecting) {
      if (existingEvent) {
        showAlert('Giorno già pianificato', 'Puoi selezionare solo giorni ancora liberi.')
        return
      }
      setSelectedDates(current => current.includes(dayStr) ? current.filter(date => date !== dayStr) : [...current, dayStr])
      return
    }

    setStatus('')
    if (!openEditor || existingEvent) {
      setTeamExpanded(false)
      setDetailAnchor(lastDayTrigger.current)
      setDetailDate(day)
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
      setDetailDate(null)
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
  const handleDelete = (id: string) => {
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
        setEvents(current => current.filter(item => item.id !== id))
        setStatus('Pianificazione rimossa.')
        setAlertOpen(false)
        setReload(value => value + 1)
      } catch {
        showAlert('Rimozione non riuscita', 'Impossibile rimuovere la pianificazione. Riprova.')
      } finally {
        setDeleting(false)
      }
    }, { confirmLabel: 'Rimuovi', isDestructive: true })
  }

  return (
    <section className={`calendar-workspace border border-border/80 bg-card ${isMultiSelecting ? 'pb-6' : ''}`} aria-label="Calendario e pianificazione">
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
      <div className="space-y-4 p-4 md:hidden">
        <div className="grid grid-cols-2 gap-2" aria-label="Vista calendario">
          <Button variant={mobileView === 'agenda' ? 'default' : 'outline'} aria-pressed={mobileView === 'agenda'} onClick={() => setMobileView('agenda')}>Agenda</Button>
          <Button variant={mobileView === 'month' ? 'default' : 'outline'} aria-pressed={mobileView === 'month'} onClick={() => setMobileView('month')}>Mese</Button>
        </div>
        {mobileView === 'agenda' && <p className="text-base text-muted-foreground">{isMultiSelecting ? 'Seleziona i giorni liberi, anche in settimane o mesi diversi.' : 'Apri una giornata per consultare il team o rimuovere un turno. Pianifica i giorni liberi.'}</p>}
        {mobileView === 'agenda' && <>
          <div className="flex items-center justify-between gap-2">
            <Button variant="outline" size="icon" aria-label="Settimana precedente" onClick={() => changeWeek(-1)}><ChevronLeft aria-hidden="true" /></Button>
            <h3 className="text-center text-base font-semibold" aria-live="polite">{format(agendaDays[0], 'd MMM', { locale: it })} – {format(agendaDays[agendaDays.length - 1], 'd MMM', { locale: it })}</h3>
            <Button variant="outline" size="icon" aria-label="Settimana successiva" onClick={() => changeWeek(1)}><ChevronRight aria-hidden="true" /></Button>
          </div>
          <ul className="space-y-3" aria-label="Giornate della settimana" aria-busy={fetching}>
            {agendaDays.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd')
              const event = eventsByDate.get(dateKey)
              const people = peopleByDate.get(dateKey) || []
              const selected = selectedDates.includes(dateKey)
              const holiday = getItalianHoliday(day)
              return <li key={dateKey} className={`rounded-lg border p-4 ${selected ? 'border-brand bg-accent' : 'bg-background'}`}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-base font-semibold capitalize"><time dateTime={dateKey}>{format(day, 'EEEE d MMMM', { locale: it })}</time></h4>
                  {isToday(day) && <span className="rounded-full bg-primary px-2 py-1 text-sm font-semibold text-primary-foreground">Oggi</span>}
                </div>
                {holiday && <p className="mb-2 text-base text-muted-foreground">{holiday}</p>}
                {event ? <div className="mb-4 text-base"><CalendarStatus event={event} /></div>
                  : <p className="mb-4 text-base text-muted-foreground">{isWeekend(day) && !holiday ? 'Fine settimana · ' : ''}Nessuna pianificazione</p>}
                <div className="flex flex-wrap gap-2">
                  {isMultiSelecting ? <Button className="w-full whitespace-normal" variant={selected ? 'default' : 'outline'} disabled={Boolean(event) || fetching || fetchError} aria-pressed={selected} aria-label={`${selected ? 'Deseleziona' : 'Seleziona'} ${format(day, 'd MMMM', { locale: it })}`} onClick={() => handleDayClick(day)}>{event ? 'Già pianificato' : selected ? <><Check aria-hidden="true" /> Selezionato</> : 'Seleziona giorno'}</Button>
                    : <>
                      <Button variant={event ? 'outline' : 'default'} className="h-auto min-h-11 max-w-full whitespace-normal text-left" disabled={fetching || fetchError || deleting} onClick={() => handleDayClick(day, !event)} aria-haspopup="dialog" aria-label={`${event ? 'Dettagli e rimozione' : 'Pianifica'} del ${format(day, 'd MMMM', { locale: it })}`}>{event ? <>Dettagli e rimozione <ChevronRight className="size-4" aria-hidden="true" /></> : <><CalendarPlus aria-hidden="true" /> Pianifica</>}</Button>
                      {people.length > 0 && <Button variant="outline" disabled={fetching || fetchError} onClick={() => openTeam(day)} aria-label={`Team del ${format(day, 'd MMMM', { locale: it })}: ${people.length} persone`}><Users aria-hidden="true" /> Team ({people.length})</Button>}
                    </>}
                </div>
              </li>
            })}
          </ul>
        </>}
      </div>

      <div className={`calendar-month-view ${mobileView === 'agenda' ? 'hidden md:block' : ''}`} aria-busy={fetching}>
        <div className="calendar-month-intro">
          <p id="calendar-month-help" className="text-sm text-muted-foreground">
            {isMultiSelecting ? 'Seleziona i giorni liberi da pianificare.' : 'Apri un giorno per pianificare, consultare il team o scegliere «Rimuovi pianificazione».'}
          </p>
        </div>
        <div className="calendar-weekdays" aria-hidden="true">
          {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => <span key={day}>{day}</span>)}
        </div>
        <div className="calendar-grid" role="group" aria-label="Giorni del mese" aria-describedby="calendar-month-help" onKeyDown={event => {
          const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
          if (!(event.key in offsets) || !(event.target instanceof HTMLButtonElement)) return
          const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[data-calendar-date]'))
          const next = buttons[buttons.indexOf(event.target) + offsets[event.key]]
          if (next && !next.disabled) { event.preventDefault(); next.focus() }
        }}>
          {days.map(day => {
            const key = format(day, 'yyyy-MM-dd')
            return <CalendarDay key={key} day={day} month={currentMonth} event={eventsByDate.get(key)} peopleCount={peopleByDate.get(key)?.length || 0}
              selecting={isMultiSelecting} selected={selectedDates.includes(key) || (!isMultiSelecting && Boolean(detailDate) && format(detailDate!, 'yyyy-MM-dd') === key)}
              disabled={fetching || fetchError || loading || deleting} onSelect={handleDayClick} />
          })}
        </div>
        <ul className="calendar-legend" aria-label="Attività del calendario">
          {EVENT_OPTIONS.map(option => <li key={option.value} className={option.color}><option.icon className="size-4" aria-hidden="true" /><span>{option.label}</span></li>)}
        </ul>
      </div>

      <CalendarDayPanel date={detailDate} event={detailDate ? eventsByDate.get(format(detailDate, 'yyyy-MM-dd')) : undefined}
        people={detailDate ? peopleByDate.get(format(detailDate, 'yyyy-MM-dd')) || [] : []} targetUserName={targetUserName}
        anchor={detailAnchor} titleRef={dayDetailTitle} suspended={isModalOpen} busy={loading || deleting || fetching} deleting={deleting}
        fetchError={fetchError} status={status} teamExpanded={teamExpanded} onTeamToggle={setTeamExpanded}
        onPlan={() => { if (detailDate) handleDayClick(detailDate, true) }}
        onDelete={() => { const event = detailDate && eventsByDate.get(format(detailDate, 'yyyy-MM-dd')); if (event) handleDelete(event.id) }}
        onClose={() => setDetailDate(null)} restoreFocus={restoreDayFocus} />

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

      {/* Modale Inserimento */}
      <Dialog open={isModalOpen} onOpenChange={open => { if (!loading) setIsModalOpen(open) }}>
        <DialogContent data-calendar-editor className="calendar-editor grid max-h-[calc(100dvh-1rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-2xl" onCloseAutoFocus={event => { event.preventDefault(); if (detailDate) dayDetailTitle.current?.focus(); else restoreDayFocus() }}>
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
      <AlertDialog open={alertOpen} onOpenChange={open => { if (!deleting) setAlertOpen(open) }}>
        <AlertDialogContent className="calendar-confirm max-h-[calc(100dvh-1rem)] overflow-y-auto" onCloseAutoFocus={event => {
          if (alertConfig.isDestructive && status === 'Pianificazione rimossa.') {
            event.preventDefault()
            dayDetailTitle.current?.focus()
          }
        }}>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertConfig.title}</AlertDialogTitle>
            <AlertDialogDescription aria-live="polite">{deleting ? 'Rimozione della pianificazione in corso…' : alertConfig.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {alertConfig.isConfirm && (
              <AlertDialogCancel disabled={deleting}>Annulla</AlertDialogCancel>
            )}
            <AlertDialogAction 
              variant={alertConfig.isDestructive ? 'destructive' : 'default'}
              disabled={deleting}
              onClick={event => {
                if (alertConfig.isDestructive) event.preventDefault()
                if (alertConfig.isConfirm && alertConfig.onConfirm) {
                  alertConfig.onConfirm()
                }
              }}
            >
              {deleting ? 'Rimozione…' : alertConfig.isConfirm ? alertConfig.confirmLabel || 'Conferma' : 'Ho capito'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
