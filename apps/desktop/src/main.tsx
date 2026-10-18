import { Suspense, lazy, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from 'react-error-boundary'
import 'react-grid-layout/css/styles.css'
import { useTranslation } from 'react-i18next'

import {
  type Discovery,
  GatewayError,
  checkSignOutGuards,
  clearNativeRuntime,
  configureNativeRuntime,
  getNativeRuntime
} from '@monolith/api'
import { Box, Button, Flex, Stack, Text } from '@monolith/ui'
import '@monolith/ui/dist/index.css'

import {
  ChromeBrand,
  WindowControls
} from '../../web/src/core/routing/components/WorkspaceChrome'
import DesktopUpdateControls from '../../web/src/core/updates/DesktopUpdateControls'
import ConnectionOverlay from './ConnectionOverlay'
import { host } from './bridge'
import { initializeBundle } from './bundle'
import './shell.css'

;(window as unknown as { process: { env: Record<string, string> } }).process = {
  env: {}
}

const Workspace = lazy(() => import('../../web/src/core/providers'))
function Desktop() {
  const { t } = useTranslation('common')
  const [ready, setReady] = useState(false)
  const [server, setServer] = useState('')
  const [discovery, setDiscovery] = useState<Discovery>()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [challenge, setChallenge] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [panel, setPanel] = useState(false)
  const [expired, setExpired] = useState(false)
  const [drafts, setDrafts] = useState<{ title: string; href: string }[]>([])
  const message = (cause: unknown) =>
    cause instanceof GatewayError &&
    [
      'dns',
      'timeout',
      'certificate',
      'incompatible',
      'expired',
      'invalid_url',
      'offline'
    ].includes(cause.code)
      ? t(`desktop.errors.${cause.code}`)
      : cause instanceof Error
        ? cause.message
        : String(cause)
  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (cause) {
      setError(message(cause))
    } finally {
      setBusy(false)
    }
  }
  useEffect(() => {
    void run(async () => {
      const profile = await host.profile()
      if (!profile) return
      setServer(profile.origin)
      const found = await host.connect(profile.origin)
      setDiscovery(found)
      const session = await host.refresh()
      configureNativeRuntime(host, session.profile, found, session.accessToken)
      setReady(true)
    })
    const cleared = () => {
      clearNativeRuntime()
      setReady(false)
      setPanel(false)
      setChallenge('')
      setPassword('')
      setCode('')
    }
    window.addEventListener('monolith-auth-cleared', cleared)
    const authenticateAgain = () => {
      setExpired(true)
      setChallenge('')
      setError('')
    }
    window.addEventListener('monolith-auth-expired', authenticateAgain)
    const external = (event: MouseEvent) => {
      const link = (event.target as Element)?.closest<HTMLAnchorElement>(
        'a[href]'
      )
      if (!link || link.hasAttribute('download')) return
      const url = new URL(link.href, location.href)
      if (
        url.origin !== location.origin &&
        ['https:', 'http:', 'mailto:'].includes(url.protocol)
      ) {
        event.preventDefault()
        event.stopPropagation()
        void host
          .openExternal(url.href)
          .catch(cause => setError(message(cause)))
      }
    }
    document.addEventListener('click', external, true)
    return () => {
      window.removeEventListener('monolith-auth-cleared', cleared)
      window.removeEventListener('monolith-auth-expired', authenticateAgain)
      document.removeEventListener('click', external, true)
    }
  }, [])
  async function signIn() {
    if (!discovery) return
    const result = challenge
      ? await host.totp(challenge, code)
      : await host.login({
          email,
          password,
          deviceName: `Monolith · ${host.platform === 'windows' ? 'Windows' : 'Mac'}`
        })
    setPassword('')
    setCode('')
    if ('state' in result) {
      setChallenge(result.challenge)
      return
    }
    const previous = getNativeRuntime()?.profile
    if (
      !ready ||
      previous?.serverId !== result.profile.serverId ||
      previous.accountId !== result.profile.accountId
    )
      window.dispatchEvent(new Event('monolith-auth-cleared'))
    configureNativeRuntime(host, result.profile, discovery, result.accessToken)
    setExpired(false)
    setChallenge('')
    window.dispatchEvent(new Event('monolith-auth-restored'))
    setReady(true)
  }
  async function connectionPanel() {
    setPanel(value => !value)
    const current = getNativeRuntime()
    if (!current) return
    const saved = await current.drafts.list(
      current.profile.serverId,
      current.profile.accountId
    )
    setDrafts(
      saved
        .filter(draft => draft.dirty)
        .map(draft => ({
          title: draft.snapshot.meta.title || t('desktop.untitled'),
          href:
            draft.source.kind === 'page'
              ? `/page/${draft.source.id}?workspace=${draft.workspaceId}`
              : draft.source.kind === 'record'
                ? `/databases?workspace=${draft.workspaceId}&record=${draft.source.id}`
                : `/notes?searchItem=${draft.source.id}`
        }))
    )
  }
  useEffect(() => {
    const showConnection = () => {
      void connectionPanel().catch(cause => setError(message(cause)))
    }
    window.addEventListener('monolith-show-connection', showConnection)
    return () =>
      window.removeEventListener('monolith-show-connection', showConnection)
  }, [])
  if (ready)
    return (
      <Flex direction="column" height="100dvh">
        {expired && (
          <Box className="desktop-reauth">
            <Stack
              as="form"
              className="desktop-connect-card"
              gap="md"
              onSubmit={event => {
                event.preventDefault()
                void run(signIn)
              }}
            >
              <Text as="h2">{t('desktop.signIn')}</Text>
              <Text>{t('desktop.errors.expired')}</Text>
              {challenge ? (
                <Box
                  as="input"
                  className="desktop-input"
                  aria-label={t('desktop.authenticator')}
                  autoFocus
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={event => setCode(event.target.value)}
                />
              ) : (
                <>
                  <Box
                    as="input"
                    className="desktop-input"
                    aria-label={t('desktop.email')}
                    type="email"
                    autoComplete="username"
                    autoFocus
                    required
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                  />
                  <Box
                    as="input"
                    className="desktop-input"
                    aria-label={t('desktop.password')}
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                  />
                </>
              )}
              {error && <Text role="alert">{error}</Text>}
              <Button namespace="common" loading={busy} type="submit">
                desktop.signIn
              </Button>
              <Button
                namespace="common"
                variant="plain"
                onClick={() => setExpired(false)}
              >
                buttons.close
              </Button>
            </Stack>
          </Box>
        )}
        {panel && (
          <ConnectionOverlay
            label={t('desktop.connection')}
            onClose={() => setPanel(false)}
          >
            <Flex align="center" justify="between">
              <Text weight="semibold">{t('desktop.connection')}</Text>
              <Button
                namespace={false}
                variant="plain"
                icon="lucide:x"
                aria-label={t('buttons.close')}
                onClick={() => setPanel(false)}
              />
            </Flex>
            <Text size="sm">{server}</Text>
            {error && <Text role="alert">{error}</Text>}
            {drafts.length > 0 && <Text>{t('desktop.unsavedDrafts')}</Text>}
            {drafts.map(draft => (
              <Box as="a" key={draft.href} href={draft.href}>
                {draft.title}
              </Box>
            ))}
            <Button
              namespace="common"
              variant="secondary"
              loading={busy}
              onClick={() =>
                run(async () => {
                  await checkSignOutGuards()
                  await host.signOut()
                  window.dispatchEvent(new Event('monolith-auth-cleared'))
                  setDiscovery(undefined)
                })
              }
            >
              desktop.changeServer
            </Button>
          </ConnectionOverlay>
        )}
        <Box id="app" as="main" flex="1" minHeight="0" overflow="hidden">
          <Suspense fallback={<Text>{t('desktop.opening')}</Text>}>
            <Workspace
              key={`${getNativeRuntime()?.profile.serverId}:${getNativeRuntime()?.profile.accountId}`}
            />
          </Suspense>
        </Box>
      </Flex>
    )
  return (
    <Flex direction="column" height="100dvh">
      <DesktopUpdateControls />
      <Flex
        className="monolith-workspace-chrome"
        data-platform={host.platform}
        align="center"
        justify="between"
        flexShrink="0"
        onMouseDown={event => {
          if (
            event.button === 0 &&
            event.target instanceof Element &&
            !event.target.closest('button')
          )
            void host.windowControl?.('drag').catch(() => {})
        }}
      >
        <ChromeBrand />
        <WindowControls host={host} />
      </Flex>
      <Flex
        className="desktop-onboarding"
        align="center"
        justify="center"
        flex="1"
        overflowY="auto"
      >
        <Stack
          as="form"
          className="desktop-connect-card"
          gap="lg"
          onSubmit={event => {
            event.preventDefault()
            void run(
              discovery
                ? signIn
                : async () => {
                    const found = await host.connect(server)
                    setDiscovery(found)
                  }
            )
          }}
        >
          <Box as="img" src="/icon.svg" alt="" width="52px" height="52px" />
          <Stack gap="sm">
            <Text as="h1" size="3xl" weight="semibold">
              {t(discovery ? 'desktop.signIn' : 'desktop.welcome')}
            </Text>
            <Text color="muted">
              {t(
                discovery ? 'desktop.signInDescription' : 'desktop.description'
              )}
            </Text>
          </Stack>
          {!discovery ? (
            <Stack gap="xs">
              <Text as="label" htmlFor="server">
                {t('desktop.serverUrl')}
              </Text>
              <Box
                as="input"
                id="server"
                className="desktop-input"
                autoFocus
                required
                placeholder="monolith.example.ts.net"
                autoComplete="url"
                value={server}
                onChange={event => setServer(event.target.value)}
              />
            </Stack>
          ) : challenge ? (
            <Stack gap="xs">
              <Text as="label" htmlFor="code">
                {t('desktop.authenticator')}
              </Text>
              <Box
                as="input"
                id="code"
                className="desktop-input"
                autoFocus
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={event => setCode(event.target.value)}
              />
            </Stack>
          ) : (
            <>
              <Stack gap="xs">
                <Text as="label" htmlFor="email">
                  {t('desktop.email')}
                </Text>
                <Box
                  as="input"
                  id="email"
                  className="desktop-input"
                  required
                  autoFocus
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                />
              </Stack>
              <Stack gap="xs">
                <Text as="label" htmlFor="password">
                  {t('desktop.password')}
                </Text>
                <Box
                  as="input"
                  id="password"
                  className="desktop-input"
                  required
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                />
              </Stack>
            </>
          )}
          {error && <Text role="alert">{error}</Text>}
          <Button type="submit" loading={busy} namespace="common">
            {discovery ? 'desktop.signIn' : 'desktop.continue'}
          </Button>
          {discovery && (
            <Button
              variant="plain"
              namespace="common"
              disabled={busy}
              onClick={() => {
                setDiscovery(undefined)
                setChallenge('')
                setError('')
              }}
            >
              desktop.changeServer
            </Button>
          )}
          <Text color="muted" size="sm">
            {discovery?.name ?? t('desktop.secureConnection')}
          </Text>
        </Stack>
      </Flex>
    </Flex>
  )
}
void initializeBundle().then(() =>
  createRoot(document.getElementById('root')!).render(
    <ErrorBoundary
      fallback={
        <p>
          Monolith could not open. Restart the app; local drafts are retained.
        </p>
      }
    >
      <Desktop />
    </ErrorBoundary>
  )
)
