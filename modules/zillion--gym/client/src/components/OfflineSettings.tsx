import { useEffect, useRef, useState } from 'react'

import { useAuth } from '@lifeforge/api'
import { useModuleTranslation } from '@lifeforge/localization'
import { Button, Card, Flex, Text } from '@lifeforge/ui'

import { useGym } from '@/GymContext'
import { registerGymWorker } from '@/utils/notifications'
import {
  clearOfflineSnapshot,
  enableOfflineSnapshot,
  offlineEnabled,
  offlineLabels,
  readOfflineSnapshot,
  writeOfflineSnapshot
} from '@/utils/offline'
import { browserRecoveryStorage } from '@/utils/recovery'

export default function OfflineSettings() {
  const { data, ownerId } = useGym()
  const { userData } = useAuth()
  const { t } = useModuleTranslation()

  const [enabled, setEnabled] = useState(() =>
    ownerId ? offlineEnabled(browserRecoveryStorage(), ownerId) : false
  )

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const cacheAllowed = useRef(true)

  useEffect(() => {
    cacheAllowed.current = true
    const signOut = () => {
      cacheAllowed.current = false
    }
    window.addEventListener('zillion-gym-sign-out', signOut)

    return () => {
      cacheAllowed.current = false
      window.removeEventListener('zillion-gym-sign-out', signOut)
    }
  }, [])

  async function enable() {
    if (!data || !ownerId) return
    setBusy(true)
    setError(false)

    try {
      const registration = await registerGymWorker()

      if (!cacheAllowed.current) return

      const storage = browserRecoveryStorage()

      if (
        !enableOfflineSnapshot(storage, ownerId) ||
        !writeOfflineSnapshot(
          storage,
          ownerId,
          userData?.name ?? userData?.username ?? '',
          data,
          offlineLabels(t)
        )
      )
        throw new Error('storage')
      registration.active?.postMessage({ type: 'GYM_OFFLINE_ENABLE' })
      setEnabled(true)
    } catch {
      if (cacheAllowed.current) {
        clearOfflineSnapshot(browserRecoveryStorage())
        setError(true)
      }
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    if (!window.confirm(t('offline.clearConfirm'))) return
    setError(!clearOfflineSnapshot(browserRecoveryStorage()))
    const registration =
      'serviceWorker' in navigator
        ? await navigator.serviceWorker.getRegistration('/gym')
        : undefined
    registration?.active?.postMessage({ type: 'GYM_OFFLINE_DISABLE' })
    setEnabled(false)
  }

  const cached = enabled ? readOfflineSnapshot(browserRecoveryStorage()) : null

  return (
    <Card gap="md">
      <Text as="h2" size="xl" weight="semibold">
        {t('offline.settingsTitle')}
      </Text>
      <Text>{t('offline.settingsHelp')}</Text>
      <Text color="muted">
        {cached
          ? t('offline.cachedAt', { date: cached.saved_at })
          : t('offline.notCached')}
      </Text>
      {error && (
        <Text color="dangerous" role="alert">
          {t('offline.storageError')}
        </Text>
      )}
      <Flex gap="sm" wrap="wrap">
        <Button
          disabled={!data || !ownerId}
          icon="tabler:download"
          loading={busy}
          namespace={false}
          onClick={() => void enable()}
        >
          {t(enabled ? 'offline.refreshCache' : 'offline.enable')}
        </Button>
        {enabled && (
          <>
            <Button
              icon="tabler:cloud-off"
              namespace={false}
              variant="secondary"
              onClick={() => window.location.assign('/gym?offline=1')}
            >
              {t('offline.open')}
            </Button>
            <Button
              dangerous
              namespace={false}
              variant="plain"
              onClick={() => void disable()}
            >
              {t('offline.clear')}
            </Button>
          </>
        )}
      </Flex>
    </Card>
  )
}
