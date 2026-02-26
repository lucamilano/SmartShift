import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { eachDayOfInterval, startOfMonth, endOfMonth, format, isWeekend, getDay } from 'date-fns'
import { it } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const month = parseInt(url.searchParams.get('month') || new Date().getMonth().toString())
  const year = parseInt(url.searchParams.get('year') || new Date().getFullYear().toString())

  const supabase = await createClient()

  // Controllo Admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: profile } = await supabase
    .from('profili')
    .select('ruolo')
    .eq('id', user.id)
    .single()

  if (profile?.ruolo !== 'admin') {
    return new Response('Forbidden', { status: 403 })
  }

  // Estrai tutti i colleghi attivi
  const { data: allUsers } = await supabase
    .from('profili')
    .select('id, nome, cognome')
    .eq('is_active', true)
    .order('cognome', { ascending: true })

  // Estrai tutti gli eventi del mese (es: dal 2026-02-01 al 2026-02-28)
  const targetDate = new Date(year, month, 1)
  const startStr = format(startOfMonth(targetDate), 'yyyy-MM-dd')
  const endStr = format(endOfMonth(targetDate), 'yyyy-MM-dd')

  const { data: allEvents } = await supabase
    .from('eventi_calendario')
    .select('*')
    .gte('data', startStr)
    .lte('data', endStr)

  // Calcola i giorni del mese tralasciando il weekend
  const daysInMonth = eachDayOfInterval({ start: startOfMonth(targetDate), end: endOfMonth(targetDate) })
  const weekDays = daysInMonth.filter(day => !isWeekend(day))

  // Inizia Excel
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(format(targetDate, 'MMMM yyyy', { locale: it }), {
    properties: { tabColor: { argb: 'FF4F81BD' } },
    views: [{ state: 'frozen', xSplit: 2, ySplit: 6 }] // Fissa le colonne dei nomi e la riga delle date (Riga 6)
  })

  // === CREAZIONE LEGENDA ===
  const legends = [
    { label: 'smart', color: 'FF4A86E8' },    // Blu Scuro
    { label: 'ferie', color: 'FFFFFF00' },    // Giallo
    { label: 'malattia', color: 'FFFF0000' }, // Rosso
    { label: 'sede', color: 'FF32CD32' },     // Verde (ufficio)
  ]

  // Disegno la legenda in alto a sinistra a partire dalla riga 2
  legends.forEach((leg, index) => {
    const row = index + 2
    const colorCell = sheet.getCell(`A${row}`)
    const labelCell = sheet.getCell(`B${row}`)
    
    colorCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: leg.color } }
    colorCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
    
    labelCell.value = leg.label
    labelCell.alignment = { vertical: 'middle', horizontal: 'center' }
    labelCell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
  })

  // Imposta larghezza colonne iniziali
  sheet.getColumn(1).width = 4  // Colore legenda
  sheet.getColumn(2).width = 25 // Nomi e Testo Legenda
  
  for (let i = 1; i <= 5; i++) {
    sheet.getRow(i).height = 20
  }

  // === RIGA DELLE DATE (Riga 6) ===
  const dateRowIndex = 6
  const dateStartCol = 3

  weekDays.forEach((day, index) => {
    const colNumber = dateStartCol + index
    const colLetter = sheet.getColumn(colNumber).letter
    const cellStr = `${colLetter}${dateRowIndex}`
    
    const dateCell = sheet.getCell(cellStr)
    dateCell.value = format(day, 'EEEE d MMMM yyyy', { locale: it })
    dateCell.alignment = { 
      textRotation: 90, 
      vertical: 'bottom', 
      horizontal: 'center',
    }
    dateCell.font = { bold: false, size: 10 }
    
    // Sfondo date (tipo pesca chiaro: FFFCE4D6)
    dateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } }
    
    // Bordo base
    dateCell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    }
    
    // Bordo Scuro (thick) DOPO il Venerdì per separare le settimane
    if (getDay(day) === 5) {
      dateCell.border.right = { style: 'medium' }
    }
    
    // Larghezza colonna (devono essere dei quadratini per formare la griglia)
    sheet.getColumn(colNumber).width = 3.5
  })
  
  // Imposta altezza riga date a mano per fare spazio al testo orizzontale
  sheet.getRow(dateRowIndex).height = 140

  // === RIGHE DATI PER OGNI UTENTE ===
  let currentRow = dateRowIndex + 1

  allUsers?.forEach((u) => {
    // 1. Inserisci Nome Cognome
    const nameCell = sheet.getCell(`B${currentRow}`)
    nameCell.value = `${u.nome} ${u.cognome}`
    nameCell.alignment = { vertical: 'middle', horizontal: 'right' }
    nameCell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }

    // 2. Itera sui giorni per questa persona
    weekDays.forEach((day, index) => {
      const colNumber = dateStartCol + index
      const colLetter = sheet.getColumn(colNumber).letter
      const cell = sheet.getCell(`${colLetter}${currentRow}`)
      
      const dayStr = format(day, 'yyyy-MM-dd')
      const userEvent = allEvents?.find(e => e.utente_id === u.id && e.data === dayStr)

      // Colora le celle in base al tipo di evento
      let argbColor = 'FFFFFFFF' // Bianco base
      if (userEvent) {
        if (userEvent.tipo === 'smartworking') argbColor = legends[0].color
        else if (userEvent.tipo === 'ferie') argbColor = legends[1].color
        else if (userEvent.tipo === 'malattia') argbColor = legends[2].color
        else if (userEvent.tipo === 'ufficio') argbColor = legends[3].color
        
        // Se è mezza giornata potremmo indicarlo in qualche modo, per semplicità nel colore mettiamo '½' come testo
        if (userEvent.mezza_giornata) {
          cell.value = '½'
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
        }
      }
      
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argbColor } }
      
      // Bordo standard
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
        bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      }
      
      // Bordo thick per i venerdì per separare visivamente, esattamente come per le header
      if (getDay(day) === 5) {
        cell.border.right = { style: 'medium', color: { argb: 'FF000000' } }
      }
    })
    
    // Riga successiva
    currentRow++
  })

  // Centratura pagina stampata
  sheet.pageSetup = { paperSize: 9, orientation: 'landscape', fitToWidth: 1, fitToHeight: 0 }

  // Genera Buffer
  const buffer = await workbook.xlsx.writeBuffer()

  // Manda in risposta il file forzando il download
  return new NextResponse(buffer, {
    headers: {
      'Content-Disposition': `attachment; filename="Presenze_${format(targetDate, 'MM_yyyy')}.xlsx"`,
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }
  })
}
