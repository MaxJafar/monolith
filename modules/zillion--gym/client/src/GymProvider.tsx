import { useQuery, useQueryClient } from '@tanstack/react-query'
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'

import { useAuth } from '@lifeforge/api'
import { useModuleTranslation } from '@lifeforge/localization'

import { forgeAPI } from '@/manifest'

import type { GymSnapshot } from '../../shared'
import { GymContext } from './GymContext'
import {
  type GymSection,
  gymSection,
  gymSectionParams
} from './utils/navigation'
import { pushEndpointHash, readGymSubscription } from './utils/notifications'
import {
  OFFLINE_OWNER_KEY,
  clearOfflineSnapshot,
  hasOfflineDraftConflict,
  offlineDraftKey,
  offlineLabels,
  readOfflineDraft,
  writeOfflineSnapshot
} from './utils/offline'
import {
  type WorkoutRecovery,
  browserRecoveryStorage,
  readRecovery,
  removeRecovery,
  writeRecovery
} from './utils/recovery'
import { dueWorkoutReminder, reminderSlotKey } from './utils/reminders'

export type GymState = {
  data: GymSnapshot | undefined
  ownerId: string | null
  offline: boolean
  recovery: WorkoutRecovery | null
  saveRecovery: (value: WorkoutRecovery) => void
  clearRecovery: () => void
  loading: boolean
  pending: boolean
  error: string | null
  run: (operation: () => Promise<unknown>) => Promise<boolean>
  refresh: () => void
  section: GymSection
  navigate: (section: string, extras?: Record<string, string>) => void
}

export function GymProvider({ children }: { children: ReactNode }) {
  const { userData } = useAuth()
  const { t } = useModuleTranslation()

  const ownerId = userData?.id ?? null

  const [offline, setOffline] = useState(() => !navigator.onLine)

  const [recovery, setRecovery] = useState<WorkoutRecovery | null>(() =>
    ownerId
      ? (readOfflineDraft(browserRecoveryStorage(), ownerId) ??
        readRecovery(browserRecoveryStorage(), ownerId))
      : null
  )

  const [storageError, setStorageError] = useState(false)

  const [offlineConflict, setOfflineConflict] = useState(() =>
    ownerId ? hasOfflineDraftConflict(browserRecoveryStorage(), ownerId) : false
  )

  const adoptedOfflineId = useRef(
    ownerId
      ? (readOfflineDraft(browserRecoveryStorage(), ownerId)?.draft.id ?? null)
      : null
  )

  useEffect(() => {
    setRecovery(
      ownerId
        ? (readOfflineDraft(browserRecoveryStorage(), ownerId) ??
            readRecovery(browserRecoveryStorage(), ownerId))
        : null
    )
    setOfflineConflict(
      ownerId
        ? hasOfflineDraftConflict(browserRecoveryStorage(), ownerId)
        : false
    )
  }, [ownerId])
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)

    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  const saveRecovery = useCallback(
    (value: WorkoutRecovery) => {
      if (!ownerId) return
      setRecovery(value)
      const storage = browserRecoveryStorage()
      const saved = writeRecovery(storage, ownerId, value)

      if (saved && adoptedOfflineId.current === value.draft.id) {
        try {
          storage?.removeItem(offlineDraftKey(ownerId))
          adoptedOfflineId.current = null
        } catch {
          /* Keep a recoverable offline copy. */
        }
      }
      setOfflineConflict(hasOfflineDraftConflict(storage, ownerId))
      setStorageError(!saved)
    },
    [ownerId]
  )
  const clearRecovery = useCallback(() => {
    if (!ownerId) return
    if (removeRecovery(browserRecoveryStorage(), ownerId)) {
      try {
        browserRecoveryStorage()?.removeItem(offlineDraftKey(ownerId))
      } catch {
        /* Report through retained recovery on the next mount. */
      }
      setRecovery(null)
      setOfflineConflict(false)
      setStorageError(false)
    } else setStorageError(true)
  }, [ownerId])

  const mountedAt = useRef(Date.now())

  const query = useQuery(
    forgeAPI.snapshot.queryOptions({
      queryKey: [...forgeAPI.snapshot.key, ownerId],
      enabled: !!ownerId,
      staleTime: 0,
      refetchOnWindowFocus: true
    })
  )
  const data =
    ownerId && query.dataUpdatedAt >= mountedAt.current ? query.data : undefined

  useEffect(() => {
    const storage = browserRecoveryStorage()

    if (!ownerId) return

    try {
      const cachedOwner = storage?.getItem(OFFLINE_OWNER_KEY)

      if (cachedOwner && cachedOwner !== ownerId) clearOfflineSnapshot(storage)
    } catch {
      /* Optional offline storage never blocks authenticated training. */
    }
    if (data)
      writeOfflineSnapshot(
        storage,
        ownerId,
        userData?.name ?? userData?.username ?? '',
        data,
        offlineLabels(t)
      )
  }, [data, ownerId, userData?.name, userData?.username, t])

  const cache = useQueryClient()

  const pushQuery = useQuery(
    forgeAPI.pushStatus.queryOptions({
      queryKey: [...forgeAPI.pushStatus.key, ownerId],
      enabled: !!ownerId,
      staleTime: 30000
    })
  )

  const [params, setParams] = useSearchParams()
  const [pending, setPending] = useState(false)
  const [actionError, setError] = useState<string | null>(null)
  const locked = useRef(false)
  const reminderSeen = useRef(new Set<string>())

  useEffect(() => {
    if (!data || !ownerId) return
    let cancelled = false

    const tick = async () => {
      if (
        document.visibilityState !== 'visible' ||
        !('Notification' in window) ||
        Notification.permission !== 'granted'
      )
        return

      const reminder = dueWorkoutReminder(data, new Date())

      if (!reminder) return

      // A confirmed subscription handles the same planned slot in the background.
      const push = pushQuery.data?.owner_id === ownerId ? pushQuery.data : null

      if (push?.configured) {
        try {
          const subscription = await readGymSubscription()
          const hash = subscription
            ? await pushEndpointHash(subscription.endpoint)
            : null

          if (
            push.subscriptions.some(
              item => item.endpoint_hash === hash && item.preferences.planned
            )
          )
            return
        } catch {
          /* Foreground reminders remain available if push capability fails. */
        }
      }
      if (cancelled) return

      const key = reminderSlotKey(ownerId, reminder)

      if (reminderSeen.current.has(key)) return

      const local = browserRecoveryStorage()

      try {
        if (local?.getItem(key)) return
      } catch {
        /* A session marker still avoids repeated notifications when storage is unavailable. */
      }

      try {
        const notification = new Notification(t('settings.notificationTitle'), {
          body: t('settings.plannedReminder', { name: reminder.routine_name }),
          tag: key
        })
        notification.onclick = () => {
          window.focus()
          setParams({ section: 'workout' })
        }
        reminderSeen.current.add(key)

        try {
          local?.setItem(key, '1')
        } catch {
          /* Keep the in-memory marker. */
        }
      } catch {
        /* The browser may revoke notification permission while this workspace is open. */
      }
    }
    const check = () => {
      void tick()
    }
    check()
    const interval = window.setInterval(check, 30000)
    document.addEventListener('visibilitychange', check)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', check)
    }
  }, [data, ownerId, t, setParams, pushQuery.data])

  const run = useCallback(
    async (operation: () => Promise<unknown>) => {
      if (locked.current) return false
      locked.current = true
      setPending(true)
      setError(null)

      try {
        await operation()
        await cache.invalidateQueries({ queryKey: forgeAPI.key })

        return true
      } catch (error) {
        setError(error instanceof Error ? error.message : String(error))
        await cache.invalidateQueries({ queryKey: forgeAPI.snapshot.key })

        return false
      } finally {
        locked.current = false
        setPending(false)
      }
    },
    [cache]
  )

  const refresh = useCallback(() => {
    setError(null)
    void query.refetch()
  }, [query.refetch])

  const navigate = useCallback(
    (section: string, extras: Record<string, string> = {}) => {
      setParams(gymSectionParams(section, extras))
    },
    [setParams]
  )

  return (
    <GymContext
      value={{
        data,
        loading: !data && !query.error,
        pending,
        ownerId,
        offline,
        recovery,
        saveRecovery,
        clearRecovery,
        error:
          actionError ??
          query.error?.message ??
          (storageError
            ? t('workout.storageUnavailable')
            : offlineConflict
              ? t('offline.draftConflict')
              : null),
        run,
        refresh,
        section: gymSection(params.get('section')),
        navigate
      }}
    >
      {children}
    </GymContext>
  )
}
