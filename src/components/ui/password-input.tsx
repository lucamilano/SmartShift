'use client'

import { useState, type ComponentProps } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from './input'
import { Button } from './button'
import { cn } from '@/lib/utils'

export function PasswordInput({ className, visibilityLabel = 'password', ...props }: Omit<ComponentProps<typeof Input>, 'type'> & { visibilityLabel?: string }) {
  const [visible, setVisible] = useState(false)
  return <div className="relative min-w-0">
    <Input {...props} type={visible ? 'text' : 'password'} className={cn('pr-14', className)} />
    <Button type="button" variant="ghost" size="icon" disabled={props.disabled} className="absolute right-0 top-0 h-full min-h-11 rounded-l-none" aria-controls={props.id} aria-pressed={visible} aria-label={`${visible ? 'Nascondi' : 'Mostra'} ${visibilityLabel}`} onClick={() => setVisible(value => !value)}>
      {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
    </Button>
  </div>
}
