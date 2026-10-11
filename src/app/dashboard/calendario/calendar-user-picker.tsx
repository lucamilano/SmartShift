'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Users } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type CalendarUser = {
  id: string
  email: string
  nome: string
  cognome: string
  ruolo: 'user' | 'admin'
}

function displayName(user: CalendarUser) {
  return [user.nome, user.cognome].filter(Boolean).join(' ') || user.email
}

export function CalendarUserPicker({
  users,
  selectedUserId,
  loggedUserId,
}: {
  users: CalendarUser[]
  selectedUserId: string
  loggedUserId: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <div className="calendar-user-picker w-full min-w-0 border-l-2 border-brand bg-accent/25 px-4 py-3 sm:w-80">
      <Label htmlFor="calendar-user" className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-strong dark:text-brand">
        Calendario da gestire
      </Label>
      <Select
        value={selectedUserId}
        disabled={pending}
        onValueChange={(userId) => {
          startTransition(() => {
            router.push(userId === loggedUserId
              ? '/dashboard/calendario'
              : `/dashboard/calendario?userId=${encodeURIComponent(userId)}`)
          })
        }}
      >
        <SelectTrigger id="calendar-user" className="h-auto min-h-11 w-full bg-card text-base [&_[data-slot=select-value]]:whitespace-normal [&_[data-slot=select-value]]:break-words" aria-label="Scegli il calendario da gestire">
          <Users className="size-4 text-brand" aria-hidden="true" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" align="end">
          {users.map((user) => (
            <SelectItem key={user.id} value={user.id} className="min-h-11 text-base">
              <span>{displayName(user)}{user.id === loggedUserId ? ' (tu)' : ''}</span>
              <span className="text-xs text-muted-foreground">{user.ruolo === 'admin' ? 'Admin' : 'Utente'}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="mt-2 text-base text-muted-foreground" aria-live="polite">
        {pending ? 'Apertura calendario…' : 'Puoi inserire e rimuovere turni per qualsiasi utente attivo.'}
      </p>
    </div>
  )
}
