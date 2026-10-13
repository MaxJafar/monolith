import { useQuery, useQueryClient } from '@tanstack/react-query'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'

import { useAuth } from '@lifeforge/api'
import {
  type CanvasBlock,
  type CanvasPage,
  moveCanvasBlock,
  validateCanvasPage
} from '@lifeforge/blocks'
import { useModuleTranslation } from '@lifeforge/localization'

import { Button } from '@/components/inputs'
import { Box, Flex, Icon, Stack, Text } from '@/components/primitives'
import { forgeAPI } from '@/utils/forgeAPI'

import { CanvasBlockFrame } from './BlockFrame'
import { CanvasBlockMenu } from './BlockMenu'
import { CanvasDraftGuard } from './DraftGuard'
import './canvas.css'
import { defaultCanvasPage } from './defaults'

export * from './CanvasWidgets'

export type CanvasPageStorage = {
  title?: string
  initialPage?: CanvasPage
  initialDataUpdatedAt?: number
  queryKey: readonly unknown[]
  load: () => Promise<{ page: CanvasPage | null }>
  save: (page: CanvasPage) => Promise<{ page: CanvasPage }>
  onSaved?: () => Promise<unknown>
  readOnly?: boolean
}

export function WorkspaceCanvas({
  title,
  native,
  storage,
  translationNamespace
}: {
  title: string
  native: ReactNode
  storage?: CanvasPageStorage
  translationNamespace?: string
}) {
  const location = useLocation(),
    key = location.pathname
  const { userData } = useAuth(),
    owner = userData?.id

  const { t } = useTranslation([
    'common.canvas',
    ...(translationNamespace ? [translationNamespace] : [])
  ])
  const { t: moduleT, i18n, ns } = useModuleTranslation()
  const cache = useQueryClient()

  const endpoint = forgeAPI.user.pages.get.input({ key })
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
        ].map(label => [label, t(label)])
      )
    )
  }, [key, title, t, moduleT, i18n, ns, storage?.title, translationNamespace])

  const [draft, setDraft] = useState<CanvasPage | null>(null)

  const [menu, setMenu] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [refreshError, setRefreshError] = useState(''),
    [reloading, setReloading] = useState(false),
    [confirmReload, setConfirmReload] = useState(false)

  const [invalid, setInvalid] = useState<Record<string, boolean>>({})

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

  async function refreshMetadata() {
    setRefreshError('')

    try {
      await (storage?.onSaved
        ? storage.onSaved()
        : cache.invalidateQueries(
            { queryKey: forgeAPI.user.pages.list.key },
            { throwOnError: true }
          ))
    } catch {
      setRefreshError(t('refreshFailed'))
    }
  }

  const update = (block: CanvasBlock) =>
    setDraft(current => ({
      ...(current ?? saved),
      blocks: (current ?? saved).blocks.map(item =>
        item.id === block.id ? block : item
      )
    }))
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
        : forgeAPI.user.pages.save.mutate({
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
      setMenu(false)
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
      data-full-width={page.fullWidth}
      gap="md"
    >
      {dirty && <CanvasDraftGuard dirty={dirty} pending={pending} />}
      <Flex className="canvas-page-tools" gap="sm" justify="end" wrap="wrap">
        {editing ? (
          <>
            <Text aria-live="polite" color="muted" role="status" size="sm">
              {t(pending ? 'saving' : dirty ? 'unsaved' : 'saved')}
            </Text>
            <Button
              namespace={false}
              variant="plain"
              onClick={() => setDraft({ ...page, fullWidth: !page.fullWidth })}
            >
              {t(page.fullWidth ? 'standardWidth' : 'fullWidth')}
            </Button>
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
      <Stack className="canvas-page-heading" gap="md">
        <Icon
          aria-hidden="true"
          className="canvas-page-icon"
          icon={page.icon}
          size="36px"
        />
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
      <Box className="canvas-block-grid" minWidth="0" width="100%">
        {page.blocks.map((block, index) => (
          <CanvasBlockFrame
            key={block.id}
            block={block}
            blocks={page.blocks}
            editing={editing}
            index={index}
            native={native}
            onChange={update}
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
                old[block.id] === !valid ? old : { ...old, [block.id]: !valid }
              )
            }
          />
        ))}
      </Box>
      {editing && (
        <>
          <Button
            icon="lucide:plus"
            namespace={false}
            variant="plain"
            onClick={() => setMenu(!menu)}
          >
            {t('addBlock')}
          </Button>
          {menu && (
            <CanvasBlockMenu
              allowNative={
                !key.startsWith('/page/') &&
                !page.blocks.some(block => block.type === 'native')
              }
              onAdd={block => {
                setDraft({ ...page, blocks: [...page.blocks, block] })
                setMenu(false)
              }}
            />
          )}
        </>
      )}
    </Stack>
  )
}
