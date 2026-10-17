import { useSyncExternalStore } from 'react'

export type PageOpenMode = 'side' | 'overlay' | 'full'
const key = 'monolith.page-open-mode'
const event = 'monolith:page-open-mode'
function read(): PageOpenMode {
  try {
    const value = localStorage.getItem(key)
    return value === 'overlay' || value === 'full' ? value : 'side'
  } catch {
    return 'side'
  }
}
function subscribe(listener: () => void) {
  window.addEventListener('storage', listener)
  window.addEventListener(event, listener)
  return () => {
    window.removeEventListener('storage', listener)
    window.removeEventListener(event, listener)
  }
}
export function usePageOpenPreference() {
  const mode = useSyncExternalStore(subscribe, read, () => 'side' as const)
  return [
    mode,
    (value: PageOpenMode) => {
      localStorage.setItem(key, value)
      window.dispatchEvent(new Event(event))
    }
  ] as const
}
