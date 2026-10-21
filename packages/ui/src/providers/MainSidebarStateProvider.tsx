// SPDX-License-Identifier: 0BSD
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore
} from 'react'

const storageKey = 'monolith.sidebar'
function readDesktopPreference() {
  try {
    return localStorage.getItem(storageKey) !== 'collapsed'
  } catch {
    return true
  }
}
function compactViewport() {
  return typeof window !== 'undefined' && window.innerWidth <= 1000
}
function watchViewport(notify: () => void) {
  window.addEventListener('resize', notify)
  return () => window.removeEventListener('resize', notify)
}
const MainSidebar = createContext({
  sidebarExpanded: true,
  toggleSidebar: () => {}
})
export function MainSidebarStateProvider({
  children
}: {
  children: ReactNode
}) {
  const compact = useSyncExternalStore(
    watchViewport,
    compactViewport,
    () => false
  )
  const [desktopExpanded, setDesktopExpanded] = useState(readDesktopPreference)
  const [mobileExpanded, setMobileExpanded] = useState(false)
  const toggleSidebar = useCallback(() => {
    if (compact) setMobileExpanded(current => !current)
    else setDesktopExpanded(current => !current)
  }, [compact])
  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey,
        desktopExpanded ? 'expanded' : 'collapsed'
      )
    } catch {
      /* Optional device setting. */
    }
  }, [desktopExpanded])
  useEffect(() => {
    setMobileExpanded(false)
  }, [compact])
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        !(event.ctrlKey || event.metaKey) ||
        event.key !== '\\'
      )
        return
      event.preventDefault()
      toggleSidebar()
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [toggleSidebar])
  const state = useMemo(
    () => ({
      sidebarExpanded: compact ? mobileExpanded : desktopExpanded,
      toggleSidebar
    }),
    [compact, mobileExpanded, desktopExpanded, toggleSidebar]
  )
  return <MainSidebar value={state}>{children}</MainSidebar>
}
export function useMainSidebarState() {
  return useContext(MainSidebar)
}
