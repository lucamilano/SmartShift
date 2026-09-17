'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'

export function LogoutButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <div>
      <Button variant="ghost" size="icon" title="Esci" aria-label="Esci" disabled={busy} onClick={async () => {
        setBusy(true)
        setError('')
        try {
          const result = await authClient.signOut()
          if (result.error) throw new Error('Logout non riuscito')
          router.replace('/login')
          router.refresh()
        } catch { setError('Riprova a uscire.'); setBusy(false) }
      }}><LogOut className="h-5 w-5" /></Button>
      {error && <span role="alert" className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
