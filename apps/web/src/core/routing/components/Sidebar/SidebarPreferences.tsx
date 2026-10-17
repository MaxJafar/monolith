import {
  type ReactNode,
  createContext,
  useContext,
  useRef,
  useState
} from 'react'

import { useAuth } from '@monolith/api'

import { useWorkspace } from '@/core/workspaces/WorkspaceProvider'

import { type SystemArea, systemOrder } from './systemAreas'

export type SidebarPreferences = {
  width: number
  compact: boolean
  hiddenAreas: string[]
  areaOrder: SystemArea[]
  widgets: { id: string; collapsed: boolean; filter: string }[]
}

const defaults: SidebarPreferences = {
  width: 264,
  compact: false,
  hiddenAreas: [],
  areaOrder: systemOrder(null),
  widgets: []
}

export function parseSidebarPreferences(value: unknown): SidebarPreferences {
  if (!value || typeof value !== 'object') return defaults

  const data = value as Record<string, unknown>
  const widgets: unknown[] = Array.isArray(data.widgets) ? data.widgets : []

  return {
    width:
      typeof data.width === 'number' && Number.isFinite(data.width)
        ? Math.round(Math.min(420, Math.max(220, data.width)))
        : 264,
    compact: data.compact === true,
    areaOrder: systemOrder(data.areaOrder),
    hiddenAreas: Array.isArray(data.hiddenAreas)
      ? data.hiddenAreas
          .filter((id): id is string => typeof id === 'string')
          .slice(0, 7)
      : [],
    widgets: widgets
      .filter(
        (item): item is { id: string; collapsed?: unknown; filter?: unknown } =>
          !!item &&
          typeof item === 'object' &&
          'id' in item &&
          typeof item.id === 'string' &&
          item.id.length > 0 &&
          item.id.length < 100
      )
      .filter(
        (item, index, all) =>
          all.findIndex(other => other.id === item.id) === index
      )
      .slice(0, 8)
      .map(item => ({
        id: item.id,
        collapsed: item.collapsed === true,
        filter:
          typeof item.filter === 'string' ? item.filter.slice(0, 2000) : ''
      }))
  }
}

type State = {
  preferences: SidebarPreferences
  update: (patch: Partial<SidebarPreferences>) => void
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
                    widgets: [
                      'rpgProfile',
                      'habitTracker',
                      'calendarWidget'
                    ].map(id => ({
                      id,
                      collapsed: id === 'calendarWidget',
                      filter: ''
                    }))
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

  function update(patch: Partial<SidebarPreferences>) {
    const next = parseSidebarPreferences({ ...current.current, ...patch })
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
