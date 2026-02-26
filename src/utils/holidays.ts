export function getEaster(year: number): Date {
  const f = Math.floor
  const G = year % 19
  const C = f(year / 100)
  const H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30
  const I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11))
  const J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7
  const L = I - J
  const month = 3 + f((L + 40) / 44)
  const day = L + 28 - 31 * f(month / 4)
  return new Date(year, month - 1, day)
}

export function getEasterMonday(year: number): Date {
  const easter = getEaster(year)
  return new Date(year, easter.getMonth(), easter.getDate() + 1)
}

export function getItalianHoliday(date: Date): string | null {
  const d = date.getDate()
  const m = date.getMonth() + 1
  const y = date.getFullYear()

  if (d === 1 && m === 1) return 'Capodanno'
  if (d === 6 && m === 1) return 'Epifania'
  if (d === 25 && m === 4) return 'Festa della Liberazione'
  if (d === 1 && m === 5) return 'Festa dei Lavoratori'
  if (d === 2 && m === 6) return 'Festa della Repubblica'
  if (d === 29 && m === 6) return 'San Pietro e Paolo'
  if (d === 15 && m === 8) return 'Ferragosto'
  if (d === 1 && m === 11) return 'Tutti i Santi'
  if (d === 8 && m === 12) return 'Immacolata Concezione'
  if (d === 25 && m === 12) return 'Natale'
  if (d === 26 && m === 12) return 'Santo Stefano'

  const easter = getEaster(y)
  if (d === easter.getDate() && m === (easter.getMonth() + 1)) {
    return 'Pasqua'
  }

  const easterMonday = getEasterMonday(y)
  if (d === easterMonday.getDate() && m === (easterMonday.getMonth() + 1)) {
    return 'Pasquetta'
  }

  return null
}
