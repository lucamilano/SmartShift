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

  // Anni disponibili: L'anno scorso, l'anno corrente, il prossimo anno
  const years = [
    (currentDate.getFullYear() - 1).toString(),
    currentDate.getFullYear().toString(),
    (currentDate.getFullYear() + 1).toString(),
  ]

  // Costruiamo l'URL di download in base alle selezioni
  const downloadUrl = `/api/export-excel?month=${selectedMonth}&year=${selectedYear}`

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
              <Label className="text-sm font-medium">Mese</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full">
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
              <Label className="text-sm font-medium">Anno</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-full">
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
            <Button asChild>
              <a href={downloadUrl} download>
                <Download className="mr-2 h-5 w-5" />
                Scarica file Excel
              </a>
            </Button>
          </div>
          
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
