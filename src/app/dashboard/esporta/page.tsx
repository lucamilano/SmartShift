'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { FileSpreadsheet, Download } from 'lucide-react'

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
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 mb-8 transition-colors">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center">
          <FileSpreadsheet className="mr-3 text-emerald-600 dark:text-emerald-500 h-8 w-8" />
          Esportazione Dati Mensili
        </h1>
        <p className="text-gray-500 dark:text-slate-400 mt-2 text-lg">
          Genera il foglio presenze formattato con i colori e i giorni lavorativi per tutto il team.
        </p>
      </div>

      <Card className="shadow-sm border-gray-200 dark:border-slate-800 dark:bg-[#111827]">
        <CardHeader className="bg-gray-50/50 dark:bg-slate-900/50 border-b dark:border-slate-800">
          <CardTitle className="text-xl dark:text-white">Seleziona il Periodo di Esportazione</CardTitle>
          <CardDescription className="dark:text-slate-400">
            Scegli mese e anno. Verrà generato un file Excel contenente dal lunedì al venerdì.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Mese</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-12 text-base">
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
              <Label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Anno</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-12 text-base">
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

          <div className="pt-6 border-t flex justify-end">
            <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
              <a href={downloadUrl} download>
                <Download className="mr-2 h-5 w-5" />
                Scarica File Excel
              </a>
            </Button>
          </div>
          
        </CardContent>
      </Card>
      
      {/* Anteprima Legenda */}
      <div className="border border-dashed border-gray-300 dark:border-slate-700 rounded-xl p-6 bg-white dark:bg-[#111827] opacity-70">
        <h3 className="text-sm font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-4 border-b dark:border-slate-800 pb-2">
          Anteprima Legenda Colori
        </h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center"><div className="w-4 h-4 rounded-sm bg-[#4A86E8] border border-gray-400 dark:border-slate-600 mr-2"></div><span className="text-sm text-gray-700 dark:text-slate-300 font-medium">Smartworking</span></div>
          <div className="flex items-center"><div className="w-4 h-4 rounded-sm bg-[#FFFF00] border border-gray-400 dark:border-slate-600 mr-2"></div><span className="text-sm text-gray-700 dark:text-slate-300 font-medium">Ferie</span></div>
          <div className="flex items-center"><div className="w-4 h-4 rounded-sm bg-[#FF0000] border border-gray-400 dark:border-slate-600 mr-2"></div><span className="text-sm text-gray-700 dark:text-slate-300 font-medium">Malattia</span></div>
          <div className="flex items-center"><div className="w-4 h-4 rounded-sm bg-[#32CD32] border border-gray-400 dark:border-slate-600 mr-2"></div><span className="text-sm text-gray-700 dark:text-slate-300 font-medium">In Ufficio</span></div>
        </div>
      </div>

    </div>
  )
}
