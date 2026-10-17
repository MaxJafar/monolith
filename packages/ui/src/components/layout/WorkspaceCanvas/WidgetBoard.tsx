import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { type CanvasBlock, moveCanvasBlock } from '@monolith/blocks'

import { Button } from '@/components/inputs'
import { PopoverButton } from '@/components/overlays/PopoverButton'
import { Box, Flex, Icon, Stack, Text } from '@/components/primitives'
import { usePageChrome } from '@/providers/PageChromeProvider'
import { elasticScrollEdge, settleElement } from '@/utils/elasticMotion'

import { useCanvasWidgets } from './CanvasWidgets'
import { newCanvasBlock } from './defaults'
import { widgetGesture } from './widgetGesture'
import {
  type DashboardTemplate,
  dashboardTemplates,
  scopedWidgets,
  templateWidgets
} from './widgetModel'
import './widgets.css'

export function WidgetBoard({
  blocks,
  scope,
  nativeTitle,
  readOnly,
  canResize,
  onChange,
  render
}: {
  blocks: CanvasBlock[]
  scope: string
  nativeTitle: string
  readOnly?: boolean
  canResize?: (block: CanvasBlock) => boolean
  onChange: (blocks: CanvasBlock[]) => void
  render: (block: CanvasBlock) => ReactNode
}) {
  const { t } = useTranslation('common.widgets')
  const catalog = useCanvasWidgets()

  const widgets = scopedWidgets(catalog.widgets, scope)
  const [editing, setEditing] = useState(false),
    [panel, setPanel] = useState<'widgets' | 'templates' | null>(null)
  const [search, setSearch] = useState(''),
    [undo, setUndo] = useState<CanvasBlock[][]>([]),
    [announcement, setAnnouncement] = useState('')
  const grid = useRef<HTMLDivElement>(null),
    cancelGesture = useRef<(() => void) | null>(null)

  const latest = useRef({ blocks, onChange, readOnly })

  latest.current = { blocks, onChange, readOnly }
  const consumedWidget = useRef<typeof catalog.requestedWidget>(undefined)
  useEffect(() => {
    const request = catalog.requestedWidget
    if (
      !request ||
      consumedWidget.current === request ||
      scope !== 'dashboard' ||
      readOnly ||
      !widgets[request.id]
    )
      return
    consumedWidget.current = request
    catalog.consumeRequestedWidget?.()
    change([
      ...latest.current.blocks,
      newCanvasBlock('widget', {
        widget: request.id,
        title: widgets[request.id]!.title,
        content: request.filter,
        width: 'half'
      })
    ])
  }, [catalog.requestedWidget, scope, readOnly, widgets])
  const editable = editing && !readOnly
  const setChromeUndo = usePageChrome()?.setUndo
  useEffect(() => {
    if (readOnly) return
    return setChromeUndo?.(
      undo.length
        ? () => {
            cancelGesture.current?.()
            latest.current.onChange(undo[undo.length - 1]!)
            setUndo(previous => previous.slice(0, -1))
            setAnnouncement(t('undone'))
          }
        : undefined
    )
  }, [undo, readOnly, setChromeUndo, t])

  useEffect(() => () => cancelGesture.current?.(), [])

  useEffect(() => {
    if (!editable) cancelGesture.current?.()
  }, [editable])
  useEffect(() => {
    if (!editable) return

    const dismiss = (event: PointerEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key !== 'Escape') return
      grid.current
        ?.querySelectorAll<HTMLDetailsElement>('details[open]')
        .forEach(menu => {
          if (
            event instanceof KeyboardEvent ||
            !menu.contains(event.target as Node)
          )
            menu.open = false
        })
    }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', dismiss)

    return () => {
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('keydown', dismiss)
    }
  }, [editable])

  function change(next: CanvasBlock[], message = t('updated')) {
    if (latest.current.readOnly) return
    cancelGesture.current?.()

    if (next.length > 100) {
      setAnnouncement(t('limit'))

      return
    }
    setUndo(history => [...history.slice(-19), latest.current.blocks])
    latest.current.onChange(next)
    setAnnouncement(message)
  }

  function update(block: CanvasBlock) {
    change(
      latest.current.blocks.map(item => (item.id === block.id ? block : item))
    )
  }

  function move(id: string, before: string | null) {
    const next = moveCanvasBlock(latest.current.blocks, id, before)

    if (next !== latest.current.blocks) change(next, t('moved'))
  }

  function applyTemplate(template: DashboardTemplate) {
    // Historical page content remains in place; templates replace only widgets.
    change(
      [
        ...templateWidgets(template, widgets, nativeTitle),
        ...blocks.filter(block => !['widget', 'native'].includes(block.type))
      ],
      t('templateApplied')
    )
    setPanel(null)
  }

  return (
    <Stack className="monolith-widget-workspace" gap="lg">
      <Flex
        align="center"
        className="monolith-widget-toolbar"
        gap="sm"
        justify="between"
        wrap="wrap"
      >
        <Stack gap="xs">
          <Text size="sm" weight="medium">
            {t(scope === 'dashboard' ? 'yourSpace' : 'addonSpace')}
          </Text>
          <Text color="muted" size="sm">
            {t(editable ? 'arrangeHelp' : 'liveHelp')}
          </Text>
        </Stack>
        {!readOnly && (
          <Flex align="center" gap="xs" wrap="wrap">
            {undo.length > 0 && (
              <Button
                icon="lucide:undo-2"
                namespace={false}
                variant="plain"
                onClick={() => {
                  cancelGesture.current?.()
                  const previous = undo[undo.length - 1]!
                  onChange(previous)
                  setUndo(undo.slice(0, -1))
                  setAnnouncement(t('undone'))
                }}
              >
                {t('undo')}
              </Button>
            )}
            {scope === 'dashboard' && (
              <Button
                aria-expanded={panel === 'templates'}
                icon="lucide:panels-top-left"
                namespace={false}
                variant="plain"
                onClick={() => {
                  setEditing(true)
                  setPanel(panel === 'templates' ? null : 'templates')
                }}
              >
                {t('templates')}
              </Button>
            )}
            <Button
              aria-expanded={panel === 'widgets'}
              icon="lucide:plus"
              namespace={false}
              variant="secondary"
              onClick={() => {
                setEditing(true)
                setPanel(panel === 'widgets' ? null : 'widgets')
              }}
            >
              {t('add')}
            </Button>
            <Button
              aria-pressed={editable}
              icon={editable ? 'lucide:check' : 'lucide:sliders-horizontal'}
              namespace={false}
              variant={editable ? 'primary' : 'plain'}
              onClick={() => {
                setEditing(!editing)
                setPanel(null)
              }}
            >
              {t(editable ? 'done' : 'customize')}
            </Button>
          </Flex>
        )}
      </Flex>
      {panel && !readOnly && (
        <Stack
          aria-label={t(panel)}
          className="monolith-widget-library"
          gap="md"
          role="region"
          onKeyDown={event => {
            if (event.key === 'Escape') setPanel(null)
          }}
        >
          <Flex align="center" justify="between">
            <Text weight="semibold">{t(panel)}</Text>
            <Button
              aria-label={t('close')}
              icon="lucide:x"
              namespace={false}
              variant="plain"
              onClick={() => setPanel(null)}
            />
          </Flex>
          {panel === 'templates' ? (
            <Box className="monolith-template-grid">
              {(Object.keys(dashboardTemplates) as DashboardTemplate[])
                .filter(id => id !== 'homelab' || !!widgets.techLabServices)
                .map(id => (
                  <Box
                    key={id}
                    as="button"
                    className="monolith-template"
                    type="button"
                    onClick={() => applyTemplate(id)}
                  >
                    <span
                      aria-hidden="true"
                      className="monolith-template-preview"
                    >
                      {dashboardTemplates[id].map(([widget, width], i) => (
                        <span key={`${widget}-${i}`} data-width={width}>
                          <i />
                          <i />
                        </span>
                      ))}
                    </span>
                    <Text as="span" weight="semibold">
                      {t(`template.${id}`)}
                    </Text>
                    <Text as="span" color="muted" size="sm">
                      {t(`templateHelp.${id}`)}
                    </Text>
                  </Box>
                ))}
            </Box>
          ) : (
            <>
              <Box
                autoFocus
                aria-label={t('search')}
                as="input"
                className="monolith-inline-input"
                placeholder={t('search')}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <Box className="monolith-widget-picker">
                {!blocks.some(block => block.type === 'native') && (
                  <Button
                    disabled={blocks.length >= 100}
                    icon="lucide:layout-dashboard"
                    namespace={false}
                    variant="secondary"
                    onClick={() => {
                      change([
                        ...blocks,
                        newCanvasBlock('native', { title: nativeTitle })
                      ])
                      setPanel(null)
                    }}
                  >
                    {nativeTitle}
                  </Button>
                )}
                {Object.entries(widgets)
                  .filter(([, widget]) =>
                    widget.title.toLowerCase().includes(search.toLowerCase())
                  )
                  .map(([id, widget]) => (
                    <Button
                      key={id}
                      disabled={blocks.length >= 100}
                      icon={widget.icon}
                      namespace={false}
                      variant="secondary"
                      onClick={() => {
                        change([
                          ...blocks,
                          newCanvasBlock('widget', {
                            widget: id,
                            title: widget.title,
                            width: 'half'
                          })
                        ])
                        setPanel(null)
                      }}
                    >
                      {widget.title}
                    </Button>
                  ))}
              </Box>
              {blocks.length >= 100 && (
                <Text role="status" size="sm">
                  {t('limit')}
                </Text>
              )}
              {!Object.keys(widgets).length && (
                <Text color="muted" size="sm">
                  {t('addonEmpty')}
                </Text>
              )}
            </>
          )}
        </Stack>
      )}
      <Box ref={grid} className="monolith-widget-grid" data-editing={editable}>
        {blocks.map((block, index) => (
          <Stack
            key={block.id}
            className="monolith-widget-tile"
            data-content={
              !['native', 'widget'].includes(block.type) || undefined
            }
            data-widget-id={block.id}
            data-width={block.width}
            gap="none"
            style={{ height: block.height || undefined }}
          >
            <Flex
              align="center"
              className="monolith-widget-heading"
              gap="sm"
              justify="between"
            >
              <Flex align="center" gap="sm" minWidth="0">
                <Icon
                  color="muted"
                  icon={
                    catalog.widgets[block.widget]?.icon ??
                    'lucide:layout-dashboard'
                  }
                  size="16px"
                />
                <Text truncate size="sm" weight="medium">
                  {block.title || t('widget')}
                </Text>
              </Flex>
              {editable && (
                <Flex gap="xs">
                  <Box
                    aria-label={t('move', { title: block.title })}
                    as="button"
                    className="monolith-widget-handle"
                    title={t('moveHelp')}
                    type="button"
                    onKeyDown={event => {
                      if (
                        ![
                          'ArrowUp',
                          'ArrowDown',
                          'ArrowLeft',
                          'ArrowRight'
                        ].includes(event.key)
                      )
                        return
                      event.preventDefault()
                      const up = ['ArrowUp', 'ArrowLeft'].includes(event.key)

                      if (up && index > 0) move(block.id, blocks[index - 1]!.id)
                      if (!up && index < blocks.length - 1)
                        move(block.id, blocks[index + 2]?.id ?? null)
                    }}
                    onPointerDown={event => {
                      if (event.button !== 0 || !grid.current) return
                      event.preventDefault()
                      event.currentTarget.focus({ preventScroll: true })
                      const tile =
                        event.currentTarget.closest<HTMLElement>(
                          '[data-widget-id]'
                        )!
                      cancelGesture.current?.()
                      const pointer = event.nativeEvent
                      cancelGesture.current = widgetGesture(
                        pointer,
                        event.currentTarget,
                        tile,
                        grid.current,
                        block,
                        'move',
                        result => {
                          if (result.before !== undefined)
                            move(block.id, result.before)
                        }
                      )
                    }}
                  >
                    <Icon icon="lucide:grip-vertical" />
                  </Box>
                  <PopoverButton
                    label={t('options', { title: block.title })}
                    icon="lucide:ellipsis"
                    iconOnly
                    width={240}
                  >
                    <Stack gap="xs">
                      {catalog.widgets[block.widget]?.filterable && (
                        <Box as="label" className="monolith-widget-filter">
                          <Text color="muted" size="sm">
                            {t('common.canvas:filter')}
                          </Text>
                          <Box
                            aria-label={t('common.canvas:filter')}
                            as="input"
                            className="monolith-inline-input"
                            maxLength={200}
                            placeholder={t('common.canvas:filterHelp')}
                            value={block.content}
                            onChange={event =>
                              update({ ...block, content: event.target.value })
                            }
                          />
                        </Box>
                      )}
                      {canResize?.(block) !== false && (
                        <>
                          <Text color="muted" size="sm">
                            {t('width')}
                          </Text>
                          {(['third', 'half', 'full'] as const).map(width => (
                            <Button
                              key={width}
                              aria-pressed={block.width === width}
                              namespace={false}
                              variant="plain"
                              onClick={() => update({ ...block, width })}
                            >
                              {t(`size.${width}`)}
                            </Button>
                          ))}
                          <Button
                            namespace={false}
                            variant="plain"
                            onClick={() => update({ ...block, height: 0 })}
                          >
                            {t('autoHeight')}
                          </Button>
                        </>
                      )}
                      <Button
                        icon="lucide:trash-2"
                        namespace={false}
                        variant="plain"
                        onClick={() =>
                          change(
                            blocks.filter(item => item.id !== block.id),
                            t('removed')
                          )
                        }
                      >
                        {t('remove')}
                      </Button>
                    </Stack>
                  </PopoverButton>
                </Flex>
              )}
            </Flex>
            <Box
              className="monolith-widget-body"
              onWheel={event =>
                elasticScrollEdge(event.currentTarget, event.nativeEvent)
              }
            >
              {render(block)}
            </Box>
            {editable && canResize?.(block) !== false && (
              <Box
                aria-label={t('resize', { title: block.title })}
                as="button"
                className="monolith-widget-resize"
                title={t('resizeHelp')}
                type="button"
                onDoubleClick={event => {
                  update({ ...block, height: 0 })
                  settleElement(event.currentTarget.closest('[data-widget-id]'))
                }}
                onKeyDown={event => {
                  if (
                    ![
                      'ArrowUp',
                      'ArrowDown',
                      'ArrowLeft',
                      'ArrowRight',
                      'Home'
                    ].includes(event.key)
                  )
                    return
                  event.preventDefault()

                  if (event.key === 'Home') update({ ...block, height: 0 })
                  else if (event.key === 'ArrowUp' || event.key === 'ArrowDown')
                    update({
                      ...block,
                      height: Math.max(
                        180,
                        Math.min(
                          1000,
                          (block.height ||
                            event.currentTarget.closest<HTMLElement>(
                              '[data-widget-id]'
                            )!.offsetHeight) +
                            (event.key === 'ArrowUp' ? -40 : 40)
                        )
                      )
                    })
                  else {
                    const widths = ['third', 'half', 'full'] as const
                    update({
                      ...block,
                      width:
                        widths[
                          Math.max(
                            0,
                            Math.min(
                              2,
                              widths.indexOf(block.width) +
                                (event.key === 'ArrowLeft' ? -1 : 1)
                            )
                          )
                        ]!
                    })
                  }
                }}
                onPointerDown={event => {
                  if (event.button !== 0 || !grid.current) return

                  const tile =
                    event.currentTarget.closest<HTMLElement>('[data-widget-id]')

                  if (!tile) return
                  event.preventDefault()
                  event.currentTarget.focus({ preventScroll: true })
                  cancelGesture.current?.()
                  cancelGesture.current = widgetGesture(
                    event.nativeEvent,
                    event.currentTarget,
                    tile,
                    grid.current,
                    block,
                    'resize',
                    result => {
                      if (result.block) update(result.block)
                    }
                  )
                }}
              >
                <Icon icon="lucide:grip" size="12px" />
              </Box>
            )}
          </Stack>
        ))}
      </Box>
      {!blocks.length && (
        <Stack align="center" gap="sm" py="2xl">
          <Icon color="muted" icon="lucide:panels-top-left" size="32px" />
          <Text weight="medium">{t('empty')}</Text>
          <Text color="muted">{t('emptyHelp')}</Text>
        </Stack>
      )}
      <Text
        aria-live="polite"
        className="monolith-widget-announcement"
        role="status"
      >
        {announcement}
      </Text>
    </Stack>
  )
}
