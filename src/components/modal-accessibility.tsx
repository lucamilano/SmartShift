'use client'

import { useEffect } from 'react'

// Radix hides background roots from screen readers. Inert also removes their
// controls from keyboard navigation while a dialog or select popup is open.
export function ModalAccessibility() {
  useEffect(() => {
    const owned = new Map<HTMLElement, boolean>()
    const synchronize = () => {
      for (const element of Array.from(document.body.children)) {
        if (!(element instanceof HTMLElement)) continue
        if (element.getAttribute('aria-hidden') === 'true') {
          if (!owned.has(element)) owned.set(element, element.inert)
          element.inert = true
        }
      }
      for (const [element, original] of owned) {
        if (!element.isConnected || element.getAttribute('aria-hidden') !== 'true') {
          element.inert = original
          owned.delete(element)
        }
      }
    }
    const observer = new MutationObserver(synchronize)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-hidden'] })
    synchronize()
    return () => {
      observer.disconnect()
      for (const [element, original] of owned) element.inert = original
    }
  }, [])
  return null
}
