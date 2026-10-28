import {
  type ReactNode,
  createContext,
  useContext,
  useRef,
  useState
} from 'react'

import { useAuth } from '@monolith/api'

import { useWorkspace } from '@/core/workspaces/WorkspaceProvider'

import { type Favorite, migrateFavorites } from './favorites'

export type SidebarPreferences = {
  width: number
  compact: boolean
  /** Areas, pages, addons and widgets shown at the top of the sidebar. */
  favorites: Favorite[]
}

const defaults: SidebarPreferences = {
  width: 264,
  compact: false,
  favorites: migrateFavorites({})
}

export function parseSidebarPreferences(value: unknown): SidebarPreferences {
  if (!value || typeof value !== 'object') return defaults

  const data = value as Record<string, unknown>

  return {
    width:
      typeof data.width === 'number' && Number.isFinite(data.width)
        ? Math.round(Math.min(420, Math.max(220, data.width)))
        : 264,
    compact: data.compact === true,
    favorites: migrateFavorites(data)
  }
}

type Patch = Partial<SidebarPreferences>

type State = {
  preferences: SidebarPreferences
  /** A function patch reads the latest saved preferences. */
  update: (patch: Patch | ((current: SidebarPreferences) => Patch)) => void
  error: string
}

const Context = createContext<State | null>(null)

export const useSidebarPreferences = () => {
  const value = useContext(Context)

  if (!value) throw Error('Sidebar preferences provider missing')

  return value
}

function ScopedPreferences({
  storageKey,
  urpg,
  children
}: {
  storageKey: string
  urpg: boolean
  children: ReactNode
}) {
  const [preferences, setPreferences] = useState(() => {
    try {
      return parseSidebarPreferences(
        JSON.parse(
          localStorage.getItem(storageKey) ??
            JSON.stringify(
              urpg
                ? {
                    ...defaults,
                    favorites: [
                      ...defaults.favorites,
                      ...['rpgProfile', 'habitTracker', 'calendarWidget'].map(
                        id => ({
                          type: 'widget',
                          id,
                          collapsed: id === 'calendarWidget',
                          filter: ''
                        })
                      )
                    ]
                  }
                : null
            )
        )
      )
    } catch {
      return defaults
    }
  })

  const current = useRef(preferences)
  const [error, setError] = useState('')

  function update(patch: Patch | ((current: SidebarPreferences) => Patch)) {
    const next = parseSidebarPreferences({
      ...current.current,
      ...(typeof patch === 'function' ? patch(current.current) : patch)
    })
    current.current = next
    setPreferences(next)

    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
      setError('')
    } catch {
      setError('storage')
    }
  }

  return <Context value={{ preferences, update, error }}>{children}</Context>
}

export function SidebarPreferencesProvider({
  children
}: {
  children: ReactNode
}) {
  const { userData } = useAuth()
  const { active } = useWorkspace()

  const key = `monolith:sidebar-preferences:v1:${userData?.id}:${active?.id}`

  return (
    <ScopedPreferences
      key={key}
      storageKey={key}
      urpg={!!active?.enabled_modules.includes('urpg')}
    >
      {children}
    </ScopedPreferences>
  )
}
