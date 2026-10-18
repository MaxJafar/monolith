import { TextSelection } from '@blocksuite/affine/std'
import { Text as EditorText } from '@blocksuite/store'
import type { PageTarget } from '@monolith/blocks'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useCanvasWidgets } from '@/components/layout/WorkspaceCanvas/CanvasWidgets'
import { FloatingPopover } from '@/components/overlays/FloatingPopover'
import { Box, Flex, Stack, Text } from '@/components/primitives'

import type { DocumentAdapter } from './adapter'

type Mention = {
  block: string
  start: number
  end: number
  query: string
  range: Range
}

/** Durable workspace references use ordinary canonical links, including native exports. */
export function DocumentReferences({
  adapter,
  workspaceId
}: {
  adapter: DocumentAdapter
  workspaceId: string
}) {
  const catalog = useCanvasWidgets(),
    { t } = useTranslation('common')
  const [mention, setMention] = useState<Mention>(),
    [active, setActive] = useState(0),
    [unavailable, setUnavailable] = useState(false)
  const current = useRef(mention),
    dismissed = useRef('')
  current.current = mention
  const matches = useMemo(
    () =>
      (catalog.pages ?? [])
        .filter(
          page =>
            !mention?.query ||
            `${page.title} ${page.context ?? ''}`
              .toLocaleLowerCase()
              .includes(mention.query.toLocaleLowerCase())
        )
        .slice(0, 30),
    [catalog.pages, mention?.query]
  )

  const latest = useRef({ catalog, matches, active })

  latest.current = { catalog, matches, active }

  function close() {
    if (current.current)
      dismissed.current = `${current.current.block}:${current.current.start}`
    setMention(undefined)
  }

  function insert(index: number) {
    const value = current.current,
      target = latest.current.matches[index]

    if (!value || !target || adapter.store.readonly) return

    const model = adapter.store.getModelById(value.block),
      text = model && 'text' in model.props ? model.props.text : null

    if (
      !(text instanceof EditorText) ||
      text.toString().slice(value.start, value.end) !== `@${value.query}`
    ) {
      close()

      return
    }

    const href = `/${target.kind === 'document' ? 'page' : target.kind}/${target.id}?workspace=${encodeURIComponent(workspaceId)}`
    close()
    adapter.store.captureSync()
    adapter.store.transact(() => {
      text.delete(value.start, value.end - value.start)
      text.insert(target.title, value.start, { link: href })
      text.insert(' ', value.start + target.title.length)
    })
    adapter.std.selection.setGroup('note', [
      new TextSelection({
        from: {
          blockId: value.block,
          index: value.start + target.title.length + 1,
          length: 0
        },
        to: null
      })
    ])
    adapter.store.captureSync()
  }

  const actions = useRef({ close, insert })

  actions.current = { close, insert }
  useEffect(() => {
    let frame = 0

    const read = () => {
      frame = 0
      const selection = adapter.std.selection.find(TextSelection),
        dom = window.getSelection()

      if (
        adapter.store.readonly ||
        !selection ||
        selection.from.length ||
        selection.to ||
        !dom?.isCollapsed ||
        !dom.rangeCount ||
        !adapter.host.contains(dom.anchorNode)
      ) {
        setMention(undefined)

        return
      }

      const model = adapter.store.getModelById(selection.from.blockId)

      if (
        !model ||
        !['affine:paragraph', 'affine:list'].includes(model.flavour)
      ) {
        setMention(undefined)

        return
      }

      const text = String((model.props as { text?: unknown }).text ?? ''),
        end = selection.from.index
      const match = text.slice(0, end).match(/(?:^|\s)@([^@\n]{0,80})$/u)

      if (!match) {
        dismissed.current = ''
        setMention(undefined)

        return
      }

      const query = match[1]!,
        start = end - query.length - 1

      if (dismissed.current === `${model.id}:${start}`) return
      if (
        current.current?.block === model.id &&
        current.current.query === query &&
        current.current.start === start
      )
        return
      setActive(0)
      setMention({
        block: model.id,
        start,
        end,
        query,
        range: dom.getRangeAt(0).cloneRange()
      })
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(read)
    }
    const key = (event: KeyboardEvent) => {
      if (!current.current || event.isComposing) return

      if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault()
        event.stopImmediatePropagation()
        setActive(i =>
          Math.max(
            0,
            Math.min(
              latest.current.matches.length - 1,
              i + (event.key === 'ArrowDown' ? 1 : -1)
            )
          )
        )
      } else if (event.key === 'Enter' && latest.current.matches.length) {
        event.preventDefault()
        event.stopImmediatePropagation()
        actions.current.insert(latest.current.active)
      } else if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        actions.current.close()
      }
    }
    const open = (event: MouseEvent) => {
      if (
        event.button ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return

      const link = event
        .composedPath()
        .find(
          (node): node is HTMLElement =>
            node instanceof HTMLElement && !!node.getAttribute('href')
        )
      const href = link?.getAttribute('href'),
        match = href?.match(
          /^\/(page|record|note|redraw)\/([0-9a-f-]{36})(?:\?[^#]*)?(?:#.*)?$/i
        )

      if (!match || !latest.current.catalog.openPage) return

      const kind =
          match[1] === 'page' ? 'document' : (match[1] as PageTarget['kind']),
        id = match[2]!

      // Keep anchor navigation within an existing document under the editor's control.
      if (kind !== 'redraw') return
      event.preventDefault()
      event.stopImmediatePropagation()

      if (
        !latest.current.catalog.pages?.some(p => p.id === id && p.kind === kind)
      ) {
        setUnavailable(true)

        return
      }
      latest.current.catalog.openPage({ id, kind })
    }
    adapter.host.addEventListener('input', schedule)
    adapter.host.addEventListener('compositionend', schedule)
    adapter.host.addEventListener('keyup', schedule)
    adapter.host.addEventListener('keydown', key, true)
    adapter.host.addEventListener('click', open, true)
    const selection = adapter.std.selection.slots.changed.subscribe(schedule)

    return () => {
      cancelAnimationFrame(frame)
      selection.unsubscribe()
      adapter.host.removeEventListener('input', schedule)
      adapter.host.removeEventListener('compositionend', schedule)
      adapter.host.removeEventListener('keyup', schedule)
      adapter.host.removeEventListener('keydown', key, true)
      adapter.host.removeEventListener('click', open, true)
    }
  }, [adapter])
  const anchor = useMemo(
    () =>
      mention
        ? { getBoundingClientRect: () => mention.range.getBoundingClientRect() }
        : null,
    [mention]
  )

  return (
    <>
      {unavailable && (
        <Text role="alert" size="sm">
          {t('documentEditor.referenceUnavailable')}
        </Text>
      )}
      {mention && (
        <FloatingPopover
          anchor={anchor}
          autoFocus={false}
          label={t('documentEditor.mentionPage')}
          role="listbox"
          width={340}
          onClose={close}
        >
          <Stack gap="xs" onPointerDown={event => event.preventDefault()}>
            <Text color="muted" size="xs">
              {t('documentEditor.mentionPage')}
            </Text>
            <Box maxHeight="320px" overflowY="auto">
              {matches.map((page, i) => (
                <Flex
                  key={`${page.kind}:${page.id}`}
                  align="start"
                  aria-selected={active === i}
                  as="button"
                  className="monolith-slash-command"
                  direction="column"
                  p="sm"
                  r="sm"
                  role="option"
                  type="button"
                  width="100%"
                  onClick={() => insert(i)}
                  onPointerMove={() => setActive(i)}
                >
                  <Text size="sm">{page.title}</Text>
                  <Text color="muted" size="xs">
                    {page.context ?? page.kind}
                  </Text>
                </Flex>
              ))}
              {!matches.length && (
                <Text size="sm">{t('workspaceUI.noResults')}</Text>
              )}
            </Box>
          </Stack>
        </FloatingPopover>
      )}
    </>
  )
}
