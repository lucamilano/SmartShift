import { eachDayOfInterval, endOfMonth, endOfWeek, format, getDay, isAfter, startOfMonth, startOfWeek } from 'date-fns'
import type { CalendarEvent, Profile } from './models'

export const PRESENCE_TYPES = ['ufficio', 'smartworking', 'permesso', 'ferie', 'malattia'] as const
export type PresenceType = typeof PRESENCE_TYPES[number]

export const PRESENCE_LABELS: Record<PresenceType, string> = {
  ufficio: 'In ufficio', smartworking: 'Smartworking', permesso: 'Permesso', ferie: 'Ferie', malattia: 'Malattia',
}

export type PresenceTotals = Record<PresenceType, number>
const emptyTotals = (): PresenceTotals => ({ ufficio: 0, smartworking: 0, permesso: 0, ferie: 0, malattia: 0 })
const eventWeight = (event: CalendarEvent) => event.mezza_giornata ? 0.5 : 1
const dateKey = (date: Date) => format(date, 'yyyy-MM-dd')

export function dashboardRange(today: Date) {
  const monthStart = startOfMonth(today), monthEnd = endOfMonth(today)
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }), weekEnd = endOfWeek(today, { weekStartsOn: 1 })
  return {
    start: dateKey(monthStart < weekStart ? monthStart : weekStart),
    end: dateKey(monthEnd > weekEnd ? monthEnd : weekEnd),
    monthStart: dateKey(monthStart), monthEnd: dateKey(monthEnd), weekStart, weekEnd,
  }
}

export function summarizeDashboard(events: CalendarEvent[], members: Profile[], today: Date) {
  const range = dashboardRange(today), todayKey = dateKey(today)
  const monthEvents = events.filter(event => event.data >= range.monthStart && event.data <= range.monthEnd)
  const todayEvents = events.filter(event => event.data === todayKey)
  const monthTotals = emptyTotals(), todayTotals = emptyTotals()
  for (const event of monthEvents) monthTotals[event.tipo] += eventWeight(event)
  for (const event of todayEvents) todayTotals[event.tipo] += eventWeight(event)

  const week = eachDayOfInterval({ start: range.weekStart, end: range.weekEnd })
    .filter(day => getDay(day) !== 0 && getDay(day) !== 6)
    .map(day => {
      const totals = emptyTotals()
      const eventsForDay = events.filter(event => event.data === dateKey(day))
      for (const event of eventsForDay) totals[event.tipo] += eventWeight(event)
      return { date: dateKey(day), totals, planned: new Set(eventsForDay.map(event => event.utente_id)).size }
    })

  const completedFridays = eachDayOfInterval({ start: startOfMonth(today), end: endOfMonth(today) })
    .filter(day => getDay(day) === 5 && !isAfter(day, today)).map(dateKey)
  const smartFridays = members.map(member => {
    const smartDates = new Set(monthEvents.filter(event => event.utente_id === member.id && event.tipo === 'smartworking').map(event => event.data))
    let streak = 0, longestStreak = 0
    for (const friday of completedFridays) {
      streak = smartDates.has(friday) ? streak + 1 : 0
      longestStreak = Math.max(longestStreak, streak)
    }
    return {
      userId: member.id,
      name: [member.nome, member.cognome].filter(Boolean).join(' ') || member.email,
      role: member.ruolo,
      longestStreak,
      total: completedFridays.filter(friday => smartDates.has(friday)).length,
    }
  }).sort((a, b) => b.longestStreak - a.longestStreak || b.total - a.total || a.name.localeCompare(b.name))

  return { monthTotals, todayTotals, todayPlanned: new Set(todayEvents.map(event => event.utente_id)).size, week, smartFridays, completedFridayCount: completedFridays.length }
}
