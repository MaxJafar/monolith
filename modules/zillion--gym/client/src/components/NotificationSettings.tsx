import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useModuleTranslation } from '@lifeforge/localization'
import { Button, Card, Checkbox, Flex, Text } from '@lifeforge/ui'

import { useGym } from '@/GymContext'
import { forgeAPI } from '@/manifest'

import {
  type PushLanguage,
  type PushPreferences,
  pushLanguageSchema
} from '../../../pushShared'
import {
  PushSetupError,
  browserPushEnvironment,
  disableGymPushDelivery,
  enableGymPushDelivery,
  pushCapability,
  pushEndpointHash,
  readGymSubscription,
  subscribeGymPush,
  unsubscribeGymPush
} from '../utils/notifications'

export function NotificationSettings() {
  const { ownerId, offline, pending, run } = useGym()
  const { t, i18n } = useModuleTranslation()

  const query = useQuery({
    ...forgeAPI.pushStatus.queryOptions({ enabled: !!ownerId, staleTime: 0 }),
    queryKey: [...forgeAPI.pushStatus.key, ownerId]
  })

  const [browser, setBrowser] = useState(() => ({
    capability: pushCapability(),
    permission: browserPushEnvironment().permission(),
    endpoint: '',
    hash: ''
  }))

  const [preferences, setPreferences] = useState<PushPreferences>({
    planned: true,
    rest: true,
    coach: true
  })

  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const lock = useRef(false)
  const mounted = useRef(true)
  const deliveryAllowed = useRef(true)

  const status = query.data?.owner_id === ownerId ? query.data : undefined
  const current = status?.subscriptions.find(
    item => item.endpoint_hash === browser.hash
  )
  const preferenceIdentity = current ? JSON.stringify(current.preferences) : ''
  const registered = !!current
  const storedPlanned = current?.preferences.planned
  const storedRest = current?.preferences.rest
  const storedCoach = current?.preferences.coach

  const inspect = useCallback(async () => {
    const environment = browserPushEnvironment()
    const subscription = await readGymSubscription(environment)
    const hash = subscription
      ? await pushEndpointHash(subscription.endpoint)
      : ''

    if (!mounted.current) return
    setBrowser({
      capability: pushCapability(environment),
      permission: environment.permission(),
      endpoint: subscription?.endpoint ?? '',
      hash
    })
  }, [])

  useEffect(() => {
    mounted.current = true
    deliveryAllowed.current = true
    const signOut = () => {
      deliveryAllowed.current = false
    }
    window.addEventListener('zillion-gym-sign-out', signOut)

    return () => {
      mounted.current = false
      deliveryAllowed.current = false
      window.removeEventListener('zillion-gym-sign-out', signOut)
    }
  }, [])

  useEffect(() => {
    // Reading browser status must never register a worker or request permission.
    void inspect().catch(cause =>
      setError(
        t('settings.pushBrowserError', {
          error: cause instanceof Error ? cause.message : String(cause)
        })
      )
    )
  }, [inspect, t])
  useEffect(() => {
    if (
      storedPlanned !== undefined &&
      storedRest !== undefined &&
      storedCoach !== undefined
    )
      setPreferences({
        planned: storedPlanned,
        rest: storedRest,
        coach: storedCoach
      })
  }, [storedPlanned, storedRest, storedCoach])
  useEffect(() => {
    if (registered && ownerId && browser.permission === 'granted' && !offline)
      void enableGymPushDelivery(
        ownerId,
        browserPushEnvironment(),
        () => mounted.current && deliveryAllowed.current
      ).catch(cause => {
        if (mounted.current)
          setError(
            t('settings.pushBrowserError', {
              error: cause instanceof Error ? cause.message : String(cause)
            })
          )
      })
  }, [registered, ownerId, browser.permission, browser.hash, offline, t])

  async function action(operation: () => Promise<void>, message?: string) {
    if (lock.current || pending) return
    lock.current = true
    setBusy(true)
    setNotice('')
    setError('')
    let failure: unknown

    try {
      const success = await run(async () => {
        try {
          await operation()
        } catch (cause) {
          failure = cause
          throw cause
        }
      })

      if (success && message) setNotice(t(message))
      if (!success && failure)
        setError(
          failure instanceof PushSetupError
            ? t(`settings.pushSetup.${failure.code}`)
            : t('settings.pushError', {
                error:
                  failure instanceof Error ? failure.message : String(failure)
              })
        )
      await inspect()
    } catch (cause) {
      setError(
        t('settings.pushBrowserError', {
          error: cause instanceof Error ? cause.message : String(cause)
        })
      )
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  function subscribe() {
    const selected = pushLanguageSchema.safeParse(
      i18n.resolvedLanguage ?? i18n.language
    )
    const language: PushLanguage = selected.success ? selected.data : 'en'
    // Called synchronously from the button so permission retains the browser user gesture.
    void action(async () => {
      await subscribeGymPush(status?.public_key ?? null, subscription =>
        forgeAPI.subscribePush.mutate({
          subscription,
          device_name: t('settings.pushThisBrowser'),
          language,
          preferences
        })
      )
      if (ownerId)
        await enableGymPushDelivery(
          ownerId,
          browserPushEnvironment(),
          () => mounted.current && deliveryAllowed.current
        )
    }, 'settings.pushSaved')
  }

  const unavailable =
    browser.capability !== 'supported' ||
    !status?.configured ||
    !status.public_key
  const blocked = offline || pending || busy
  const unmatched = !!browser.endpoint && !!status && !current
  const preferencesChanged =
    !!current && preferenceIdentity !== JSON.stringify(preferences)

  return (
    <Card gap="md">
      <Text as="h3" size="xl">
        {t('settings.pushTitle')}
      </Text>
      <Text color="muted">{t('settings.pushHelp')}</Text>
      <Text role="status">
        {t(
          browser.capability === 'insecure'
            ? 'settings.pushInsecure'
            : browser.capability === 'unsupported'
              ? 'settings.pushUnsupported'
              : !status && query.isFetching
                ? 'loading'
                : status?.configured
                  ? 'settings.pushConfigured'
                  : 'settings.pushUnavailable'
        )}
      </Text>
      {browser.capability === 'supported' && (
        <Text color={browser.permission === 'denied' ? 'dangerous' : 'muted'}>
          {t(`settings.notificationPermission.${browser.permission}`)}
        </Text>
      )}
      <Text>
        {t(current ? 'settings.pushSubscribed' : 'settings.pushNotSubscribed')}
      </Text>
      {unmatched && (
        <Text color="dangerous" role="alert">
          {t('settings.pushUnmatched')}
        </Text>
      )}
      <Flex gap="lg" wrap="wrap">
        <Checkbox
          checked={preferences.planned}
          disabled={blocked}
          label={t('settings.pushPlanned')}
          onCheckedChange={planned =>
            setPreferences(value => ({ ...value, planned }))
          }
        />
        <Checkbox
          checked={preferences.rest}
          disabled={blocked}
          label={t('settings.pushRest')}
          onCheckedChange={rest =>
            setPreferences(value => ({ ...value, rest }))
          }
        />
        <Checkbox
          checked={preferences.coach}
          disabled={blocked}
          label={t('settings.pushCoach')}
          onCheckedChange={coach =>
            setPreferences(value => ({ ...value, coach }))
          }
        />
      </Flex>
      {current?.last_success && (
        <Text color="muted">
          {t('settings.pushLastSuccess', {
            date: dayjs(current.last_success).format('LLL')
          })}
        </Text>
      )}
      {current?.last_error && (
        <Text color="dangerous" role="alert">
          {t('settings.pushLastError', { error: current.last_error })}
        </Text>
      )}
      {(error || query.error) && (
        <Text color="dangerous" role="alert">
          {error || query.error?.message}
        </Text>
      )}
      {notice && <Text role="status">{notice}</Text>}
      <Flex gap="sm" wrap="wrap">
        <Button
          disabled={
            blocked ||
            unavailable ||
            unmatched ||
            browser.permission === 'denied' ||
            (!!current && !preferencesChanged)
          }
          icon="tabler:bell"
          loading={busy}
          onClick={subscribe}
        >
          {current ? 'saveGymPush' : 'enableGymPush'}
        </Button>
        <Button
          disabled={blocked || !browser.endpoint || !status}
          variant="secondary"
          onClick={() =>
            void action(async () => {
              await unsubscribeGymPush(async endpoint => {
                if (current) await forgeAPI.unsubscribePush.mutate({ endpoint })
              })
              await disableGymPushDelivery()
            }, 'settings.pushDisabled')
          }
        >
          disableGymPush
        </Button>
        <Button
          disabled={
            blocked ||
            unavailable ||
            !current ||
            browser.permission !== 'granted'
          }
          variant="secondary"
          onClick={() =>
            void action(async () => {
              const result = await forgeAPI.testPush.mutate({
                command_id: crypto.randomUUID(),
                endpoint: browser.endpoint
              })
              setNotice(t('settings.pushQueued', { count: result.queued }))
            })
          }
        >
          testGymPush
        </Button>
        <Button
          disabled={blocked}
          variant="plain"
          onClick={() =>
            void action(async () => {
              await query.refetch()
            })
          }
        >
          refreshGymPush
        </Button>
      </Flex>
    </Card>
  )
}
