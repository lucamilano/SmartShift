'use client'

import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

const MONTHS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
]

export default function ExportPage() {
  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth().toString())
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString())
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)

  // Anni disponibili: L'anno scorso, l'anno corrente, il prossimo anno
  const years = [
    (currentDate.getFullYear() - 1).toString(),
    currentDate.getFullYear().toString(),
    (currentDate.getFullYear() + 1).toString(),
  ]

  // Costruiamo l'URL di download in base alle selezioni
  const downloadUrl = `/api/export-excel?month=${selectedMonth}&year=${selectedYear}`
  const download = async () => {
    setBusy(true)
    setFailed(false)
    setMessage('Preparazione del file Excel…')
    try {
      const response = await fetch(downloadUrl)
      if (!response.ok) {
        const result = await response.json().catch(() => null)
        throw new Error(result?.error || 'Impossibile generare il file. Riprova.')
      }
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = url
      link.download = response.headers.get('Content-Disposition')?.match(/filename="?([^";]+)/)?.[1] || `Presenze-${selectedYear}-${Number(selectedMonth) + 1}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setMessage('Il download del file Excel è stato avviato.')
    } catch (error) {
      setFailed(true)
      setMessage(error instanceof Error && error.message !== 'Failed to fetch' ? error.message : 'Connessione non disponibile. Riprova a scaricare il file.')
    } finally { setBusy(false) }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-7">
      
      <header>
        <p className="page-kicker">Reportistica</p>
        <h1 className="page-title">
          Esportazione dati mensili
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Genera il foglio presenze del team per il periodo selezionato.
        </p>
      </header>

      <section className="border-l-2 border-brand bg-card px-5 py-6 shadow-[0_18px_45px_-42px_rgba(13,70,66,.65)] sm:px-7" aria-labelledby="period-title">
          <h2 id="period-title" className="text-lg font-semibold">Periodo di esportazione</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Il file Excel includerà i giorni lavorativi dal lunedì al venerdì.
          </p>
        <div className="mt-5 space-y-6">
          
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-3">
              <Label htmlFor="export-month" className="text-sm font-medium">Mese</Label>
              <Select disabled={busy} value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger id="export-month" className="w-full">
                  <SelectValue placeholder="Seleziona..." />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label htmlFor="export-year" className="text-sm font-medium">Anno</Label>
              <Select disabled={busy} value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger id="export-year" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-5 border-t flex justify-end">
            <Button type="button" onClick={download} disabled={busy} className="w-full sm:w-auto">
                <Download className="mr-2 h-5 w-5" />
                {busy ? 'Preparazione…' : 'Scarica file Excel'}
            </Button>
          </div>
          <p role={failed ? 'alert' : 'status'} className="text-base">{message}</p>
          
        </div>
      </section>
      
      <section className="bg-muted/55 px-5 py-4" aria-labelledby="legend-title">
        <h2 id="legend-title" className="text-sm font-medium">
          Legenda del file
        </h2>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          <div className="flex items-center"><span className="mr-2 size-4 border bg-[#4A86E8]" aria-hidden="true" /><span className="text-sm font-medium">Smartworking</span></div>
          <div className="flex items-center"><span className="mr-2 size-4 border bg-[#FFFF00]" aria-hidden="true" /><span className="text-sm font-medium">Ferie</span></div>
          <div className="flex items-center"><span className="mr-2 size-4 border bg-[#A78BFA]" aria-hidden="true" /><span className="text-sm font-medium">Permesso</span></div>
          <div className="flex items-center"><span className="mr-2 size-4 border bg-[#FF0000]" aria-hidden="true" /><span className="text-sm font-medium">Malattia</span></div>
          <div className="flex items-center"><span className="mr-2 size-4 border bg-[#32CD32]" aria-hidden="true" /><span className="text-sm font-medium">In ufficio</span></div>
        </div>
      </section>

    </div>
  )
}
