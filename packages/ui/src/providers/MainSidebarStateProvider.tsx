import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react'

interface ISidebarState {
  sidebarExpanded: boolean
  toggleSidebar: () => void
}

const SidebarStateContext = createContext<ISidebarState | undefined>(undefined)

export function MainSidebarStateProvider({
  children
}: {
  children: React.ReactNode
}) {
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    if (window.innerWidth <= 1000) return false
    try {
      return localStorage.getItem('monolith.sidebar') !== 'collapsed'
    } catch {
      return true
    }
  })

  const toggleSidebar = useCallback(() => {
    setSidebarExpanded(prev => !prev)
  }, [])
  useEffect(() => {
    const media = window.matchMedia('(max-width: 1000px)')
    const update = () => {
      if (media.matches) setSidebarExpanded(false)
      else {
        try {
          setSidebarExpanded(
            localStorage.getItem('monolith.sidebar') !== 'collapsed'
          )
        } catch {
          setSidebarExpanded(true)
        }
      }
    }
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (window.innerWidth > 1000) {
      try {
        localStorage.setItem(
          'monolith.sidebar',
          sidebarExpanded ? 'expanded' : 'collapsed'
        )
      } catch {
        /* Preferences are optional. */
      }
    }
  }, [sidebarExpanded])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key === '\\' &&
        !event.defaultPrevented &&
        !event.isComposing
      ) {
        event.preventDefault()
        toggleSidebar()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggleSidebar])
  const memoizedValue = useMemo(
    () => ({
      sidebarExpanded,
      toggleSidebar
    }),
    [sidebarExpanded, toggleSidebar]
  )

  return (
    <SidebarStateContext value={memoizedValue}>{children}</SidebarStateContext>
  )
}

export function useMainSidebarState(): ISidebarState {
  const context = useContext(SidebarStateContext)

  return (
    context || {
      sidebarExpanded: true,
      toggleSidebar: () => {}
    }
  )
}
