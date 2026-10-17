import { useModuleTranslation } from '@monolith/localization'
import {
  Box,
  Button,
  Flex,
  ListboxInput,
  ListboxOption,
  NumberInput,
  Stack,
  Text,
  surface
} from '@monolith/ui'
import { useEffect, useRef, useState } from 'react'

import { descendants } from '../../design'
import type { Element, Page } from '../../shared'
import { useEditor } from './EditorProvider'
import { ClippedGraphic, PageGraphic } from './graphics'
import { pageBounds } from './model'

export function PrototypeInspector() {
  const e = useEditor(),
    { t } = useModuleTranslation()
  const element = e.page.elements.find(
    el => e.selected.length === 1 && el.id === e.selected[0]
  )
  const link = element?.prototype,
    disabled = e.readOnly || element?.locked
  const targets = e.document.pages.flatMap(page => [
    { id: page.id, name: page.name },
    ...page.elements
      .filter(el => el.kind === 'frame')
      .map(el => ({ id: el.id, name: `${page.name} / ${el.name}` }))
  ])
  const change = (patch: Partial<NonNullable<Element['prototype']>>) => {
    if (element)
      e.changeElements([element.id], {
        prototype: {
          trigger: 'click',
          action: 'navigate',
          target: null,
          transition: 'instant',
          duration: 250,
          ...link,
          ...patch
        }
      })
  }

  return (
    <Stack aria-label={t('prototype.title')} gap="sm">
      <Text size="sm" weight="semibold">
        {t('prototype.title')}
      </Text>
      <Button
        disabled={e.readOnly}
        variant="plain"
        onClick={() =>
          e.updateDocument({
            ...e.document,
            prototypeStart: element?.kind === 'frame' ? element.id : e.pageId
          })
        }
      >
        setPrototypeStart
      </Button>
      {element && (
        <>
          <ListboxInput
            disabled={disabled}
            label="prototypeAction"
            value={link?.action ?? 'none'}
            onChange={value =>
              value === 'none'
                ? e.changeElements([element.id], { prototype: undefined })
                : change({
                    action: value as NonNullable<Element['prototype']>['action']
                  })
            }
          >
            {['none', 'navigate', 'overlay', 'back', 'close'].map(value => (
              <ListboxOption
                key={value}
                label={t(`prototype.${value}`)}
                value={value}
              />
            ))}
          </ListboxInput>
          {link && (
            <>
              <ListboxInput
                disabled={disabled}
                label="prototypeTrigger"
                value={link.trigger}
                onChange={value => change({ trigger: value })}
              >
                {['click', 'hover'].map(value => (
                  <ListboxOption
                    key={value}
                    label={t(`prototype.${value}`)}
                    value={value}
                  />
                ))}
              </ListboxInput>
              {['navigate', 'overlay'].includes(link.action) && (
                <ListboxInput
                  disabled={disabled}
                  label="prototypeTarget"
                  value={link.target ?? ''}
                  onChange={target => change({ target })}
                >
                  <ListboxOption label={t('prototype.chooseTarget')} value="" />
                  {targets.map(target => (
                    <ListboxOption
                      key={target.id}
                      label={target.name}
                      value={target.id}
                    />
                  ))}
                </ListboxInput>
              )}
              <ListboxInput
                disabled={disabled}
                label="prototypeTransition"
                value={link.transition}
                onChange={value => change({ transition: value })}
              >
                {['instant', 'dissolve'].map(value => (
                  <ListboxOption
                    key={value}
                    label={t(`prototype.${value}`)}
                    value={value}
                  />
                ))}
              </ListboxInput>
              {link.transition === 'dissolve' && (
                <NumberInput
                  disabled={disabled}
                  icon="lucide:minus"
                  label="prototypeDuration"
                  max={3000}
                  min={0}
                  value={link.duration}
                  onChange={duration =>
                    change({ duration: Math.round(duration) })
                  }
                />
              )}
            </>
          )}
        </>
      )}
    </Stack>
  )
}

export function PrototypePlayer() {
  const e = useEditor(),
    { t } = useModuleTranslation(),
    dialog = useRef<HTMLDialogElement>(null)
  const [history, setHistory] = useState([
      e.document.prototypeStart ?? e.pageId
    ]),
    [overlay, setOverlay] = useState<string | null>(null),
    [duration, setDuration] = useState(0)
  useEffect(() => {
    dialog.current?.showModal()

    return () => dialog.current?.close()
  }, [])
  const scene = (id: string): Page => {
    const page =
      e.document.pages.find(
        p =>
          p.id === id ||
          p.elements.some(el => el.id === id && el.kind === 'frame')
      ) ?? e.page
    const frame = page.elements.find(el => el.id === id && el.kind === 'frame')

    if (!frame) return page

    const ids = descendants(page, [frame.id])

    return {
      ...page,
      elements: page.elements.filter(el => ids.has(el.id)),
      connectors: page.connectors.filter(
        c => ids.has(c.source) && ids.has(c.target)
      )
    }
  }
  const page = scene(history[history.length - 1]!)

  function activate(element: Element, trigger: 'click' | 'hover') {
    const link = element.prototype

    if (!link || link.trigger !== trigger) return
    setDuration(link.transition === 'dissolve' ? link.duration : 0)

    if (link.action === 'back') {
      setOverlay(null)
      setHistory(h => (h.length > 1 ? h.slice(0, -1) : h))

      return
    }

    if (link.action === 'close') {
      setOverlay(null)

      return
    }
    if (
      !link.target ||
      !e.document.pages.some(
        p =>
          p.id === link.target ||
          p.elements.some(el => el.id === link.target && el.kind === 'frame')
      )
    )
      return

    if (link.action === 'overlay') setOverlay(link.target)
    else {
      setOverlay(null)
      setHistory(h => [...h.slice(-99), link.target!])
    }
  }

  function render(page: Page, target: string) {
    const frame = page.elements.find(el => el.id === target),
      bounds = frame ?? pageBounds(page.elements.filter(el => !el.hidden))

    return (
      <svg
        key={target}
        aria-label={page.name}
        className="redraw-prototype-scene"
        role="img"
        style={{
          background: page.background,
          animationDuration: `${duration}ms`
        }}
        viewBox={`${bounds.x} ${bounds.y} ${Math.max(1, bounds.width)} ${Math.max(1, bounds.height)}`}
      >
        <PageGraphic markerId={`prototype-${target}`} page={page} />
        {page.elements
          .filter(el => !el.hidden && el.prototype)
          .map(el => (
            <ClippedGraphic key={el.id} element={el} page={page}>
              <rect
                aria-label={`${el.name}: ${t(`prototype.${el.prototype!.action}`)}`}
                className="redraw-hotspot"
                data-hotspot={el.id}
                fill="transparent"
                height={el.height}
                role="button"
                tabIndex={0}
                transform={`rotate(${el.rotation} ${el.x + el.width / 2} ${el.y + el.height / 2})`}
                width={el.width}
                x={el.x}
                y={el.y}
                onClick={() => activate(el, 'click')}
                onFocus={() => activate(el, 'hover')}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    activate(el, 'click')
                  }
                }}
                onPointerEnter={() => activate(el, 'hover')}
              />
            </ClippedGraphic>
          ))}
      </svg>
    )
  }

  return (
    <Box
      ref={dialog}
      aria-label={t('prototype.preview')}
      as="dialog"
      className="redraw-prototype"
      onClose={() => e.setPresenting(false)}
      onKeyDown={event => {
        if (event.key === 'Backspace' && history.length > 1) {
          event.preventDefault()
          setHistory(h => h.slice(0, -1))
        }
      }}
    >
      <Stack gap="none" height="100%">
        <Flex
          align="center"
          bg={surface.default}
          gap="sm"
          justify="between"
          p="sm"
          wrap="wrap"
        >
          <Text weight="semibold">
            {e.title} · {page.name}
          </Text>
          <Flex gap="xs">
            <Button
              disabled={history.length < 2 && !overlay}
              variant="plain"
              onClick={() =>
                overlay ? setOverlay(null) : setHistory(h => h.slice(0, -1))
              }
            >
              back
            </Button>
            <Button
              variant="plain"
              onClick={() => {
                setHistory([e.document.prototypeStart ?? e.pageId])
                setOverlay(null)
              }}
            >
              restartPrototype
            </Button>
            <Button variant="secondary" onClick={() => e.setPresenting(false)}>
              closePreview
            </Button>
          </Flex>
        </Flex>
        <Box flex="1" minHeight="0" position="relative">
          {render(page, history[history.length - 1]!)}
          {overlay && (
            <Flex
              align="center"
              className="redraw-prototype-overlay"
              inset="0"
              justify="center"
              p="lg"
              position="absolute"
              onClick={() => setOverlay(null)}
            >
              <Box
                height="80%"
                width="80%"
                onClick={event => event.stopPropagation()}
              >
                {render(scene(overlay), overlay)}
              </Box>
            </Flex>
          )}
        </Box>
      </Stack>
    </Box>
  )
}
