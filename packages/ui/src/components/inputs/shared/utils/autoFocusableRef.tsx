// SPDX-License-Identifier: 0BSD
import type { RefCallback, RefObject } from 'react'

export function autoFocusableRef<T>(
  enabled: boolean,
  target?: RefObject<T | null>,
  onFocus?: (element: NonNullable<T>) => void
): RefCallback<T> {
  return element => {
    if (target) target.current = element
    if (!enabled || element == null) return
    onFocus?.(element)
    if (typeof element === 'object' && 'focus' in element) {
      const focus = element.focus
      if (typeof focus === 'function') focus.call(element)
    }
  }
}
