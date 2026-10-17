import { useAuth, useSocketContext } from '@monolith/api'
import { Button, Flex, Text } from '@monolith/ui'
import { useQueryClient } from '@tanstack/react-query'
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import workspaceAPI from '@/core/utils/workspaceAPI'

type Alert = {
  workspace_id: string
  room_id: string
  message_id?: string
  seq?: number
  call_id?: string
}

const Notifications = createContext<{
  enabled: boolean
  toggle: () => Promise<void>
  error: string
} | null>(null)

export function RoomsNotificationsProvider({
  children
}: {
  children: ReactNode
}) {
  const { userData } = useAuth()

  const actor = userData?.id ?? ''

  const socket = useSocketContext()
  const cache = useQueryClient()
  const navigate = useNavigate()
  const { t } = useTranslation('common.rooms')

  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem('rooms-alerts:' + actor) === 'enabled'
    } catch {
      return false
    }
  })

  const [error, setError] = useState('')
  const [alert, setAlert] = useState<Alert | null>(null)
  const seen = useRef(new Map<string, string>())

  const open = (item: Alert) => {
    navigate(
      `/rooms?${new URLSearchParams({ workspace: item.workspace_id, room: item.room_id, ...(item.message_id ? { message: item.message_id } : {}) })}`
    )
    setAlert(null)
  }

  async function toggle() {
    setError('')

    try {
      if (
        !enabled &&
        typeof Notification !== 'undefined' &&
        Notification.permission === 'default'
      )
        await Notification.requestPermission()
      localStorage.setItem(
        'rooms-alerts:' + actor,
        enabled ? 'disabled' : 'enabled'
      )
      setEnabled(value => !value)
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error))
    }
  }
  useEffect(() => {
    let active = true

    const windows = new Set<Notification>()
    const deliver = (item: Alert, catchup = false) => {
      if (!active) return
      void cache.invalidateQueries({ queryKey: workspaceAPI.rooms.list.key })
      const key = item.call_id ?? item.message_id ?? ''

      if (!key || seen.current.get(item.room_id) === key) return
      if (!enabled) return
      seen.current.set(item.room_id, key)

      const current = new URLSearchParams(window.location.search)

      if (
        document.hasFocus() &&
        document.visibilityState === 'visible' &&
        window.location.pathname === '/rooms' &&
        current.get('room') === item.room_id &&
        !item.call_id
      )
        return
      setAlert(item)

      if (
        !catchup &&
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted' &&
        (document.visibilityState !== 'visible' || !document.hasFocus())
      ) {
        try {
          const notification = new Notification(t('title'), {
            body: t(item.call_id ? 'incomingCall' : 'newPrivateMessage'),
            tag: 'rooms:' + item.room_id
          })
          windows.add(notification)
          notification.onclose = () => windows.delete(notification)

          notification.onclick = () => {
            if (active) {
              window.focus()
              open(item)
            }
            notification.close()
          }
        } catch {
          /* In-app alerts remain available when this host lacks OS notifications. */
        }
      }
    }
    const catchup = () => {
      void workspaceAPI.rooms.notifications
        .query()
        .then(items => {
          for (const item of items.reverse()) deliver(item, true)
        })
        .catch(() => {})
    }
    socket.on('rooms:notification', deliver)
    socket.on('connect', catchup)
    catchup()

    return () => {
      active = false
      socket.off('rooms:notification', deliver)
      socket.off('connect', catchup)
      windows.forEach(notification => notification.close())
    }
  }, [socket, actor, enabled, cache, t])

  return (
    <Notifications value={{ enabled, toggle, error }}>
      {children}
      {alert && (
        <Flex
          shadow
          align="center"
          bg={{ base: 'bg-50', dark: 'bg-900' }}
          gap="sm"
          maxWidth="calc(100vw - 2rem)"
          p="md"
          position="fixed"
          r="lg"
          right="1rem"
          role="status"
          top="1rem"
          zIndex="95"
        >
          <Text size="sm">
            {t(alert.call_id ? 'incomingCall' : 'newPrivateMessage')}
          </Text>
          <Button
            namespace="common.rooms"
            variant="plain"
            onClick={() => open(alert)}
          >
            openRoom
          </Button>
          <Button
            aria-label={t('dismiss')}
            icon="lucide:x"
            variant="plain"
            onClick={() => setAlert(null)}
          />
        </Flex>
      )}
    </Notifications>
  )
}

export function useRoomsNotifications() {
  const value = useContext(Notifications)

  if (!value) throw Error('Rooms notification provider missing')

  return value
}
