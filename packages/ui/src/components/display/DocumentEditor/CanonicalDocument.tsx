import {
  DraftController,
  type DraftStore,
  type EditorDocumentV2,
  type EditorSource,
  type GatewayClient,
  GatewayError,
  gatewayQueryKey,
  getNativeRuntime,
  useGateway
} from '@monolith/api'
import {
  canonicalMarkdown,
  canvasLink,
  serializeCanonical
} from '@monolith/blocks'
import { useQuery } from '@tanstack/react-query'
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore
} from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { Button } from '@/components/inputs'
import { CanonicalWidgetBoard } from '@/components/layout/WorkspaceCanvas/CanonicalWidgetBoard'
import { useCanvasWidgets } from '@/components/layout/WorkspaceCanvas/CanvasWidgets'
import { InlineDatabasePicker } from '@/components/layout/WorkspaceCanvas/InlineDatabasePicker'
import { FloatingPopover } from '@/components/overlays/FloatingPopover'
import { Flex, Icon, Stack, Text } from '@/components/primitives'
import { useAppearance } from '@/providers/AppearanceProvider'
import { usePageChrome } from '@/providers/PageChromeProvider'

import {
  type DatabaseChoiceOptions,
  DocumentEditor,
  type DocumentEmbed
} from './index'

export type CanonicalIdentity = { workspaceId: string; source: EditorSource }
const SourcePageLayout = createContext<ReactNode>(undefined)

export function CanonicalSource({
  source,
  children,
  readOnly,
  afterTitle
}: {
  source?: EditorSource
  children: ReactNode
  readOnly?: boolean
  afterTitle?: ReactNode
}) {
  const { client, loading, error } = useGateway()
  const { t } = useTranslation('common')

  const parameters = { kind: source?.kind ?? 'page', id: source?.id ?? '' }
  const resolved = useQuery({
    queryKey: gatewayQueryKey(
      client?.identity ?? { serverId: '', accountId: '' },
      'resolveSource',
      parameters
    ),
    queryFn: () =>
      client!.call<
        { migrated: false } | ({ migrated: true } & CanonicalIdentity)
      >('resolveSource', parameters),
    enabled: !!client && !!source,
    retry: false,
    staleTime: Infinity
  })

  if (!source) return <>{children}</>
  if (error)
    return (
      <Text role="alert">
        {t('documentEditor.loadError')} {error}
      </Text>
    )
  if (loading || (client && resolved.isPending))
    return <Text role="status">{t('documentEditor.loading')}</Text>
  if (resolved.error)
    return (
      <Text role="alert">
        {t('documentEditor.loadError')} {resolved.error.message}
      </Text>
    )

  return (
    <SourcePageLayout value={afterTitle}>
      <CanonicalDocument
        identity={resolved.data?.migrated ? resolved.data : undefined}
        readOnly={readOnly}
      >
        {children}
      </CanonicalDocument>
    </SourcePageLayout>
  )
}

/** A rollout failure cannot fall through to a legacy writer. */
export function CanonicalDocument({
  identity,
  children,
  native,
  widgetScope,
  nativeTitle,
  readOnly = false
}: {
  identity?: CanonicalIdentity
  children: ReactNode
  native?: ReactNode
  widgetScope?: string
  nativeTitle?: string
  readOnly?: boolean
}) {
  const { client, drafts, loading, error } = useGateway()
  const { t } = useTranslation('common')

  const rollout = useQuery({
    queryKey: gatewayQueryKey(
      client?.identity ?? { serverId: '', accountId: '' },
      'rollout',
      { id: identity?.workspaceId ?? '' }
    ),
    queryFn: () => client!.rollout(identity!.workspaceId),
    enabled: !!client && !!identity,
    retry: false,
    staleTime: Infinity
  })

  if (!identity) return <>{children}</>
  if (error)
    return (
      <Text role="alert">
        {t('documentEditor.loadError')} {error}
      </Text>
    )
  if (loading || (client && rollout.isPending))
    return <Text role="status">{t('documentEditor.loading')}</Text>
  if (rollout.error)
    return (
      <Stack gap="sm">
        <Text role="alert">{t('documentEditor.loadError')}</Text>
        <Button
          namespace="common"
          onClick={() => {
            void rollout.refetch()
          }}
        >
          buttons.retry
        </Button>
      </Stack>
    )
  if (!client || !rollout.data?.enabled) return <>{children}</>

  return (
    <LoadedDocument
      key={`${client.identity.serverId}:${client.identity.accountId}:${identity.workspaceId}:${identity.source.kind}:${identity.source.id}`}
      client={client}
      drafts={drafts}
      identity={identity}
      native={native}
      nativeTitle={nativeTitle}
      readOnly={readOnly || rollout.data.role === 'viewer'}
      widgetScope={widgetScope}
    />
  )
}

function LoadedDocument({
  client,
  drafts,
  identity,
  readOnly,
  native,
  widgetScope,
  nativeTitle
}: {
  client: GatewayClient
  drafts: DraftStore
  identity: CanonicalIdentity
  readOnly: boolean
  native?: ReactNode
  widgetScope?: string
  nativeTitle?: string
}) {
  const { t } = useTranslation('common')
  const opened = useRef(false)

  const query = useQuery({
    queryKey: client.key('document', {
      workspaceId: identity.workspaceId,
      kind: identity.source.kind,
      id: identity.source.id
    }),
    queryFn: async () => {
      try {
        return await client.document(identity.workspaceId, identity.source)
      } catch (error) {
        if (error instanceof GatewayError && error.status === 404 && !readOnly)
          return client.initializeDocument(
            identity.workspaceId,
            identity.source
          )
        if (error instanceof GatewayError && error.status !== 401) throw error

        const cached = await drafts.get({ ...client.identity, ...identity })

        if (!cached) throw error

        return {
          workspaceId: cached.workspaceId,
          source: cached.source,
          revision: cached.baselineRevision,
          snapshot: cached.snapshot,
          formatVersion: 2,
          recovery: false,
          updatedAt: cached.updatedAt
        } satisfies EditorDocumentV2
      }
    },
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  })

  if (query.isPending || (!opened.current && query.isFetching))
    return <Text role="status">{t('documentEditor.loading')}</Text>
  if (!query.data || query.error)
    return (
      <Stack gap="sm">
        <Text role="alert">
          {t('documentEditor.loadError')} {query.error.message}
        </Text>
        <Button
          namespace="common"
          onClick={() => {
            void query.refetch()
          }}
        >
          buttons.retry
        </Button>
      </Stack>
    )
  opened.current = true

  return (
    <DocumentSession
      client={client}
      document={query.data}
      drafts={drafts}
      native={native}
      nativeTitle={nativeTitle}
      readOnly={readOnly}
      widgetScope={widgetScope}
    />
  )
}

function DocumentSession({
  document,
  client,
  drafts,
  readOnly,
  native,
  widgetScope,
  nativeTitle
}: {
  document: EditorDocumentV2
  client: GatewayClient
  drafts: DraftStore
  readOnly: boolean
  native?: ReactNode
  widgetScope?: string
  nativeTitle?: string
}) {
  const [original] = useState(document)

  const [session, setSession] = useState<{
    controller: DraftController
    snapshot: EditorDocumentV2['snapshot']
  }>()

  const [error, setError] = useState('')
  const readOnlyRef = useRef(readOnly)

  readOnlyRef.current = readOnly
  useEffect(() => {
    let active = true

    const controller = new DraftController(
      original,
      {
        ...client.identity,
        workspaceId: original.workspaceId,
        source: original.source
      },
      drafts,
      client
    )
    void controller
      .initialize(readOnlyRef.current)
      .then(snapshot => {
        if (active) {
          setSession({ controller, snapshot })
          if (!readOnlyRef.current) void controller.flush()
        }
      })
      .catch(cause => {
        if (active) setError(String(cause))
      })
    const online = () => {
      if (!readOnlyRef.current) void controller.reconnect()
    }
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (controller.state.dirty) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('online', online)
    window.addEventListener('monolith-auth-restored', online)
    window.addEventListener('beforeunload', beforeUnload)

    return () => {
      active = false
      window.removeEventListener('online', online)
      window.removeEventListener('monolith-auth-restored', online)
      window.removeEventListener('beforeunload', beforeUnload)
      // Child editor cleanup emits its final frame-batched keystroke. Let that
      // finish before draining saves when closing a page or an Atlas tab.
      queueMicrotask(() => {
        void (
          readOnlyRef.current ? Promise.resolve() : controller.flush()
        ).finally(() => controller.dispose())
      })
    }
  }, [original, client, drafts])
  if (error) return <Text role="alert">{error}</Text>

  return (
    session && (
      <ActiveDocument
        controller={session.controller}
        document={original}
        native={native}
        nativeTitle={nativeTitle}
        readOnly={readOnly}
        snapshot={session.snapshot}
        widgetScope={widgetScope}
      />
    )
  )
}

function ActiveDocument({
  document,
  controller,
  snapshot,
  readOnly,
  native,
  widgetScope,
  nativeTitle
}: {
  document: EditorDocumentV2
  controller: DraftController
  snapshot: EditorDocumentV2['snapshot']
  readOnly: boolean
  native?: ReactNode
  widgetScope?: string
  nativeTitle?: string
}) {
  const { t } = useTranslation('common')
  const catalog = useCanvasWidgets()
  const afterTitle = useContext(SourcePageLayout)
  const state = useSyncExternalStore(controller.subscribe, controller.getState)
  const chrome = usePageChrome()
  const setDocument = chrome?.setDocument
  const chromeOwner = useRef(Symbol())
  const { appearance, openEditor } = useAppearance()
  const [initial, setInitial] = useState(snapshot)
  const [generation, setGeneration] = useState(0)
  const currentGeneration = useRef(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [recovered, setRecovered] = useState<string>()

  const insert = useRef<
    | ((reference: {
        workspaceId: string
        baseId: string
        viewId: string
      }) => void)
    | null
  >(null)

  const [choosing, setChoosing] = useState<DatabaseChoiceOptions>()
  const title = controller.snapshot.meta.title
  const exportMarkdown = useCallback(() => {
    const content = canonicalMarkdown(serializeCanonical(controller.snapshot))
    const name = `${controller.snapshot.meta.title.replace(/[<>:"/\\|?*]/g, '_') || 'Document'}.md`
    const native = getNativeRuntime()
    if (native) {
      void native.host
        .saveFile(name, content)
        .catch(cause => setError(String(cause)))
      return
    }
    const url = URL.createObjectURL(
      new Blob([content], { type: 'text/markdown;charset=utf-8' })
    )
    const anchor = window.document.createElement('a')
    anchor.href = url
    anchor.download = name
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, [controller])
  useLayoutEffect(() => {
    setDocument?.(
      {
        status: t(`documentEditor.status.${state.status}`),
        dirty: state.dirty,
        title,
        sourceId: document.source.id,
        exportMarkdown
      },
      chromeOwner.current
    )
  }, [
    setDocument,
    state.status,
    state.dirty,
    t,
    exportMarkdown,
    title,
    document.source.id
  ])
  useLayoutEffect(() => {
    const owner = chromeOwner.current
    return () => setDocument?.(undefined, owner)
  }, [setDocument])

  async function resolve(action: 'server' | 'recover') {
    currentGeneration.current++
    setBusy(true)
    setError('')

    try {
      if (action === 'server') await controller.useServerVersion()
      else {
        const copy = await controller.recoverAsPage(
          `${controller.snapshot.meta.title} (${t('documentEditor.recovered')})`
        )
        setRecovered(copy.source.id)
      }
    } catch (cause) {
      setError(String(cause))
    } finally {
      setInitial(controller.snapshot)
      setGeneration(currentGeneration.current)
      setBusy(false)
    }
  }

  function renderEmbed(embed: DocumentEmbed) {
    if (embed.flavour === 'monolith:linked-database')
      return catalog.render('linkedDatabase', {
        filter: JSON.stringify(embed.props),
        onViewChange: embed.updateProps
          ? viewId => embed.updateProps?.({ viewId })
          : undefined,
        onHeightChange: embed.updateProps
          ? height => embed.updateProps?.({ height })
          : undefined
      })

    const config = embed.props.config as Record<string, unknown> | undefined

    if (embed.props.moduleId === 'native')
      return (
        native ?? (
          <Text color="muted">{t('documentEditor.unavailableEmbed')}</Text>
        )
      )
    if (
      embed.props.moduleId === 'button' &&
      typeof config?.url === 'string' &&
      canvasLink(config.url)
    )
      return <Link to={config.url}>{String(config.title || config.url)}</Link>
    if (embed.props.moduleId === 'widget')
      return catalog.render(String(embed.props.widgetId), {
        filter: String(config?.content ?? '')
      })

    return <Text color="muted">{t('documentEditor.unavailableEmbed')}</Text>
  }

  return (
    <Stack
      gap="md"
      maxWidth={
        widgetScope || appearance.contentWidth === 'full' ? 'none' : '920px'
      }
      minWidth="0"
      style={{ marginInline: 'auto' }}
      width="100%"
    >
      {!afterTitle && (
        <Flex align="center" gap="sm" justify="between">
          {openEditor && !readOnly ? (
            <Button
              aria-label={t('appearance.changeIcon')}
              icon={appearance.icon ?? 'lucide:file-text'}
              iconProps={{
                preserveStyle: !!appearance.icon,
                style: {
                  color: 'var(--appearance-icon-color, var(--accent-primary))'
                },
                size: '28px'
              }}
              namespace={false}
              variant="plain"
              onClick={() => openEditor('page')}
            />
          ) : (
            <Icon
              icon={appearance.icon ?? 'lucide:file-text'}
              preserveStyle={!!appearance.icon}
              size="28px"
            />
          )}
          {!chrome && openEditor && !readOnly && (
            <Button
              icon="lucide:palette"
              namespace={false}
              variant="plain"
              onClick={() => openEditor('page')}
            >
              {t('appearance.customize')}
            </Button>
          )}
        </Flex>
      )}
      {(!chrome || ['offline', 'expired'].includes(state.status)) && (
        <Flex align="center" gap="sm" justify="between" wrap="wrap">
          <Text color="muted" role="status" size="sm">
            {t(`documentEditor.status.${state.status}`)}
          </Text>
          <Button namespace="common" variant="plain" onClick={exportMarkdown}>
            documentEditor.exportMarkdown
          </Button>
          {['offline', 'expired'].includes(state.status) && (
            <Button
              namespace="common"
              variant="plain"
              onClick={() => controller.reconnect()}
            >
              documentEditor.retrySave
            </Button>
          )}
        </Flex>
      )}
      {(error || state.error) && (
        <Text role="alert">{error || state.error}</Text>
      )}
      {(state.status === 'conflict' ||
        (state.status === 'error' && state.dirty)) && (
        <Stack gap="sm">
          <Text>{t('documentEditor.conflict')}</Text>
          <Flex gap="sm" wrap="wrap">
            <Button
              loading={busy}
              namespace="common"
              onClick={() => resolve('recover')}
            >
              documentEditor.recoverCopy
            </Button>
            <Button
              disabled={busy}
              namespace="common"
              variant="secondary"
              onClick={() => {
                if (window.confirm(t('documentEditor.replaceConfirm')))
                  void resolve('server')
              }}
            >
              documentEditor.useServer
            </Button>
          </Flex>
        </Stack>
      )}
      {recovered && (
        <Link to={`/page/${recovered}`}>
          {t('documentEditor.openRecovery')}
        </Link>
      )}
      {choosing && (
        <FloatingPopover
          anchor={choosing.anchor ?? null}
          label={t('inlineDatabase.title')}
          width={380}
          onClose={() => {
            setChoosing(undefined)
            insert.current = null
          }}
        >
          <InlineDatabasePicker
            initialMode={choosing.mode}
            workspaceId={document.workspaceId}
            onCancel={() => {
              setChoosing(undefined)
              insert.current = null
            }}
            onInsert={reference => {
              insert.current?.(reference)
              insert.current = null
              setChoosing(undefined)
            }}
          />
        </FloatingPopover>
      )}
      {widgetScope ? (
        <>
          <Text
            as="h1"
            size="3xl"
            style={{
              fontSize: 'clamp(30px, 4vw, 40px)',
              fontWeight: 600,
              letterSpacing: '-0.035em'
            }}
            weight="semibold"
          >
            {controller.snapshot.meta.title}
          </Text>
          <CanonicalWidgetBoard
            key={generation}
            native={native}
            nativeTitle={nativeTitle ?? controller.snapshot.meta.title}
            readOnly={readOnly || document.recovery || busy || !!recovered}
            scope={widgetScope}
            snapshot={controller.snapshot}
            workspaceId={document.workspaceId}
            onChange={snapshot => controller.edit(snapshot)}
          />
        </>
      ) : (
        <DocumentEditor
          key={generation}
          afterTitle={afterTitle}
          chooseDatabase={(callback, options) => {
            insert.current = callback
            setChoosing(
              options ?? {
                anchor: window.document.activeElement as HTMLElement
              }
            )
          }}
          initialSnapshot={initial}
          readOnly={readOnly || document.recovery || busy || !!recovered}
          renderEmbed={renderEmbed}
          workspaceId={document.workspaceId}
          onChange={snapshot => {
            if (generation === currentGeneration.current)
              controller.edit(snapshot)
          }}
        />
      )}
    </Stack>
  )
}
