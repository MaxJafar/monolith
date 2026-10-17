import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react'
import { useLocation, useNavigate } from 'react-router'

import { getNativeRuntime, useAuth } from '@monolith/api'

export type WorkspaceTab = {
  id: string
  href: string
  title: string
  icon: string
}

type TabState = { tabs: WorkspaceTab[]; active: string }

const Context = createContext<ReturnType<typeof useTabState> | null>(null)
const validHref = (href: unknown): href is string =>
  typeof href === 'string' && /^\/(?!\/)/.test(href) && !href.includes('\\')

function useTabState() {
  const { userData } = useAuth()

  const location = useLocation(),
    navigate = useNavigate()
  const href = location.pathname + location.search + location.hash
  const storageKey = `monolith:tabs:${getNativeRuntime()?.profile.serverId ?? window.location.origin}:${userData?.id}`
  const [state, setState] = useState<TabState>(() => {
    try {
      const saved = JSON.parse(
        sessionStorage.getItem(storageKey) ?? 'null'
      ) as TabState | null

      if (
        saved &&
        Array.isArray(saved.tabs) &&
        saved.tabs.length &&
        saved.tabs.length <= 30 &&
        saved.tabs.every(
          tab =>
            typeof tab.id === 'string' &&
            validHref(tab.href) &&
            typeof tab.title === 'string' &&
            typeof tab.icon === 'string'
        ) &&
        saved.tabs.some(tab => tab.id === saved.active)
      )
        return saved
    } catch {
      /* A fresh tab remains usable when session storage is unavailable. */
    }

    const id = crypto.randomUUID()

    return {
      tabs: [{ id, href, title: '', icon: 'lucide:file-text' }],
      active: id
    }
  })
  const pending = useRef<{ id: string; href: string; close?: string } | null>(
    null
  )
  // Keep the selected tab in the same painted frame as its committed route.
  // A passive effect leaves a brief interval where closing targets the old tab.
  useLayoutEffect(() => {
    const destination = pending.current?.href === href ? pending.current : null
    pending.current = null
    setState(current => {
      const id = destination?.id ?? current.active

      let tabs = current.tabs.filter(tab => tab.id !== destination?.close)
      if (!tabs.some(tab => tab.id === id))
        tabs = [...tabs, { id, href, title: '', icon: 'lucide:file-text' }]

      return {
        active: id,
        tabs: tabs.map(tab =>
          tab.id === id && tab.href !== href
            ? { ...tab, href, title: '', icon: 'lucide:file-text' }
            : tab
        )
      }
    })
  }, [location.key, href])
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(state))
    } catch {
      /* Private browsing may disable persistence. */
    }
  }, [state, storageKey])
  const select = (id: string) => {
    const tab = state.tabs.find(tab => tab.id === id)

    if (!tab) return
    pending.current = { id, href: tab.href }
    void navigate(tab.href)
  }
  const open = (target: string) => {
    if (!validHref(target)) return

    if (state.tabs.length >= 30) {
      const existing = state.tabs.find(tab => tab.href === target)

      if (existing) select(existing.id)

      return
    }
    pending.current = { id: crypto.randomUUID(), href: target }
    void navigate(target)
  }
  const close = (id: string) => {
    if (state.tabs.length === 1) return

    if (id !== state.active) {
      setState(current => ({
        ...current,
        tabs: current.tabs.filter(tab => tab.id !== id)
      }))

      return
    }

    const index = state.tabs.findIndex(tab => tab.id === id)
    const next = state.tabs[index + 1] ?? state.tabs[index - 1]

    if (next) {
      pending.current = { id: next.id, href: next.href, close: id }
      void navigate(next.href)
    }
  }
  const describe = useCallback(
    (title: string, icon: string) =>
      setState(current => {
        const tab = current.tabs.find(tab => tab.id === current.active)

        if (
          !tab ||
          tab.href !== href ||
          (tab.title === title && tab.icon === icon)
        )
          return current

        return {
          ...current,
          tabs: current.tabs.map(tab =>
            tab.id === current.active ? { ...tab, title, icon } : tab
          )
        }
      }),
    [href]
  )

  return { ...state, select, open, close, describe }
}

function TabSession({ children }: { children: ReactNode }) {
  const value = useTabState()

  return <Context value={value}>{children}</Context>
}

export function WorkspaceTabsProvider({ children }: { children: ReactNode }) {
  const { userData } = useAuth()

  return (
    <TabSession
      key={`${getNativeRuntime()?.profile.serverId ?? window.location.origin}:${userData?.id}`}
    >
      {children}
    </TabSession>
  )
}

export function useWorkspaceTabs() {
  const value = useContext(Context)

  if (!value) throw Error('Workspace tabs provider missing')

  return value
}
