'use client'

import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'

export default function AccountPage() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [errorField, setErrorField] = useState<string | null>(null)
  return <section className="mx-auto max-w-lg border-l-2 border-brand bg-card p-6 sm:p-8" aria-labelledby="account-title">
    <header className="mb-7">
      <p className="page-kicker">Sicurezza account</p>
      <h1 id="account-title" className="page-title">Cambia password</h1>
    </header>
      <form className="space-y-4" onSubmit={async event => {
        event.preventDefault()
        const form = event.currentTarget
        const values = new FormData(form)
        if (values.get('newPassword') !== values.get('confirm')) { setMessage('Le nuove password non coincidono.'); setErrorField('confirm'); form.querySelector<HTMLInputElement>('#confirm')?.focus(); return }
        setBusy(true)
        setMessage('')
        setErrorField(null)
        try {
          const result = await authClient.changePassword({
            currentPassword: String(values.get('currentPassword')),
            newPassword: String(values.get('newPassword')),
            revokeOtherSessions: true,
          })
          if (result.error) { setMessage('Cambio non riuscito. Controlla la password attuale e riprova.'); setErrorField('currentPassword'); form.querySelector<HTMLInputElement>('#currentPassword')?.focus(); }
          else { form.reset(); setMessage('Password aggiornata. Le altre sessioni sono state chiuse.'); }
        } catch { setMessage('Servizio non disponibile. Riprova.'); }
        setBusy(false)
      }}>
        <div className="space-y-2"><Label htmlFor="currentPassword">Password attuale</Label><PasswordInput id="currentPassword" name="currentPassword" visibilityLabel="password attuale" autoComplete="current-password" aria-invalid={errorField === 'currentPassword'} aria-describedby={message ? 'account-message' : undefined} required maxLength={128} /></div>
        <div className="space-y-2"><Label htmlFor="newPassword">Nuova password (almeno 12 caratteri)</Label><PasswordInput id="newPassword" name="newPassword" visibilityLabel="nuova password" autoComplete="new-password" required minLength={12} maxLength={128} /></div>
        <div className="space-y-2"><Label htmlFor="confirm">Conferma nuova password</Label><PasswordInput id="confirm" name="confirm" visibilityLabel="conferma password" autoComplete="new-password" aria-invalid={errorField === 'confirm'} aria-describedby={message ? 'account-message' : undefined} required minLength={12} maxLength={128} /></div>
        <p id="account-message" role="status" className="text-base">{message}</p>
        <Button className="w-full sm:w-auto" disabled={busy}>{busy ? 'Salvataggio…' : 'Aggiorna password'}</Button>
      </form>
  </section>
}
