'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function FirstAccessForm({ email, expired }: { email: string; expired: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function logout() { await authClient.signOut(); router.replace('/login'); router.refresh() }
  return <main className="flex min-h-screen items-center justify-center px-5 py-10">
    <section className="w-full max-w-sm" aria-labelledby="first-access-title">
      <header className="mb-7">
        <h1 id="first-access-title" className="text-xl font-semibold">Completa il primo accesso</h1>
        <p className="mt-2 text-sm text-muted-foreground">{email}</p>
      </header>
        {expired ? <div className="space-y-4">
          <p className="text-sm text-red-600 dark:text-red-400">La password temporanea è scaduta. Chiedi all’amministratore di reinviare l’invito.</p>
          <Button className="w-full" onClick={logout}>Torna al login</Button>
        </div> : <form className="space-y-4" onSubmit={async event => {
          event.preventDefault()
          const form = event.currentTarget
          const values = new FormData(form)
          const currentPassword = String(values.get('currentPassword'))
          const newPassword = String(values.get('newPassword'))
          if (newPassword !== values.get('confirm')) { setMessage('Le nuove password non coincidono.'); return }
          if (newPassword === currentPassword) { setMessage('Scegli una password diversa da quella temporanea.'); return }
          setBusy(true); setMessage('')
          const response = await fetch('/api/complete-first-access', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword }) })
          if (response.ok) { form.reset(); router.replace('/dashboard'); router.refresh(); return }
          const result = await response.json().catch(() => null)
          setMessage(result?.error || 'Cambio password non riuscito.'); setBusy(false)
        }}>
          <p className="text-sm text-muted-foreground">Per proteggere l’account devi sostituire la password temporanea prima di usare SmartShift.</p>
          <div className="space-y-2"><Label htmlFor="currentPassword">Password temporanea</Label><Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required maxLength={128} /></div>
          <div className="space-y-2"><Label htmlFor="newPassword">Nuova password (almeno 12 caratteri)</Label><Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /></div>
          <div className="space-y-2"><Label htmlFor="confirm">Conferma nuova password</Label><Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /></div>
          {message && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{message}</p>}
          <Button className="w-full" disabled={busy}>{busy ? 'Salvataggio…' : 'Imposta nuova password'}</Button>
        </form>}
    </section>
  </main>
}
