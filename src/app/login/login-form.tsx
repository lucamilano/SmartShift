'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="login-title">
        <header className="mb-7">
          <p className="page-kicker">Pianificazione del lavoro</p>
          <h1 id="login-title" className="page-title">Bentornato in SmartShift</h1>
        </header>
          <form className="space-y-5" onSubmit={async event => {
            event.preventDefault()
            setBusy(true)
            setError('')
            const form = new FormData(event.currentTarget)
            try {
              const result = await authClient.signIn.email({
                email: String(form.get('email')).trim().toLowerCase(), password: String(form.get('password')),
              })
              if (result.error) {
                setError(result.error.status === 429 ? 'Troppi tentativi. Attendi un minuto e riprova.' : 'Email o password non corrette.')
              } else {
                const status = await fetch('/api/account-status', { cache: 'no-store' })
                if (status.ok) {
                  if (status.status === 200 && (await status.json()).status === 'password-change-required') router.replace('/primo-accesso')
                  else router.replace('/dashboard')
                  router.refresh()
                  return
                }
                if (status.status === 410) {
                  await authClient.signOut()
                  setError('La password temporanea è scaduta. Chiedi all’amministratore di reinviare l’invito.')
                  setBusy(false)
                  return
                }
                await authClient.signOut()
                setError('Account non disponibile. Contatta l’amministratore.')
              }
            } catch { setError('Accesso non riuscito. Riprova tra poco.') }
            setBusy(false)
          }}>
            <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" autoComplete="username" required maxLength={254} /></div>
            <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" autoComplete="current-password" required maxLength={128} /></div>
            {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <Button className="w-full" disabled={busy}>{busy ? 'Accesso in corso…' : 'Accedi'}</Button>
            <p className="text-xs text-muted-foreground">Se hai dimenticato la password, contatta l’amministratore per ripristinare l’accesso.</p>
          </form>
      </section>
    </main>
  )
}
