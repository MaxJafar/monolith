import { Text as EditorText } from '@blocksuite/store'
import { Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

import { Box, Stack, Text } from '@/components/primitives'
import { usePageChrome } from '@/providers/PageChromeProvider'

import BlockActions from './BlockActions'
import { DocumentReferences } from './References'
import { DocumentSlashMenu } from './SlashMenu'
import { DocumentAdapter } from './adapter'
import './document.css'
import type { DatabaseChoiceOptions, DocumentEditorProps } from './index'
import { bindDocumentInteractions } from './interactions'
import type { EmbedMount } from './views'
import { DocumentWorkspace } from './workspace'

function chooseInlineDatabase(
  runtime: DocumentAdapter,
  choose: DocumentEditorProps['chooseDatabase'],
  options: DatabaseChoiceOptions,
  sourceId?: string
) {
  const source = sourceId && runtime.store.getModelById(sourceId)
  const sourceParent = source && runtime.store.getParent(source)
  const point =
    source && sourceParent
      ? { parentId: sourceParent.id, afterId: source.id }
      : runtime.insertionPoint()
  if (!point || runtime.store.readonly) return
  choose?.(reference => {
    const parent = runtime.store.getModelById(point.parentId)
    if (!parent || runtime.store.readonly || !runtime.host.isConnected) return
    const current = point.afterId && runtime.store.getModelById(point.afterId)
    if (
      point.afterId &&
      (!current || runtime.store.getParent(current)?.id !== parent.id)
    )
      return
    const index = parent.children.findIndex(child => child.id === point.afterId)
    runtime.store.captureSync()
    runtime.store.transact(() => {
      const replace =
        sourceId &&
        current &&
        current.flavour === 'affine:paragraph' &&
        !current.children.length &&
        !String((current.props as { text?: unknown }).text ?? '').trim()
      const id = runtime.store.addBlock(
        'monolith:linked-database',
        reference,
        parent.id,
        index < 0 ? undefined : index + 1
      )
      if (replace) runtime.store.deleteBlock(current)
      runtime.select([id])
    })
    runtime.store.captureSync()
  }, options)
}

export default function DocumentBody(props: DocumentEditorProps) {
  const { t } = useTranslation('common')
  const mount = useRef<HTMLDivElement>(null)
  const callbacks = useRef({ ...props, t })
  callbacks.current = { ...props, t }
  const [initial] = useState(() => ({
    workspaceId: props.workspaceId,
    snapshot: props.initialSnapshot
  }))
  const [adapter, setAdapter] = useState<DocumentAdapter>()
  const setUndo = usePageChrome()?.setUndo
  const [embeds, setEmbeds] = useState(new Map<string, EmbedMount>())
  const [error, setError] = useState('')
  const [blockMenu, setBlockMenu] = useState<{ x: number; y: number }>()
  useLayoutEffect(() => {
    const workspace = new DocumentWorkspace(initial.workspaceId)
    let runtime: DocumentAdapter | undefined
    let unbind: (() => void) | undefined
    let canceled = false
    let disposed = false
    const dispose = () => {
      if (!disposed) {
        disposed = true
        workspace.dispose()
      }
    }
    let changeFrame = 0
    let changed: (() => void) | undefined
    const scratch = workspace.createDoc('monolith-import').getStore()
    scratch.load()
    void (async () => {
      const store = await scratch
        .getTransformer()
        .snapshotToDoc(initial.snapshot)
      if (canceled) return
      if (!store) throw new Error('Document snapshot could not be restored')
      // Upstream 0.22.4 logs some transformer failures and returns a partial
      // store. Never mount or autosave a document whose blocks were dropped.
      const assertImported = (block: typeof initial.snapshot.blocks) => {
        const model = store.getModelById(block.id)
        if (
          !model ||
          model.flavour !== block.flavour ||
          model.children.length !== block.children.length ||
          model.children.some(
            (child, index) => child.id !== block.children[index]?.id
          )
        )
          throw new Error('Document snapshot could not be fully restored')
        block.children.forEach(assertImported)
      }
      assertImported(initial.snapshot.blocks)
      workspace.removeDoc('monolith-import')
      workspace.meta.setDocMeta(store.id, initial.snapshot.meta)
      store.readonly = callbacks.current.readOnly ?? false
      store.resetHistory()
      runtime = new DocumentAdapter(
        store,
        callbacks.current.chooseDatabase
          ? {
              label: callbacks.current.t('inlineDatabase.title'),
              layouts: Object.fromEntries(
                [
                  'table',
                  'kanban',
                  'calendar',
                  'gallery',
                  'list',
                  'chart',
                  'dashboard',
                  'timeline'
                ].map(mode => [
                  mode,
                  callbacks.current.t(`inlineDatabase.modes.${mode}`)
                ])
              ) as Record<NonNullable<DatabaseChoiceOptions['mode']>, string>,
              choose: (blockId, mode) => {
                if (!runtime) return
                const anchor = Array.from(
                  runtime.host.querySelectorAll<HTMLElement>('[data-block-id]')
                ).find(element => element.dataset.blockId === blockId)
                chooseInlineDatabase(
                  runtime,
                  callbacks.current.chooseDatabase,
                  { anchor, mode },
                  blockId
                )
              }
            }
          : undefined
      )
      runtime.host.addEventListener('monolith-embed', event => {
        const detail = (event as CustomEvent<EmbedMount>).detail
        setEmbeds(previous => new Map(previous).set(detail.id, detail))
      })
      runtime.host.addEventListener('monolith-embed-remove', event => {
        const id = (event as CustomEvent<{ id: string }>).detail.id
        setEmbeds(previous => {
          const next = new Map(previous)
          next.delete(id)
          return next
        })
      })
      mount.current!.append(runtime.host)
      unbind = bindDocumentInteractions(runtime, {
        selectBlock: callbacks.current.t('documentEditor.selectBlock'),
        movingBlocks: count =>
          callbacks.current.t('documentEditor.movingBlocks', { count }),
        error: cause => setError(String(cause)),
        menu: position => setBlockMenu(position)
      })
      changed = () => {
        if (store.readonly || changeFrame) return
        changeFrame = requestAnimationFrame(() => {
          changeFrame = 0
          try {
            callbacks.current.onChange?.(runtime!.snapshot())
          } catch (cause) {
            setError(String(cause))
          }
        })
      }
      store.spaceDoc.on('update', changed)
      setAdapter(runtime)
    })()
      .catch(cause => {
        if (!canceled) setError(String(cause))
        unbind?.()
        runtime?.dispose()
        runtime = undefined
        dispose()
      })
      .finally(() => {
        if (canceled && !runtime) dispose()
      })
    return () => {
      canceled = true
      if (runtime && changed) {
        runtime.store.spaceDoc.off('update', changed)
        // Do not drop the last keystroke when navigating before the next frame.
        if (changeFrame) callbacks.current.onChange?.(runtime.snapshot())
      }
      cancelAnimationFrame(changeFrame)
      unbind?.()
      runtime?.dispose()
      if (runtime) dispose()
    }
  }, [initial])
  useEffect(() => {
    if (adapter) adapter.store.readonly = props.readOnly ?? false
  }, [adapter, props.readOnly])
  useEffect(() => {
    if (!adapter || props.readOnly) return
    return setUndo?.(() => adapter.store.undo())
  }, [adapter, props.readOnly, setUndo])
  return (
    <Stack gap="md" minWidth="0">
      {props.readOnly ? (
        <Text as="h1" size="3xl" weight="semibold">
          {initial.snapshot.meta.title}
        </Text>
      ) : (
        <Box
          as="input"
          className="monolith-document-title"
          aria-label={t('documentEditor.title')}
          defaultValue={initial.snapshot.meta.title}
          maxLength={255}
          onChange={event => {
            if (adapter?.store.root && !adapter.store.readonly)
              adapter.store.updateBlock(adapter.store.root, {
                title: new EditorText(event.target.value)
              })
          }}
        />
      )}
      {props.afterTitle}
      {error && (
        <Text role="alert">
          {t('documentEditor.editorError')} {error}
        </Text>
      )}
      <Box ref={mount} className="monolith-document-body" minWidth="0" />
      {adapter && (
        <DocumentReferences adapter={adapter} workspaceId={props.workspaceId} />
      )}
      {adapter && !props.readOnly && (
        <DocumentSlashMenu
          adapter={adapter}
          label={t('documentEditor.addBlock')}
          emptyLabel={t('workspaceUI.noResults')}
          closeLabel={t('workspaceUI.searchShortcuts')}
        />
      )}
      {adapter && blockMenu && !props.readOnly && (
        // Lazy menu translations must not suspend and remount the live editor.
        <Suspense fallback={null}>
          <BlockActions
            adapter={adapter}
            position={blockMenu}
            onClose={() => setBlockMenu(undefined)}
            onError={cause => setError(String(cause))}
          />
        </Suspense>
      )}
      {Array.from(embeds.values()).map(embed =>
        createPortal(
          props.renderEmbed?.({
            ...embed,
            updateProps: props.readOnly
              ? undefined
              : patch => {
                  const model = adapter?.store.getModelById(embed.id)
                  if (!model || adapter?.store.readonly) return
                  adapter!.store.captureSync()
                  adapter!.store.updateBlock(model, patch)
                  adapter!.store.captureSync()
                }
          }) ?? (
            <Text color="muted">{t('documentEditor.unavailableEmbed')}</Text>
          ),
          embed.container,
          embed.id
        )
      )}
    </Stack>
  )
}
