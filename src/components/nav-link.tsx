'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function NavLink({ href, children, mobile = false }: { href: string; children: React.ReactNode; mobile?: boolean }) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(`${href}/`)
  return <Link href={href} aria-current={active ? 'page' : undefined} className={cn(
    mobile
      ? 'relative flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground transition-colors hover:text-foreground'
      : 'relative py-5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
    active && (mobile ? 'text-brand after:absolute after:bottom-0 after:h-1 after:w-8 after:bg-brand' : 'text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-warm')
  )}>{children}</Link>
}
