import { TextSelection } from '@blocksuite/affine/std'
import {
  type SlashMenuActionItem,
  SlashMenuExtension,
  type SlashMenuItem
} from '@blocksuite/affine/widgets/slash-menu'
import { useEffect, useMemo, useRef, useState } from 'react'

import { FloatingPopover } from '@/components/overlays/FloatingPopover'
import { Box, Flex, Icon, Stack, Text } from '@/components/primitives'

import type { DocumentAdapter } from './adapter'
import './slash.css'

type SlashState = {
  blockId: string
  start: number
  end: number
  query: string
  range: Range
}
const flatten = (items: SlashMenuItem[]): SlashMenuActionItem[] =>
  items.flatMap(item => ('subMenu' in item ? flatten(item.subMenu) : [item]))

export function DocumentSlashMenu({
  adapter,
  label = 'Add a block',
  emptyLabel = 'No matching commands',
  closeLabel = 'Esc to close'
}: {
  adapter: DocumentAdapter
  label?: string
  emptyLabel?: string
  closeLabel?: string
}) {
  const [state, setState] = useState<SlashState>()
  const [active, setActive] = useState(0)
  const current = useRef(state)
  current.current = state
  const dismissed = useRef('')
  const commands = useMemo(() => {
    if (!state) return []
    const model = adapter.store.getModelById(state.blockId)
    if (!model) return []
    const context = { std: adapter.std, model }
    const config = adapter.std.get(SlashMenuExtension).config
    const items = flatten(
      typeof config.items === 'function' ? config.items(context) : config.items
    )
    const query = state.query.toLocaleLowerCase().trim()
    return items
      .filter(
        item =>
          (!item.when || item.when(context)) &&
          (!query ||
            [item.name, ...(item.searchAlias ?? [])].some(value =>
              value.toLocaleLowerCase().includes(query)
            ))
      )
      .sort((a, b) =>
        (a.group ?? '').localeCompare(b.group ?? '', undefined, {
          numeric: true
        })
      )
  }, [state?.blockId, state?.query, adapter])
  const latest = useRef({ commands, active })
  latest.current = { commands, active }
  const close = () => {
    if (current.current)
      dismissed.current = `${current.current.blockId}:${current.current.start}`
    setState(undefined)
  }
  const execute = (index: number) => {
    const value = current.current,
      command = latest.current.commands[index]
    if (!value || !command || adapter.store.readonly) return
    const model = adapter.store.getModelById(value.blockId)
    const text = (
      model?.props as
        | {
            text?: {
              toString(): string
              delete(index: number, length: number): void
            }
          }
        | undefined
    )?.text
    if (
      !model ||
      !text ||
      text.toString().slice(value.start, value.end) !== `/${value.query}`
    ) {
      close()
      return
    }
    close()
    adapter.store.captureSync()
    text.delete(value.start, value.end - value.start)
    adapter.std.selection.setGroup('note', [
      new TextSelection({
        from: { blockId: model.id, index: value.start, length: 0 },
        to: null
      })
    ])
    command.action({ std: adapter.std, model })
    adapter.store.captureSync()
  }
  const actions = useRef({ close, execute })
  actions.current = { close, execute }
  useEffect(() => {
    let frame = 0
    const read = () => {
      frame = 0
      if (adapter.store.readonly) {
        setState(undefined)
        return
      }
      const selection = adapter.std.selection.find(TextSelection)
      const dom = window.getSelection()
      if (
        !selection ||
        selection.from.length ||
        selection.to ||
        !dom?.isCollapsed ||
        !dom.rangeCount ||
        !adapter.host.contains(dom.anchorNode)
      ) {
        setState(undefined)
        return
      }
      const model = adapter.store.getModelById(selection.from.blockId)
      if (
        !model ||
        !['affine:paragraph', 'affine:list'].includes(model.flavour)
      ) {
        setState(undefined)
        return
      }
      const text = String((model.props as { text?: unknown }).text ?? '')
      const end = selection.from.index
      const match = text.slice(0, end).match(/(?:^|\s)\/([^/\n]{0,64})$/u)
      if (!match) {
        dismissed.current = ''
        setState(undefined)
        return
      }
      const query = match[1]!,
        start = end - query.length - 1
      if (dismissed.current === `${model.id}:${start}`) return
      const previous = current.current
      if (
        previous?.blockId === model.id &&
        previous.query === query &&
        previous.start === start
      )
        return
      setActive(0)
      setState({
        blockId: model.id,
        start,
        end,
        query,
        range: dom.getRangeAt(0).cloneRange()
      })
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(read)
    }
    const keyboard = (event: KeyboardEvent) => {
      if (!current.current || event.isComposing) return
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        event.stopImmediatePropagation()
        setActive(previous =>
          Math.max(
            0,
            Math.min(
              latest.current.commands.length - 1,
              previous + (event.key === 'ArrowDown' ? 1 : -1)
            )
          )
        )
      } else if (event.key === 'Enter' && latest.current.commands.length) {
        event.preventDefault()
        event.stopImmediatePropagation()
        actions.current.execute(latest.current.active)
      } else if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        actions.current.close()
      }
    }
    adapter.host.addEventListener('input', schedule)
    adapter.host.addEventListener('compositionend', schedule)
    adapter.host.addEventListener('keyup', schedule)
    adapter.host.addEventListener('keydown', keyboard, true)
    const selection = adapter.std.selection.slots.changed.subscribe(schedule)
    return () => {
      cancelAnimationFrame(frame)
      selection.unsubscribe()
      adapter.host.removeEventListener('input', schedule)
      adapter.host.removeEventListener('compositionend', schedule)
      adapter.host.removeEventListener('keyup', schedule)
      adapter.host.removeEventListener('keydown', keyboard, true)
    }
  }, [adapter])
  useEffect(() => {
    document
      .getElementById(`monolith-slash-${active}`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [active])
  const anchor = useMemo(
    () =>
      state
        ? { getBoundingClientRect: () => state.range.getBoundingClientRect() }
        : null,
    [state]
  )
  if (!state) return null
  return (
    <FloatingPopover
      anchor={anchor}
      autoFocus={false}
      label={label}
      onClose={close}
      width={330}
      role="listbox"
      className="monolith-slash-menu"
    >
      <Stack gap="none" onPointerDown={event => event.preventDefault()}>
        <Text color="muted" size="xs" px="sm" py="sm">
          {label}
        </Text>
        <Box maxHeight="340px" overflow="auto">
          {commands.map((item, index) => (
            <Flex
              as="button"
              type="button"
              role="option"
              aria-selected={active === index}
              id={`monolith-slash-${index}`}
              key={`${item.group}:${item.name}`}
              className="monolith-slash-command"
              align="center"
              gap="sm"
              width="100%"
              p="sm"
              r="sm"
              onPointerMove={() => setActive(index)}
              onClick={() => execute(index)}
            >
              <Icon
                icon={
                  item.group?.includes('Database')
                    ? 'lucide:table-2'
                    : /Heading/.test(item.name)
                      ? 'lucide:heading'
                      : /List|list|To-do/.test(item.name)
                        ? 'lucide:list'
                        : 'lucide:type'
                }
                size="17px"
              />
              <Text size="sm">{item.name}</Text>
            </Flex>
          ))}
          {!commands.length && (
            <Text size="sm" color="muted" p="sm">
              {emptyLabel}
            </Text>
          )}
        </Box>
        <Text
          className="monolith-slash-footer"
          size="xs"
          color="muted"
          px="sm"
          py="sm"
        >
          {closeLabel}
        </Text>
      </Stack>
    </FloatingPopover>
  )
}
