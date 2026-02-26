'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { loginWithMagicLink } from './actions'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('idle')

    const res = await loginWithMagicLink(email)
    
    setLoading(false)
    if (res.error) {
      setErrorMessage(res.error)
      setMessage('error')
    } else {
      setMessage('success')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50/50 dark:bg-[#0B1120] p-4 transition-colors">
      <Card className="w-full max-w-md shadow-lg border-0 dark:bg-[#111827] dark:border dark:border-slate-800">
        <CardHeader className="text-center pb-8">
          <CardTitle className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">SmartShift</CardTitle>
          <CardDescription className="text-base mt-2 dark:text-slate-400">
            Inserisci la tua email lavorativa. Ti invieremo un link sicuro per accedere senza password.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 dark:text-slate-300 font-medium tracking-wide">
                Email Aziendale
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="mario.rossi@azienda.it"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="py-6 text-base dark:bg-slate-900 dark:border-slate-800 dark:placeholder-slate-500"
              />
            </div>
            
            {message === 'success' && (
              <div className="rounded-lg bg-green-50 dark:bg-green-900/30 p-4 text-sm text-green-800 dark:text-green-300 border border-green-200 dark:border-green-900 shadow-sm animate-in fade-in slide-in-from-top-2">
                ✅ Abbiamo inviato un link magico a <strong className="font-semibold">{email}</strong>. Controlla la tua posta!
              </div>
            )}
            
            {message === 'error' && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/30 p-4 text-sm text-red-800 dark:text-red-300 border border-red-200 dark:border-red-900 shadow-sm animate-in fade-in slide-in-from-top-2">
                ❌ Errore durante l'invio: {errorMessage}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full py-6 text-base font-semibold transition-all" 
              disabled={loading || message === 'success'}
            >
              {loading ? 'Invio in corso...' : 'Inviati Link di Accesso'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
