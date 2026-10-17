import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'
import { useTranslation } from 'react-i18next'

import { getDesktopUpdater, useAPIEndpoint, useAuth } from '@monolith/api'
import type { UpdateAction, UpdatePreferences } from '@monolith/configs'
import { Box, Button, Flex, Stack, Text } from '@monolith/ui'

import workspaceAPI from '@/core/utils/workspaceAPI'

import { version as webVersion } from '../../../../../package.json'
import UpdateCard from './UpdateCard'
import { guardUpdateRestart, useDesktopUpdates } from './useDesktopUpdates'

function useUpdatesController() {
  const native = useDesktopUpdates()
  const endpoint = useAPIEndpoint()
  const { userData } = useAuth()
  const queryClient = useQueryClient()

  const server = useQuery({
    queryKey: [...workspaceAPI.updates.status.key, endpoint, userData?.id],
    queryFn: () => workspaceAPI.updates.status.query(),
    refetchInterval: query =>
      query.state.data &&
      [
        'checking',
        'downloading',
        'verifying',
        'installing',
        'restarting',
        'rollingBack'
      ].includes(query.state.data.state.phase)
        ? 1500
        : 15000,
    retry: false
  })

  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const serverVersion = server.data?.state.currentVersion
  const reloadAutomatically =
    !native.available &&
    server.data?.state.configured &&
    server.data.state.preferences.autoInstall
  useEffect(() => {
    if (!reloadAutomatically || !serverVersion || serverVersion === webVersion)
      return
    let lastInput = Date.now()
    let checking = false
    let active = true

    const input = () => {
      lastInput = Date.now()
    }
    const hiddenAndIdle = () =>
      document.visibilityState === 'hidden' && Date.now() - lastInput >= 120000
    window.addEventListener('pointerdown', input)
    window.addEventListener('keydown', input)
    document.addEventListener('visibilitychange', input)
    const timer = setInterval(async () => {
      if (checking || !hiddenAndIdle()) return
      checking = true

      try {
        await guardUpdateRestart()
        if (active && hiddenAndIdle()) window.location.reload()
      } catch {
        /* Keep the current page and its unsaved work until it is safe. */
      } finally {
        checking = false
      }
    }, 30000)

    return () => {
      active = false
      clearInterval(timer)
      window.removeEventListener('pointerdown', input)
      window.removeEventListener('keydown', input)
      document.removeEventListener('visibilitychange', input)
    }
  }, [reloadAutomatically, serverVersion])
  const act = async (action: UpdateAction, preferences?: UpdatePreferences) => {
    if (pending || !server.data?.canManage) return
    setPending(true)
    setError('')

    try {
      if (action === 'settings' && preferences)
        await workspaceAPI.updates.settings.mutate(preferences)
      else if (
        action !== 'status' &&
        action !== 'ready' &&
        action !== 'settings'
      )
        await workspaceAPI.updates.action.mutate({ action })
      await queryClient.invalidateQueries({
        queryKey: workspaceAPI.updates.status.key
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setPending(false)
    }
  }

  return { native, server, pending, error, act }
}

const UpdatesContext = createContext<ReturnType<
  typeof useUpdatesController
> | null>(null)

export function UpdateSettings() {
  const controller = useContext(UpdatesContext)
  const { t } = useTranslation('common')
  const [reloadError, setReloadError] = useState('')

  if (!controller) return null

  const { native, server, act, pending, error } = controller
  const webChanged =
    !native.available &&
    server.data?.state.configured &&
    server.data.state.currentVersion !== webVersion

  return (
    <Stack gap="lg">
      {native.available && (
        <UpdateCard
          canManage
          native
          error={native.error}
          pending={native.pending}
          state={native.state}
          title={t('updates.desktop')}
          onAction={native.act}
        />
      )}
      <UpdateCard
        canManage={!!server.data?.canManage}
        error={error || (server.error ? t('updates.reconnecting') : '')}
        pending={pending}
        state={server.data?.state}
        title={t('updates.server')}
        onAction={act}
      />
      {webChanged && (
        <Button
          namespace={false}
          onClick={async () => {
            try {
              await guardUpdateRestart()
              window.location.reload()
            } catch (cause) {
              setReloadError(
                cause instanceof Error ? cause.message : String(cause)
              )
            }
          }}
        >
          {t('updates.reloadWeb')}
        </Button>
      )}
      {reloadError && (
        <Text role="alert" size="sm">
          {reloadError}
        </Text>
      )}
    </Stack>
  )
}

export default function UpdatesProvider({ children }: { children: ReactNode }) {
  const controller = useUpdatesController()
  const { t } = useTranslation('common')
  const dialog = useRef<HTMLDialogElement>(null)
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set())

  const state = [controller.native.state, controller.server.data?.state].find(
    state =>
      state?.configured &&
      [
        'available',
        'ready',
        'rolledBack',
        'failed',
        'complete',
        'installing',
        'restarting',
        'rollingBack'
      ].includes(state.phase) &&
      !dismissed.has(`${state.target}:${state.noticeId}:${state.phase}`)
  )
  const notice = state ? `${state.target}:${state.noticeId}:${state.phase}` : ''
  useEffect(() => {
    void getDesktopUpdater()?.('ready').catch(() => {})
  }, [])

  return (
    <UpdatesContext value={controller}>
      {children}
      {state && (
        <Flex
          align="center"
          className="monolith-update-notice"
          gap="md"
          role="status"
        >
          <Stack gap="xs">
            <Text weight="semibold">
              {t('updates.title')} ·{' '}
              {t(
                state.target.startsWith('linux')
                  ? 'updates.server'
                  : 'updates.desktop'
              )}
            </Text>
            <Text size="sm">
              {t(`updates.phases.${state.phase}`)}
              {['rolledBack', 'complete'].includes(state.phase)
                ? ` · ${state.currentVersion}`
                : state.release
                  ? ` · ${state.release.version}`
                  : ''}
            </Text>
          </Stack>
          <Button
            namespace={false}
            variant="secondary"
            onClick={() => dialog.current?.showModal()}
          >
            {t('updates.review')}
          </Button>
          <Button
            aria-label={t('updates.dismiss')}
            icon="lucide:x"
            namespace={false}
            variant="plain"
            onClick={() =>
              setDismissed(previous => new Set([...previous, notice]))
            }
          />
        </Flex>
      )}
      <dialog
        ref={dialog}
        aria-label={t('updates.title')}
        className="monolith-updates-dialog"
      >
        <Box>
          <Flex align="center" justify="between" mb="lg">
            <Text as="h1" size="xl" weight="semibold">
              {t('updates.title')}
            </Text>
            <Button
              aria-label={t('updates.close')}
              icon="lucide:x"
              namespace={false}
              variant="plain"
              onClick={() => dialog.current?.close()}
            />
          </Flex>
          <UpdateSettings />
        </Box>
      </dialog>
    </UpdatesContext>
  )
}
