'use client'

import { useSyncExternalStore, type CSSProperties } from 'react'

function subscribe(callback: () => void) {
  const viewport = window.visualViewport
  let frame = 0
  const resize = () => {
    callback()
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      const active = document.activeElement
      if (active instanceof HTMLElement && active.matches('input, textarea, [role="combobox"]') && active.closest('.app-dialog')) active.scrollIntoView({ block: 'nearest' })
    })
  }
  viewport?.addEventListener('resize', resize)
  viewport?.addEventListener('scroll', callback)
  window.addEventListener('resize', resize)
  return () => {
    viewport?.removeEventListener('resize', resize)
    viewport?.removeEventListener('scroll', callback)
    window.removeEventListener('resize', resize)
    cancelAnimationFrame(frame)
  }
}

function snapshot() {
  const viewport = window.visualViewport
  return `${viewport?.height ?? window.innerHeight}:${viewport?.offsetTop ?? 0}`
}

// The visual viewport also shrinks when the on-screen keyboard opens.
export function useViewportStyle(): CSSProperties & { '--overlay-height'?: string; '--overlay-top'?: string } {
  const value = useSyncExternalStore(subscribe, snapshot, () => '')
  if (!value) return {}
  const [height, top] = value.split(':')
  return { '--overlay-height': `${height}px`, '--overlay-top': `${top}px` }
}
