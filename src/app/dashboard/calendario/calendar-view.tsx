'use client'

import { useId, useMemo, useSyncExternalStore, type RefObject } from 'react'
import { format, isSameMonth, isToday, isWeekend } from 'date-fns'
import { it } from 'date-fns/locale'
import { Popover } from 'radix-ui'
import { BriefcaseBusiness, CalendarPlus, Check, ChevronDown, Clock3, Ellipsis, HeartPulse, Home, Plane, Trash2, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { getItalianHoliday } from '@/utils/holidays'

export type CalendarEntry = {
  id: string
  data: string
  tipo: string
  mezza_giornata: boolean
}

export type TeamEntry = {
  data: string
  tipo: string
  mezza_giornata: boolean
  utente_id: string
  email: string
  nome: string
  cognome: string
  ruolo: 'user' | 'admin'
}

export const TYPE_LABELS: Record<string, string> = {
  ufficio: 'In ufficio', smartworking: 'Smartworking', ferie: 'Ferie', permesso: 'Permesso', malattia: 'Malattia',
}

export const EVENT_OPTIONS = [
  { value: 'ufficio', label: 'In ufficio', note: 'Presenza in sede', icon: BriefcaseBusiness, color: 'text-emerald-800 dark:text-emerald-300', selected: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' },
  { value: 'smartworking', label: 'Smartworking', note: 'Lavoro da remoto', icon: Home, color: 'text-blue-800 dark:text-blue-300', selected: 'border-blue-500 bg-blue-50 dark:bg-blue-950/40' },
  { value: 'permesso', label: 'Permesso', note: 'Assenza autorizzata', icon: Clock3, color: 'text-violet-800 dark:text-violet-300', selected: 'border-violet-500 bg-violet-50 dark:bg-violet-950/40' },
  { value: 'ferie', label: 'Ferie', note: 'Giornata di ferie', icon: Plane, color: 'text-amber-800 dark:text-amber-300', selected: 'border-amber-500 bg-amber-50 dark:bg-amber-950/40' },
  { value: 'malattia', label: 'Malattia', note: 'Assenza per malattia', icon: HeartPulse, color: 'text-red-800 dark:text-red-300', selected: 'border-red-500 bg-red-50 dark:bg-red-950/40' },
] as const

export function CalendarStatus({ event, compact = false, showDuration = true }: { event: Pick<CalendarEntry, 'tipo' | 'mezza_giornata'>, compact?: boolean, showDuration?: boolean }) {
  const option = EVENT_OPTIONS.find(item => item.value === event.tipo)
  const Icon = option?.icon || CalendarPlus
  return <span className={`calendar-status ${option?.color || 'text-foreground'}`}>
    <Icon className="size-4 shrink-0" aria-hidden="true" />
    <span className={compact ? 'calendar-status-copy' : 'min-w-0'}>
      <span className="block font-medium">{TYPE_LABELS[event.tipo] || event.tipo}</span>
      {showDuration && <span className="calendar-duration block text-muted-foreground">{event.mezza_giornata ? 'Mezza giornata' : 'Giornata intera'}</span>}
    </span>
  </span>
}

export function CalendarDay({ day, month, event, peopleCount, selected, selecting, disabled, onSelect }: {
  day: Date, month: Date, event?: CalendarEntry, peopleCount: number, selected: boolean,
  selecting: boolean, disabled: boolean, onSelect: (day: Date) => void,
}) {
  const dateKey = format(day, 'yyyy-MM-dd')
  const holiday = getItalianHoliday(day)
  const today = isToday(day)
  const outside = !isSameMonth(day, month)
  const action = selecting ? selected ? 'Deseleziona' : 'Seleziona' : event ? 'Dettagli e rimozione' : 'Dettagli e pianificazione'
  const label = `${action}, ${format(day, 'EEEE d MMMM yyyy', { locale: it })}${today ? ', oggi' : ''}${outside ? ', mese adiacente' : ''}${event ? `, ${TYPE_LABELS[event.tipo] || event.tipo}, ${event.mezza_giornata ? 'mezza giornata' : 'giornata intera'}` : ', nessuna pianificazione'}${holiday ? `, ${holiday}` : isWeekend(day) ? ', fine settimana' : ''}${peopleCount ? `, ${peopleCount} ${peopleCount === 1 ? 'persona pianificata' : 'persone pianificate'}` : ''}`
  return <button type="button" data-calendar-date={dateKey} data-outside-month={outside || undefined} data-selected={selected || undefined}
    className={`calendar-day ${outside ? 'calendar-day-outside' : ''} ${isWeekend(day) ? 'calendar-day-weekend' : ''} ${selected ? 'calendar-day-selected' : ''}`}
    disabled={disabled || (selecting && Boolean(event))} onClick={() => onSelect(day)}
    aria-current={today ? 'date' : undefined} aria-pressed={selecting ? selected : undefined} aria-expanded={!selecting ? selected : undefined} aria-haspopup={!selecting ? 'dialog' : undefined} aria-label={label}>
    <span className="calendar-day-heading">
      <time dateTime={dateKey} className={`calendar-day-number ${today ? 'calendar-day-today' : ''}`}>{format(day, 'd')}</time>
      {selected && <Check className="size-4 text-brand" aria-hidden="true" />}
      {event && !selecting && !selected && <Ellipsis className="calendar-day-menu size-4 text-muted-foreground" aria-hidden="true" />}
    </span>
    <span className="calendar-day-content" aria-hidden="true">
      {event && <CalendarStatus event={event} compact />}
      {holiday && <span className="calendar-holiday">{holiday}</span>}
      {peopleCount > 0 && <span className="calendar-team-count"><Users className="size-3.5 shrink-0" /> <span>{peopleCount}<span className="calendar-team-word"> {peopleCount === 1 ? 'persona' : 'persone'}</span></span></span>}
    </span>
  </button>
}

function subscribeMobile(callback: () => void) {
  const query = window.matchMedia('(max-width: 767px)')
  query.addEventListener('change', callback)
  return () => query.removeEventListener('change', callback)
}
const mobileSnapshot = () => window.matchMedia('(max-width: 767px)').matches

type DayPanelProps = {
  date: Date | null
  event?: CalendarEntry
  people: TeamEntry[]
  targetUserName?: string
  anchor: HTMLElement | null
  titleRef: RefObject<HTMLHeadingElement | null>
  suspended: boolean
  busy: boolean
  deleting: boolean
  fetchError: boolean
  status: string
  teamExpanded: boolean
  onTeamToggle: (expanded: boolean) => void
  onPlan: () => void
  onDelete: () => void
  onClose: () => void
  restoreFocus: () => void
}

export function CalendarDayPanel(props: DayPanelProps) {
  const mobile = useSyncExternalStore(subscribeMobile, mobileSnapshot, () => false)
  const titleId = useId()
  const descriptionId = useId()
  const virtualRef = useMemo(() => ({ current: props.anchor || { getBoundingClientRect: () => new DOMRect() } }), [props.anchor])
  const open = Boolean(props.date) && !props.suspended
  const openFocus = (event: Event) => { event.preventDefault(); props.titleRef.current?.focus() }
  const closeFocus = (event: Event) => {
    event.preventDefault()
    // A viewport change replaces the panel; an editor transition opens a form.
    // Keep focus in the new surface instead of restoring it behind that surface.
    if (document.querySelector('[data-calendar-editor]')) return
    const newTitle = document.querySelector<HTMLElement>('[data-calendar-day-details] [data-slot="dialog-title"]')
    if (newTitle) newTitle.focus()
    else props.restoreFocus()
  }
  const content = props.date && <DayPanelContent {...props} mobile={mobile} titleId={titleId} descriptionId={descriptionId} />
  if (mobile) return <Dialog open={open} onOpenChange={value => { if (!value) props.onClose() }}>
    <DialogContent className="calendar-sheet calendar-day-panel" showCloseButton={false} onOpenAutoFocus={openFocus} onCloseAutoFocus={closeFocus} data-calendar-day-details="sheet">
      {content}
    </DialogContent>
  </Dialog>
  return <Popover.Root open={open} modal onOpenChange={value => { if (!value) props.onClose() }}>
    <Popover.Anchor virtualRef={virtualRef} />
    <Popover.Portal>
      <Popover.Content className="calendar-popover calendar-day-panel" data-calendar-day-details="popover" side="right" align="start" sideOffset={12} collisionPadding={16}
        aria-labelledby={titleId} aria-describedby={descriptionId} onOpenAutoFocus={openFocus} onCloseAutoFocus={closeFocus}>
        {content}
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>
}

function DayPanelContent({ mobile, titleId, descriptionId, titleRef, ...props }: DayPanelProps & { mobile: boolean, titleId: string, descriptionId: string }) {
  const date = props.date!
  const dateKey = format(date, 'yyyy-MM-dd')
  const title = <time dateTime={dateKey}>{format(date, 'EEEE d MMMM yyyy', { locale: it })}</time>
  const description = props.event ? 'Consulta il turno o scegli «Rimuovi pianificazione».' : getItalianHoliday(date) || 'Giornata libera: puoi inserire una pianificazione.'
  return <>
    <header className="calendar-detail-header">
      <p className="page-kicker">{props.targetUserName ? `Turno di ${props.targetUserName}` : 'La tua giornata'}</p>
      {mobile ? <DialogTitle ref={titleRef} tabIndex={-1} className="capitalize">{title}</DialogTitle>
        : <h2 ref={titleRef} tabIndex={-1} id={titleId} data-slot="dialog-title" className="text-xl font-semibold capitalize leading-snug">{title}</h2>}
      {mobile ? <DialogDescription>{description}</DialogDescription>
        : <p id={descriptionId} className="text-base text-muted-foreground">{description}</p>}
      <Button variant="ghost" size="icon" className="calendar-panel-close" onClick={props.onClose} aria-label="Chiudi dettagli giornata"><X className="size-4" aria-hidden="true" /></Button>
    </header>
    <div className="calendar-detail-body">
      <p role="status" className="sr-only">{props.deleting ? 'Rimozione della pianificazione in corso.' : props.status}</p>
      {props.fetchError && <p role="alert" className="text-base">Impossibile aggiornare il calendario. Chiudi il dettaglio e scegli «Riprova».</p>}
      {props.event && <dl className="calendar-detail-summary">
        <div><dt className="text-sm text-muted-foreground">Attività</dt><dd className="mt-1"><CalendarStatus event={props.event} showDuration={false} /></dd></div>
        <div><dt className="text-sm text-muted-foreground">Durata</dt><dd className="mt-1 font-medium">{props.event.mezza_giornata ? 'Mezza giornata' : 'Giornata intera'}</dd></div>
      </dl>}
      {props.people.length > 0 ? <details className="calendar-team-details" open={props.teamExpanded} onToggle={event => props.onTeamToggle(event.currentTarget.open)}>
        <summary className="calendar-team-summary"><Users className="size-4" aria-hidden="true" /><span>Team ({props.people.length})</span><ChevronDown className="calendar-team-chevron ml-auto size-4" aria-hidden="true" /></summary>
        <ul className="calendar-people" aria-label="Persone pianificate">
          {props.people.map(entry => <li key={entry.utente_id}>
            <p className="break-words font-medium">{[entry.nome, entry.cognome].filter(Boolean).join(' ') || entry.email}</p>
            <CalendarStatus event={entry} />
          </li>)}
        </ul>
      </details> : <p className="text-base text-muted-foreground">Nessun collega pianificato.</p>}
    </div>
    <footer className="calendar-detail-footer">
      {props.event ? <>
        <Button variant="ghost" className="calendar-remove text-muted-foreground" disabled={props.busy || props.fetchError} onClick={props.onDelete}><Trash2 className="size-4" aria-hidden="true" />{props.deleting ? 'Rimozione…' : 'Rimuovi pianificazione'}</Button>
        <Button variant="outline" onClick={props.onClose}>Chiudi</Button>
      </> : <>
        <Button variant="ghost" onClick={props.onClose}>Chiudi</Button>
        <Button disabled={props.busy || props.fetchError} onClick={props.onPlan}><CalendarPlus className="size-4" aria-hidden="true" />Pianifica</Button>
      </>}
    </footer>
  </>
}
