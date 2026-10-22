import {
  type PageTarget,
  pageKey,
  parseContent,
  serializeDocument
} from '@monolith/blocks'
import Placeholder from '@tiptap/extension-placeholder'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import {
  type Editor,
  EditorContent,
  useEditor,
  useEditorState
} from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button, TextInput } from '@/components/inputs'
import { type InlineDatabaseMode, useCanvasWidgets } from '@/components/layout/WorkspaceCanvas/CanvasWidgets'
import { InlineDatabasePicker } from '@/components/layout/WorkspaceCanvas/InlineDatabasePicker'
import { FloatingPopover } from '@/components/overlays/FloatingPopover'
import { Box, Flex, Stack, Text } from '@/components/primitives'

import { BlockGrips } from './BlockGrips'
import {
  CalloutBlock,
  LinkedDatabaseBlock,
  pageBlockExtension
} from './EmbeddedBlocks'
import './editor.css'
import { BlockDragging, BlockIds, pageLinkExtension } from './extensions'

export type BlockEditorProps = {
  value: string
  onChange?: (value: string) => void
  onValidityChange?: (valid: boolean) => void
  pages?: PageTarget[]
  onOpenPage?: (page: Pick<PageTarget, 'id' | 'kind'>) => void
  readOnly?: boolean
  label?: string
  onInsertBlock?: (kind: string, anchor: DOMRect) => void
  onCreatePage?: (title: string) => Promise<PageTarget | undefined>
}

function slashAtSelection(editor: Editor) {
  const { $from, empty } = editor.state.selection

  if (
    !editor.isEditable ||
    !empty ||
    $from.parent.type.name !== 'paragraph' ||
    $from.pos !== $from.end() ||
    !$from.parent.textContent.startsWith('/') ||
    $from.parent.content.size !== $from.parent.textContent.length
  )
    return null

  return {
    from: $from.start(),
    to: $from.end(),
    query: $from.parent.textContent.slice(1).trim()
  }
}

export function BlockEditor({
  value,
  onChange,
  onValidityChange,
  pages = [],
  onOpenPage,
  readOnly = false,
  label,
  onInsertBlock,
  onCreatePage
}: BlockEditorProps) {
  const { t } = useTranslation('common')
  const catalog = useCanvasWidgets()
  const callbacks = useRef({ onChange, onOpenPage, onValidityChange })

  callbacks.current = { onChange, onOpenPage, onValidityChange }

  const ready = useRef(false)
  const readOnlyRef = useRef(readOnly)

  readOnlyRef.current = readOnly

  const slashRef = useRef<ReturnType<typeof slashAtSelection>>(null)
  const lastEmitted = useRef(value)
  const [menu, setMenu] = useState<'blocks' | 'links' | null>(null)
  const [search, setSearch] = useState('')
  const [slash, setSlash] = useState<{ from: number; to: number } | null>(null)
  const [error, setError] = useState('')
  const [blockSearch, setBlockSearch] = useState('')
  const [selected, setSelected] = useState(0)
  const [actions, setActions] = useState(false)
  const [anchor, setAnchor] = useState({ left: 0, top: 0 })
  const [databaseAnchor, setDatabaseAnchor] = useState<DOMRect | null>(null)
  const [databaseMode, setDatabaseMode] = useState<InlineDatabaseMode>('table')
  const insertPosition = useRef(0)
  const [linkAsBlock, setLinkAsBlock] = useState(false)
  const [creatingPage, setCreatingPage] = useState(false)

  function syncSlash(current: Editor) {
    const next = readOnlyRef.current ? null : slashAtSelection(current)
    const previous = slashRef.current
    slashRef.current = next

    if (!next) {
      if (previous) {
        setSlash(null)
        setMenu(value => (value === 'blocks' ? null : value))
      }

      return
    }
    setSlash({ from: next.from, to: next.to })
    setMenu('blocks')
    setBlockSearch(next.query)
    if (previous?.query !== next.query || previous.from !== next.from)
      setSelected(0)

    const cursor = current.view.coordsAtPos(current.state.selection.from)
    setAnchor({
      left: Math.max(12, Math.min(cursor.left, window.innerWidth - 300)),
      top: Math.min(cursor.bottom + 8, window.innerHeight - 330)
    })
  }

  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          HTMLAttributes: {
            target: '_blank',
            rel: 'noopener noreferrer',
            class: null
          }
        }
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      BlockIds,
      BlockDragging,
      LinkedDatabaseBlock,
      CalloutBlock,
      pageBlockExtension(page => callbacks.current.onOpenPage?.(page)),
      Placeholder.configure({ placeholder: t('blocks.placeholder') }),
      pageLinkExtension(page => callbacks.current.onOpenPage?.(page))
    ],
    content: parseContent(value),
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-label': label ?? t('blocks.editor'),
        'aria-multiline': 'true',
        class: 'zillion-prose'
      }
    },
    onCreate() {
      ready.current = true
    },
    onUpdate({ editor: current }) {
      if (!ready.current || readOnlyRef.current || !current.isEditable) return

      try {
        const next = serializeDocument(current.getJSON())
        lastEmitted.current = next
        callbacks.current.onChange?.(next)
        callbacks.current.onValidityChange?.(true)
        setError('')
      } catch (failure) {
        callbacks.current.onValidityChange?.(false)
        setError(failure instanceof Error ? failure.message : String(failure))
      }

      syncSlash(current)
    },
    onSelectionUpdate({ editor: current }) {
      syncSlash(current)
    },
    onBlur() {
      if (slashRef.current) {
        slashRef.current = null
        setSlash(null)
        setMenu(previous => (previous === 'blocks' ? null : previous))
      }
    }
  })
  const active = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current?.isActive('bold'),
      italic: current?.isActive('italic'),
      code: current?.isActive('code'),
      undo: current?.can().undo(),
      redo: current?.can().redo(),
      from: current?.state.selection.from,
      empty: current?.state.selection.empty,
      focused: current?.isFocused
    })
  })

  useEffect(() => {
    if (editor && value !== lastEmitted.current) {
      editor.commands.setContent(parseContent(value), { emitUpdate: false })
      lastEmitted.current = value
      setError('')
      callbacks.current.onValidityChange?.(true)
    }
  }, [editor, value])

  useEffect(() => () => callbacks.current.onValidityChange?.(true), [])

  useEffect(() => {
    editor?.setEditable(!readOnly, false)

    if (readOnly) {
      slashRef.current = null
      setSlash(null)
      setMenu(null)
      setActions(false)
    }
  }, [editor, readOnly])
  useEffect(() => {
    if (!editor) return

    const catalog = new Map(pages.map(page => [pageKey(page), page]))

    for (const element of editor.view.dom.querySelectorAll<HTMLElement>(
      '[data-page-id]'
    )) {
      const target = catalog.get(
        `${element.dataset.pageKind}:${element.dataset.pageId}`
      )
      element.dataset.unavailable = target ? 'false' : 'true'
      element.title = target ? target.title : t('blocks.unavailable')
    }
  }, [editor, pages, value, t])

  if (!editor)
    return (
      <Text color="muted" role="status">
        {t('blocks.loading')}
      </Text>
    )

  function insert(kind: string) {
    if (!editor || readOnly || !editor.isEditable) return
    let chain = editor.chain().focus()

    if (slash) {
      const current = slashAtSelection(editor)

      if (!current || current.from !== slash.from || current.to !== slash.to) {
        setMenu(null)
        setSlash(null)
        slashRef.current = null

        return
      }
      chain = chain.deleteRange(slash)
    }
    slashRef.current = null
    if (kind === 'database' || kind.startsWith('database:')) {
      const cursor = editor.view.coordsAtPos(editor.state.selection.from)
      chain.run()
      insertPosition.current = editor.state.selection.from
      setMenu(null)
      setSlash(null)
      setDatabaseMode((kind.split(':')[1] ?? 'table') as InlineDatabaseMode)
      setDatabaseAnchor(new DOMRect(cursor.left, cursor.bottom, 1, 1))
      return
    }
    if (kind === 'page') {
      chain.run()
      insertPosition.current = editor.state.selection.from
      setSlash(null)
      setSearch('')
      setLinkAsBlock(true)
      setMenu('links')
      return
    }
    if (['database', 'callout', 'divider'].includes(kind) && onInsertBlock) {
      const cursor = editor.view.coordsAtPos(editor.state.selection.from)
      chain.run()
      setMenu(null)
      setSlash(null)
      onInsertBlock(kind, new DOMRect(cursor.left, cursor.bottom, 1, 1))
      return
    }
    if (kind === 'paragraph') chain.clearNodes().setParagraph().run()
    if (kind.startsWith('heading'))
      chain
        .clearNodes()
        .setHeading({ level: Number(kind.slice(-1)) as 1 | 2 | 3 })
        .run()
    if (kind === 'bulletList') chain.toggleBulletList().run()
    if (kind === 'orderedList') chain.toggleOrderedList().run()
    if (kind === 'taskList') chain.toggleTaskList().run()
    if (kind === 'blockquote') chain.toggleBlockquote().run()
    if (kind === 'codeBlock') chain.toggleCodeBlock().run()
    if (kind === 'horizontalRule') chain.setHorizontalRule().run()
    if (kind === 'callout') chain.wrapIn('callout').run()
    setMenu(null)
    setSlash(null)
  }

  function blockAction(action: 'up' | 'down' | 'duplicate' | 'delete') {
    if (!editor || readOnly || !editor.isEditable) return

    const { $from } = editor.state.selection

    if (!$from.depth) return

    const index = $from.index(0)
    const current = editor.state.doc.child(index)

    let from = 0
    for (let i = 0; i < index; i++) from += editor.state.doc.child(i).nodeSize

    const to = from + current.nodeSize

    if (action === 'duplicate') {
      editor.chain().focus().insertContentAt(to, current.toJSON()).run()

      return
    }

    if (action === 'delete') {
      editor.chain().focus().deleteRange({ from, to }).run()

      return
    }

    const otherIndex = index + (action === 'up' ? -1 : 1)

    if (otherIndex < 0 || otherIndex >= editor.state.doc.childCount) return

    const other = editor.state.doc.child(otherIndex)
    const transaction = editor.state.tr.delete(from, to)
    const destination =
      action === 'up' ? from - other.nodeSize : from + other.nodeSize
    transaction.insert(destination, current)
    editor.view.dispatch(transaction)
    editor.commands.setTextSelection(
      Math.min(destination + 1, editor.state.doc.content.size)
    )
    editor.commands.focus()
  }

  const choices = [
    'paragraph',
    ...(catalog.createDatabase || catalog.databases?.length
      ? ['database', 'database:table', 'database:kanban', 'database:gallery', 'database:list', 'database:calendar']
      : []),
    'heading1',
    'heading2',
    'heading3',
    'bulletList',
    'orderedList',
    'taskList',
    'blockquote',
    'codeBlock',
    'horizontalRule',
    'page',
    'callout'
  ]
  const choiceLabel = (kind: string) =>
    t(kind === 'database'
      ? 'inlineDatabase.title'
      : kind.startsWith('database:')
        ? `inlineDatabase.modes.${kind.split(':')[1]}`
        : ['callout', 'divider'].includes(kind)
          ? `canvas.types.${kind}`
          : `blocks.types.${kind}`)
  const filteredPages = pages
    .filter(page =>
      `${page.title} ${page.context ?? ''}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase())
    )
    .slice(0, 40)
  const filteredChoices = choices.filter(
    kind =>
      choiceLabel(kind)
        .toLocaleLowerCase()
        .includes(blockSearch.toLocaleLowerCase()) ||
      (kind === 'database:kanban' && 'board'.includes(blockSearch.toLowerCase())) ||
      (kind === 'database' && 'inline database'.includes(blockSearch.toLowerCase())) ||
      kind.toLowerCase().includes(blockSearch.toLowerCase())
  )

  return (
    <Stack
      className="zillion-block-editor"
      gap="sm"
      minWidth="0"
      onKeyDown={event => {
        if (event.key === 'Escape') {
          setMenu(null)
          setSlash(null)
          setActions(false)
        }
      }}
      onKeyDownCapture={event => {
        if (readOnly || !editor.isEditable || event.nativeEvent.isComposing)
          return

        if (menu === 'blocks') {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            setSelected(
              index =>
                (index +
                  (event.key === 'ArrowDown' ? 1 : -1) +
                  Math.max(1, filteredChoices.length)) %
                Math.max(1, filteredChoices.length)
            )
          }

          if (event.key === 'Enter' && filteredChoices[selected]) {
            event.preventDefault()
            insert(filteredChoices[selected])
          }
        }

        if (
          (event.metaKey || event.ctrlKey) &&
          event.altKey &&
          ['ArrowUp', 'ArrowDown'].includes(event.key)
        ) {
          event.preventDefault()
          blockAction(event.key === 'ArrowUp' ? 'up' : 'down')
        }
      }}
    >
      {!readOnly && (
        <Flex
          align="center"
          aria-label={t('blocks.toolbar')}
          className="monolith-editor-toolbar"
          data-focused={
            (active?.focused && !active?.empty) || menu === 'links' || actions
          }
          data-selection={!active?.empty}
          gap="xs"
          role="toolbar"
          wrap="wrap"
          onMouseDown={event => {
            if (
              event.target instanceof Element &&
              event.target.closest('button')
            )
              event.preventDefault()
          }}
        >
          <Button
            aria-expanded={menu === 'blocks'}
            icon="tabler:plus"
            namespace={false}
            variant="secondary"
            onClick={() => {
              setSlash(null)
              setMenu(menu === 'blocks' ? null : 'blocks')
              setBlockSearch('')
              setSelected(0)
              const cursor = editor.view.coordsAtPos(
                editor.state.selection.from
              )
              setAnchor({
                left: Math.max(
                  12,
                  Math.min(cursor.left, window.innerWidth - 300)
                ),
                top: Math.min(cursor.bottom + 8, window.innerHeight - 330)
              })
            }}
          >
            {t('blocks.add')}
          </Button>
          {(
            [
              ['bold', 'tabler:bold'],
              ['italic', 'tabler:italic'],
              ['code', 'tabler:code']
            ] as const
          ).map(([mark, icon]) => (
            <Button
              key={mark}
              aria-label={t(`blocks.${mark}`)}
              aria-pressed={!!active?.[mark]}
              icon={icon}
              namespace={false}
              variant={active?.[mark] ? 'secondary' : 'plain'}
              onClick={() => {
                editor.chain().focus().toggleMark(mark).run()
              }}
            />
          ))}
          <Button
            aria-expanded={menu === 'links'}
            icon="tabler:link"
            namespace={false}
            variant="plain"
            onClick={() => {
              setMenu(menu === 'links' ? null : 'links')
              setSearch('')
              setLinkAsBlock(false)
            }}
          >
            {t('blocks.linkPage')}
          </Button>
          <Button
            aria-label={t('blocks.undo')}
            disabled={!active?.undo}
            icon="tabler:arrow-back-up"
            namespace={false}
            variant="plain"
            onClick={() => {
              editor.chain().focus().undo().run()
            }}
          />
          <Button
            aria-label={t('blocks.redo')}
            disabled={!active?.redo}
            icon="tabler:arrow-forward-up"
            namespace={false}
            variant="plain"
            onClick={() => {
              editor.chain().focus().redo().run()
            }}
          />
          <Button
            aria-expanded={actions}
            aria-label={t('blocks.toolbar')}
            icon="lucide:ellipsis"
            variant="plain"
            onClick={() => setActions(!actions)}
          />
          {actions && (
            <>
              <Button
                aria-label={t('blocks.moveUp')}
                icon="tabler:arrow-up"
                namespace={false}
                variant="plain"
                onClick={() => blockAction('up')}
              />
              <Button
                aria-label={t('blocks.moveDown')}
                icon="tabler:arrow-down"
                namespace={false}
                variant="plain"
                onClick={() => blockAction('down')}
              />
              <Button
                aria-label={t('blocks.duplicate')}
                icon="tabler:copy"
                namespace={false}
                variant="plain"
                onClick={() => blockAction('duplicate')}
              />
              <Button
                aria-label={t('blocks.delete')}
                icon="tabler:trash"
                namespace={false}
                variant="plain"
                onClick={() => blockAction('delete')}
              />
            </>
          )}
        </Flex>
      )}
      {menu === 'blocks' && !readOnly && (
        <FloatingPopover
          label={t('blocks.add')}
          anchor={{
            getBoundingClientRect: () =>
              new DOMRect(anchor.left, anchor.top - 6, 1, 1)
          }}
          autoFocus={false}
          onClose={() => {
            setMenu(null)
            setSlash(null)
          }}
          width={280}
          className="zillion-editor-menu"
          role="listbox"
        >
          <Flex direction="column" gap="xs">
            {filteredChoices.map((kind, index) => (
              <Button
                key={kind}
                aria-selected={index === selected}
                justify="start"
                namespace={false}
                role="option"
                variant={index === selected ? 'secondary' : 'plain'}
                onClick={() => insert(kind)}
                onMouseDown={event => event.preventDefault()}
              >
                {choiceLabel(kind)}
              </Button>
            ))}
          </Flex>
        </FloatingPopover>
      )}
      {menu === 'links' && !readOnly && (
        <FloatingPopover
          label={t('blocks.linkPage')}
          anchor={{
            getBoundingClientRect: () =>
              new DOMRect(anchor.left, anchor.top, 1, 1)
          }}
          onClose={() => setMenu(null)}
          width={300}
          className="zillion-editor-menu"
        >
          <TextInput
            icon="tabler:search"
            label={t('blocks.searchPages')}
            namespace={false}
            placeholder={t('blocks.searchPages')}
            value={search}
            onChange={setSearch}
          />
          <Stack gap="xs" maxHeight="16rem" overflowY="auto">
            {filteredPages.map(page => (
              <Button
                key={pageKey(page)}
                justify="start"
                namespace={false}
                variant="plain"
                onClick={() => {
                  editor
                    .chain()
                    .focus()
                    .insertContentAt(
                      linkAsBlock
                        ? insertPosition.current
                        : editor.state.selection.from,
                      {
                        type: linkAsBlock ? 'pageEmbed' : 'pageLink',
                        attrs: {
                          kind: page.kind,
                          targetId: page.id,
                          label: page.title
                        }
                      }
                    )
                    .run()
                  setMenu(null)
                }}
              >
                {page.title} · {page.context ?? page.kind}
              </Button>
            ))}
            {!filteredPages.length && (
              <Text color="muted">{t('blocks.noPages')}</Text>
            )}
            {linkAsBlock && onCreatePage && (
              <Button
                namespace={false}
                variant="plain"
                icon="lucide:plus"
                disabled={creatingPage}
                onClick={() => {
                  setCreatingPage(true)
                  void onCreatePage(search.trim() || t('blocks.newPage'))
                    .then(page => {
                      if (!page || editor.isDestroyed) return
                      editor
                        .chain()
                        .focus()
                        .insertContentAt(insertPosition.current, {
                          type: 'pageEmbed',
                          attrs: {
                            kind: page.kind,
                            targetId: page.id,
                            label: page.title
                          }
                        })
                        .run()
                      setMenu(null)
                    })
                    .catch(cause => setError(String(cause)))
                    .finally(() => setCreatingPage(false))
                }}
              >
                {t('blocks.newPage')}
              </Button>
            )}
          </Stack>
        </FloatingPopover>
      )}
      {databaseAnchor && !readOnly && (
        <FloatingPopover
          anchor={{ getBoundingClientRect: () => databaseAnchor }}
          label={t('inlineDatabase.title')}
          width={420}
          onClose={() => setDatabaseAnchor(null)}
        >
          <InlineDatabasePicker
            initialMode={databaseMode}
            onCancel={() => setDatabaseAnchor(null)}
            onInsert={(reference, title) => {
              if (!editor.isDestroyed)
                editor
                  .chain()
                  .focus()
                  .insertContentAt(insertPosition.current, {
                    type: 'linkedDatabase',
                    attrs: { ...reference, title, height: 0 }
                  })
                  .run()
              setDatabaseAnchor(null)
            }}
          />
        </FloatingPopover>
      )}
      <EditorContent editor={editor} />
      {!readOnly && <BlockGrips editor={editor} />}
      {error && (
        <Text color="dangerous" role="alert">
          {error}
        </Text>
      )}
    </Stack>
  )
}
