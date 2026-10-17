import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'

import { useAuth } from '@monolith/api'
import {
  type CanvasBlock,
  type CanvasPage,
  moveCanvasBlock,
  parseContent,
  validateCanvasPage
} from '@monolith/blocks'
import { useModuleTranslation } from '@monolith/localization'

import {
  CanonicalDocument,
  type CanonicalIdentity
} from '@/components/display/DocumentEditor'
import { Button } from '@/components/inputs'
import { FloatingPopover } from '@/components/overlays'
import { Box, Flex, Icon, Stack, Text } from '@/components/primitives'
import { useAppearance } from '@/providers/AppearanceProvider'
import { usePageChrome } from '@/providers/PageChromeProvider'
import { workspaceAPI } from '@/utils/workspaceAPI'

import { AppearanceCover } from '../AppearanceCover'
import { CanvasBlockContent } from './BlockContent'
import { CanvasBlockFrame } from './BlockFrame'
import { useCanvasWidgets } from './CanvasWidgets'
import { CanvasDraftGuard } from './DraftGuard'
import { InlineDatabasePicker } from './InlineDatabasePicker'
import { WidgetBoard } from './WidgetBoard'
import './canvas.css'
import { defaultCanvasPage, newCanvasBlock } from './defaults'

export * from './CanvasWidgets'

export type CanvasPageStorage = {
  canonical?: CanonicalIdentity
  title?: string
  initialPage?: CanvasPage
  initialDataUpdatedAt?: number
  queryKey: readonly unknown[]
  load: () => Promise<{ page: CanvasPage | null }>
  save: (page: CanvasPage) => Promise<{ page: CanvasPage }>
  onSaved?: () => Promise<unknown>
  readOnly?: boolean
}

type WorkspaceCanvasProps = {
  title: string
  native: ReactNode
  storage?: CanvasPageStorage
  translationNamespace?: string
  widgetScope?: string
}

export function WorkspaceCanvas(props: WorkspaceCanvasProps) {
  return (
    <>
      <AppearanceCover />
      <CanonicalDocument
        identity={props.storage?.canonical}
        native={props.native}
        readOnly={props.storage?.readOnly}
        widgetScope={props.widgetScope}
        nativeTitle={props.title}
      >
        <LegacyWorkspaceCanvas {...props} />
      </CanonicalDocument>
    </>
  )
}

function LegacyWorkspaceCanvas({
  title,
  native,
  storage,
  translationNamespace,
  widgetScope
}: WorkspaceCanvasProps) {
  const location = useLocation(),
    key = location.pathname
  const { userData } = useAuth(),
    owner = userData?.id

  const { t } = useTranslation([
    'common.canvas',
    'common.widgets',
    ...(translationNamespace ? [translationNamespace] : [])
  ])
  const { t: moduleT, i18n, ns } = useModuleTranslation()
  const cache = useQueryClient()
  const { appearance, openEditor } = useAppearance()
  const chrome = usePageChrome()
  const setDocument = chrome?.setDocument
  const chromeOwner = useRef(Symbol())

  const endpoint = workspaceAPI.user.pages.get.input({ key })
  const options = endpoint.queryOptions()
  const query = useQuery<{ page: CanvasPage | null }>({
    queryKey: storage?.queryKey ?? [...options.queryKey, owner],
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    retry: false,
    initialData: storage?.initialPage
      ? { page: storage.initialPage }
      : undefined,
    initialDataUpdatedAt: storage?.initialDataUpdatedAt,
    queryFn: async () => {
      const { page } = await (storage ? storage.load() : endpoint.query())

      if (page !== null) validateCanvasPage(page)

      return { page }
    },
    enabled: !!owner
  })
  const defaults = useMemo(() => {
    const subsection = key
      .split('/')[2]
      ?.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
    const pageTitle =
      storage?.title ??
      (translationNamespace
        ? t(`${translationNamespace}:title`, { defaultValue: title })
        : subsection &&
            ns &&
            i18n.exists(`${ns}:subsections.${subsection}.title`)
          ? moduleT(`subsections.${subsection}.title`)
          : moduleT('title', { defaultValue: title }))

    return defaultCanvasPage(
      key,
      pageTitle,
      Object.fromEntries(
        [
          'home',
          'quickAccess',
          'projects',
          'documents',
          'homelab',
          'labHealth',
          'deviceResources',
          'financialOverview',
          'notes'
        ]
          .map(label => [label, t(label)])
          .concat(
            [
              'workspacePulse',
              'actionAgenda',
              'projectFocus',
              'quickLinks',
              'weather'
            ].map(label => [label, t(`common.widgets:catalog.${label}`)])
          )
      )
    )
  }, [key, title, t, moduleT, i18n, ns, storage?.title, translationNamespace])

  const [draft, setDraft] = useState<CanvasPage | null>(null)

  const [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [refreshError, setRefreshError] = useState(''),
    [reloading, setReloading] = useState(false),
    [confirmReload, setConfirmReload] = useState(false)

  const [invalid, setInvalid] = useState<Record<string, boolean>>({})
  const tail = useRef(newCanvasBlock('document'))
  const [databaseInsert, setDatabaseInsert] = useState<{
    after: string
    anchor: { getBoundingClientRect: () => DOMRect }
  }>()

  const saved = query.data?.page ?? defaults
  const page = draft ?? saved,
    editing = !storage?.readOnly && !reloading
  const dirty = useMemo(
    () =>
      (draft !== null && JSON.stringify(draft) !== JSON.stringify(saved)) ||
      Object.values(invalid).some(Boolean),
    [draft, saved, invalid]
  )

  const saving = useRef(false)

  const valid = useMemo(() => {
    try {
      validateCanvasPage(page)

      return true
    } catch {
      return false
    }
  }, [page])
  const loadError = query.isError ? query.error.message : ''
  const pageStatus = t(
    pending ? 'saving' : dirty ? 'unsaved' : editing ? 'saved' : 'readOnly'
  )
  const sourceId = storage?.canonical?.source.id ?? key
  useLayoutEffect(() => {
    setDocument?.(
      { title: page.title, sourceId, status: pageStatus, dirty },
      chromeOwner.current
    )
  }, [setDocument, page.title, sourceId, pageStatus, dirty])
  useLayoutEffect(() => {
    const owner = chromeOwner.current
    return () => setDocument?.(undefined, owner)
  }, [setDocument])

  async function refreshMetadata() {
    setRefreshError('')

    try {
      await (storage?.onSaved
        ? storage.onSaved()
        : cache.invalidateQueries(
            { queryKey: workspaceAPI.user.pages.list.key },
            { throwOnError: true }
          ))
    } catch {
      setRefreshError(t('refreshFailed'))
    }
  }

  const update = (block: CanvasBlock) => {
    if (block.id === tail.current.id) tail.current = newCanvasBlock('document')
    setDraft(current => {
      const latest = current ?? saved
      return {
        ...latest,
        blocks: latest.blocks.some(item => item.id === block.id)
          ? latest.blocks.map(item => (item.id === block.id ? block : item))
          : [...latest.blocks, block]
      }
    })
  }
  const insertAfter = (after: string, block: CanvasBlock) =>
    setDraft(current => {
      const latest = current ?? saved
      const blocks = [...latest.blocks]
      const index = blocks.findIndex(item => item.id === after)
      const anchor = blocks[index]
      const replace =
        anchor?.type === 'document' &&
        parseContent(anchor.content).content.every(
          node => node.type === 'paragraph' && !node.content?.length
        )
      blocks.splice(
        index < 0 ? blocks.length : index + (replace ? 0 : 1),
        replace ? 1 : 0,
        block
      )
      return { ...latest, blocks }
    })
  const reorder = (id: string, before: string | null) =>
    setDraft(current => ({
      ...(current ?? saved),
      blocks: moveCanvasBlock((current ?? saved).blocks, id, before)
    }))

  async function save() {
    if (!draft || saving.current || !editing) return
    saving.current = true
    const submitted = draft
    setPending(true)
    setError('')

    try {
      const result = await (storage
        ? storage.save(submitted)
        : workspaceAPI.user.pages.save.mutate({
            key,
            page: draft,
            expected_revision: submitted.revision
          }))
      validateCanvasPage(result.page)
      const savedPage = result.page
      cache.setQueryData(
        storage?.queryKey ?? [...options.queryKey, owner],
        result
      )
      setDraft(current =>
        current && JSON.stringify(current) !== JSON.stringify(submitted)
          ? {
              ...current,
              revision: savedPage.revision,
              updated: savedPage.updated
            }
          : null
      )
      void refreshMetadata()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('saveFailed'))
    } finally {
      saving.current = false
      setPending(false)
    }
  }

  async function reloadSaved() {
    if (saving.current) return
    setConfirmReload(false)
    saving.current = true
    setReloading(true)

    try {
      const result = await query.refetch()

      if (result.error) throw result.error
      setDraft(null)
      setInvalid({})
      setError('')
      void refreshMetadata()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      saving.current = false
      setReloading(false)
    }
  }
  useEffect(() => {
    if (
      !dirty ||
      pending ||
      error ||
      !valid ||
      Object.values(invalid).some(Boolean) ||
      !editing
    )
      return

    const timer = window.setTimeout(() => void save(), 800)

    return () => window.clearTimeout(timer)
  }, [draft, dirty, pending, error, valid, invalid, editing])
  if (query.isLoading) return <Text role="status">{t('loading')}</Text>
  if (key.startsWith('/page/') && query.data?.page === null && !draft)
    return <Text role="alert">{t('loadFailed')}</Text>
  if (query.isError && !query.data && !draft)
    return (
      <Stack role="alert">
        <Text>{t('loadFailed')}</Text>
        <Button onClick={() => void query.refetch()}>{t('retry')}</Button>
      </Stack>
    )

  return (
    <Stack
      className="workspace-canvas"
      data-full-width={
        appearance.contentWidth
          ? appearance.contentWidth === 'full'
          : page.fullWidth
      }
      gap="md"
    >
      {dirty && <CanvasDraftGuard dirty={dirty} pending={pending} />}
      {(!chrome || (dirty && !!error)) && (
        <Flex className="canvas-page-tools" gap="sm" justify="end" wrap="wrap">
          {editing ? (
            <>
              {!chrome && openEditor && (
                <Button
                  namespace={false}
                  variant="plain"
                  icon="lucide:palette"
                  onClick={() => openEditor('page')}
                >
                  {t('common.appearance:customize')}
                </Button>
              )}
              {!chrome && (
                <Text aria-live="polite" color="muted" role="status" size="sm">
                  {t(pending ? 'saving' : dirty ? 'unsaved' : 'saved')}
                </Text>
              )}
              {!chrome && (
                <Button
                  namespace={false}
                  variant="plain"
                  onClick={() =>
                    setDraft({ ...page, fullWidth: !page.fullWidth })
                  }
                >
                  {t(page.fullWidth ? 'standardWidth' : 'fullWidth')}
                </Button>
              )}
              {dirty && (
                <Button
                  disabled={!valid || Object.values(invalid).some(Boolean)}
                  loading={pending}
                  namespace={false}
                  onClick={() => void save()}
                >
                  {t('savePage')}
                </Button>
              )}
            </>
          ) : (
            <Text color="muted" role="status" size="sm">
              {t(reloading ? 'loading' : 'readOnly')}
            </Text>
          )}
        </Flex>
      )}
      <Stack className="canvas-page-heading" gap="md">
        {openEditor && editing ? (
          <Box
            as="button"
            type="button"
            aria-label={t('common.appearance:changeIcon')}
            width="fit-content"
            bg="transparent"
            p="none"
            onClick={() => openEditor('page')}
          >
            <Icon
              aria-hidden="true"
              className="canvas-page-icon"
              icon={appearance.icon ?? page.icon}
              preserveStyle={!!appearance.icon}
              size="36px"
            />
          </Box>
        ) : (
          <Icon
            aria-hidden="true"
            className="canvas-page-icon"
            icon={appearance.icon ?? page.icon}
            preserveStyle={!!appearance.icon}
            size="36px"
          />
        )}
        {editing ? (
          <Box
            aria-label={t('pageTitle')}
            as="input"
            className="canvas-inline-page-title"
            value={page.title}
            onChange={event => {
              setDraft({ ...page, title: event.target.value })
            }}
          />
        ) : (
          <Text as="h1" overflowWrap="anywhere">
            {page.title}
          </Text>
        )}
      </Stack>
      {(error || loadError) && (
        <Flex align="center" gap="sm" wrap="wrap">
          <Text color="dangerous" role="alert">
            {error || loadError}
          </Text>
          <Button
            disabled={pending || reloading}
            namespace={false}
            variant="secondary"
            onClick={() => setConfirmReload(true)}
          >
            {t('reloadSaved')}
          </Button>
        </Flex>
      )}
      {refreshError && (
        <Flex align="center" gap="sm" wrap="wrap">
          <Text color="muted" role="alert" size="sm">
            {refreshError}
          </Text>
          <Button
            namespace={false}
            variant="plain"
            onClick={() => void refreshMetadata()}
          >
            {t('retry')}
          </Button>
        </Flex>
      )}
      {confirmReload && (
        <Flex gap="sm" role="alert" wrap="wrap">
          <Text>{t('reloadConfirm')}</Text>
          <Button
            autoFocus
            namespace={false}
            variant="secondary"
            onClick={() => setConfirmReload(false)}
          >
            {t('keepEditing')}
          </Button>
          <Button
            dangerous
            disabled={pending || reloading}
            namespace={false}
            onClick={() => void reloadSaved()}
          >
            {t('discard')}
          </Button>
        </Flex>
      )}
      {widgetScope ? (
        <WidgetBoard
          blocks={page.blocks}
          scope={widgetScope}
          nativeTitle={title}
          readOnly={!editing}
          onChange={blocks =>
            setDraft(current => ({ ...(current ?? saved), blocks }))
          }
          render={block =>
            block.type === 'widget' ? (
              <WidgetContent block={block} editing={editing} update={update} />
            ) : (
              <CanvasBlockContent
                block={block}
                editing={false}
                native={native}
                onChange={update}
                onValidity={() => undefined}
              />
            )
          }
        />
      ) : (
        <Box className="canvas-block-grid" minWidth="0" width="100%">
          {[
            ...page.blocks,
            ...(editing && page.blocks.at(-1)?.type !== 'document'
              ? [tail.current]
              : [])
          ].map((block, index) => (
            <CanvasBlockFrame
              key={block.id}
              block={block}
              blocks={page.blocks}
              editing={editing}
              index={index}
              native={native}
              onChange={update}
              onInsertBlock={(kind, anchor) => {
                if (kind === 'database')
                  setDatabaseInsert({
                    after: block.id,
                    anchor: { getBoundingClientRect: () => anchor }
                  })
                else if (kind === 'callout' || kind === 'divider')
                  insertAfter(block.id, newCanvasBlock(kind))
              }}
              onMove={reorder}
              onRemove={() => {
                setDraft({
                  ...page,
                  blocks: page.blocks.filter(item => item.id !== block.id)
                })
                setInvalid(old => {
                  const copy = { ...old }
                  delete copy[block.id]

                  return copy
                })
              }}
              onValidity={valid =>
                setInvalid(old =>
                  old[block.id] === !valid
                    ? old
                    : { ...old, [block.id]: !valid }
                )
              }
            />
          ))}
        </Box>
      )}
      {editing && databaseInsert && (
        <FloatingPopover
          anchor={databaseInsert.anchor}
          label={t('common.inlineDatabase:title')}
          width={340}
          onClose={() => setDatabaseInsert(undefined)}
        >
          <InlineDatabasePicker
            onInsert={(reference, title) => {
              insertAfter(
                databaseInsert.after,
                newCanvasBlock('database', { title, database: reference })
              )
              setDatabaseInsert(undefined)
            }}
          />
        </FloatingPopover>
      )}
    </Stack>
  )
}

function WidgetContent({
  block,
  editing,
  update
}: {
  block: CanvasBlock
  editing: boolean
  update: (block: CanvasBlock) => void
}) {
  const { render } = useCanvasWidgets()
  return (
    <>
      {render(block.widget, {
        filter: block.content,
        readOnly: !editing,
        onConfigChange: editing
          ? content => update({ ...block, content })
          : undefined
      })}
    </>
  )
}
