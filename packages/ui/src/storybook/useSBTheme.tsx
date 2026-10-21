// SPDX-License-Identifier: 0BSD
import { useEffect } from 'react'

/** The iframe owns this attribute; CSS handles docs and canvas without DOM polling. */
export function useSBTheme({ globals }: { globals: { theme: string } }) {
  useEffect(() => {
    const root = document.documentElement
    const prior = root.getAttribute('data-monolith-preview')
    root.setAttribute('data-monolith-preview', globals.theme)
    return () => {
      if (root.getAttribute('data-monolith-preview') !== globals.theme) return
      if (prior === null) root.removeAttribute('data-monolith-preview')
      else root.setAttribute('data-monolith-preview', prior)
    }
  }, [globals.theme])
}
