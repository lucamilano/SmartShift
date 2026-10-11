'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <main id="main-content" tabIndex={-1} className="auth-shell mobile-readable">
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
                setError(result.error.status === 429
                  ? 'Troppi tentativi. Attendi un minuto e riprova.'
                  : result.error.status === 403
                    ? 'Indirizzo locale non autorizzato. Apri SmartShift da http://127.0.0.1:3000 e riprova.'
                    : 'Email o password non corrette.')
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
            <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" inputMode="email" autoCapitalize="none" autoComplete="username" aria-describedby={error ? 'login-error' : undefined} required maxLength={254} /></div>
            <div className="space-y-2"><Label htmlFor="password">Password</Label><PasswordInput id="password" name="password" autoComplete="current-password" aria-describedby={error ? 'login-error' : undefined} required maxLength={128} /></div>
            {error && <p id="login-error" role="alert" className="text-base text-red-800 dark:text-red-200">{error}</p>}
            <Button className="w-full" disabled={busy}>{busy ? 'Accesso in corso…' : 'Accedi'}</Button>
            <p className="text-xs text-muted-foreground">Se hai dimenticato la password, contatta l’amministratore per ripristinare l’accesso.</p>
          </form>
      </section>
    </main>
  )
}
