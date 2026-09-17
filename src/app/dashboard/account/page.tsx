'use client'

import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function AccountPage() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  return <section className="mx-auto max-w-md" aria-labelledby="account-title">
    <header className="mb-6 border-b pb-4">
      <h1 id="account-title" className="text-2xl font-semibold">Cambia password</h1>
    </header>
      <form className="space-y-4" onSubmit={async event => {
        event.preventDefault()
        const form = event.currentTarget
        const values = new FormData(form)
        if (values.get('newPassword') !== values.get('confirm')) { setMessage('Le nuove password non coincidono.'); return }
        setBusy(true)
        setMessage('')
        try {
          const result = await authClient.changePassword({
            currentPassword: String(values.get('currentPassword')),
            newPassword: String(values.get('newPassword')),
            revokeOtherSessions: true,
          })
          if (result.error) { setMessage('Cambio non riuscito. Controlla la password attuale e riprova.'); }
          else { form.reset(); setMessage('Password aggiornata. Le altre sessioni sono state chiuse.'); }
        } catch { setMessage('Servizio non disponibile. Riprova.'); }
        setBusy(false)
      }}>
        <div className="space-y-2"><Label htmlFor="currentPassword">Password attuale</Label><Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required maxLength={128} /></div>
        <div className="space-y-2"><Label htmlFor="newPassword">Nuova password (almeno 12 caratteri)</Label><Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /></div>
        <div className="space-y-2"><Label htmlFor="confirm">Conferma nuova password</Label><Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /></div>
        <p role="status" className="text-sm">{message}</p>
        <Button disabled={busy}>{busy ? 'Salvataggio…' : 'Aggiorna password'}</Button>
      </form>
  </section>
}
