'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'

export default function FirstAccessForm({ email, expired }: { email: string; expired: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [errorField, setErrorField] = useState<string | null>(null)
  async function logout() {
    setBusy(true)
    setMessage('')
    try {
      const result = await authClient.signOut()
      if (result.error) throw new Error('Logout failed')
      router.replace('/login'); router.refresh()
    } catch { setMessage('Impossibile uscire. Riprova.') }
    finally { setBusy(false) }
  }
  return <main id="main-content" tabIndex={-1} className="auth-shell mobile-readable">
    <section className="auth-panel" aria-labelledby="first-access-title">
      <header className="mb-7">
        <p className="page-kicker">Prima configurazione</p>
        <h1 id="first-access-title" className="page-title">Completa il primo accesso</h1>
        <p className="mt-2 break-all text-base text-muted-foreground">{email}</p>
      </header>
        {expired ? <div className="space-y-4">
          <p role="alert" className="text-base text-red-800 dark:text-red-200">La password temporanea è scaduta. Chiedi all’amministratore di reinviare l’invito.</p>
          {message && <p role="alert" className="text-base text-red-800 dark:text-red-200">{message}</p>}
          <Button className="w-full" disabled={busy} onClick={logout}>{busy ? 'Uscita…' : 'Torna al login'}</Button>
        </div> : <form className="space-y-4" onSubmit={async event => {
          event.preventDefault()
          const form = event.currentTarget
          const values = new FormData(form)
          const currentPassword = String(values.get('currentPassword'))
          const newPassword = String(values.get('newPassword'))
          if (newPassword !== values.get('confirm')) { setMessage('Le nuove password non coincidono.'); setErrorField('confirm'); form.querySelector<HTMLInputElement>('#confirm')?.focus(); return }
          if (newPassword === currentPassword) { setMessage('Scegli una password diversa da quella temporanea.'); setErrorField('newPassword'); form.querySelector<HTMLInputElement>('#newPassword')?.focus(); return }
          setBusy(true); setMessage('')
          setErrorField(null)
          try {
            const response = await fetch('/api/complete-first-access', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword }) })
            if (response.ok) { form.reset(); router.replace('/dashboard'); router.refresh(); return }
            const result = await response.json().catch(() => null)
            setMessage(result?.error || 'Cambio password non riuscito.')
          } catch { setMessage('Servizio non disponibile. Riprova.') }
          finally { setBusy(false) }
        }}>
          <p className="text-sm text-muted-foreground">Per proteggere l’account devi sostituire la password temporanea prima di usare SmartShift.</p>
          <div className="space-y-2"><Label htmlFor="currentPassword">Password temporanea</Label><PasswordInput id="currentPassword" name="currentPassword" visibilityLabel="password temporanea" autoComplete="current-password" required maxLength={128} /></div>
          <div className="space-y-2"><Label htmlFor="newPassword">Nuova password (almeno 12 caratteri)</Label><PasswordInput id="newPassword" name="newPassword" visibilityLabel="nuova password" autoComplete="new-password" aria-invalid={errorField === 'newPassword'} aria-describedby={message ? 'first-access-message' : undefined} required minLength={12} maxLength={128} /></div>
          <div className="space-y-2"><Label htmlFor="confirm">Conferma nuova password</Label><PasswordInput id="confirm" name="confirm" visibilityLabel="conferma password" autoComplete="new-password" aria-invalid={errorField === 'confirm'} aria-describedby={message ? 'first-access-message' : undefined} required minLength={12} maxLength={128} /></div>
          {message && <p id="first-access-message" role="alert" className="text-base text-red-800 dark:text-red-200">{message}</p>}
          <Button className="w-full" disabled={busy}>{busy ? 'Salvataggio…' : 'Imposta nuova password'}</Button>
        </form>}
    </section>
  </main>
}
