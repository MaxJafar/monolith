import { useModuleTranslation } from '@monolith/localization'
import { Box, Button, Flex, Text, surface } from '@monolith/ui'
import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useId,
  useRef,
  useState
} from 'react'

import { descendants } from '../../design'
import type { Page } from '../../shared'
import { fitVector, moveNode, toVector, vectorPoint } from '../../vector'
import { CommentPins } from './Comments'
import { useEditor } from './EditorProvider'
import { VectorHandles } from './VectorEditor'
import { ClippedGraphic, ElementGraphic } from './graphics'
import {
  type Point,
  type Tool,
  type Viewport as View,
  clamp,
  clone,
  edgeGeometry,
  elementBounds,
  fitView,
  makeElement,
  selectionIds,
  toWorld,
  zoomAt
} from './model'

type Gesture = {
  kind: 'move' | 'resize' | 'pan' | 'draw' | 'marquee' | 'vector'
  node?: string
  handle?: 'anchor' | 'in' | 'out'
  start: Point
  client: Point
  page: Page
  basis: Page
  view: View
  ids: string[]
  pointer: number
  element?: string
  draft?: Page
  marquee?: { x: number; y: number; width: number; height: number }
}

export function Viewport() {
  const e = useEditor(),
    { t } = useModuleTranslation()
  const svg = useRef<SVGSVGElement>(null),
    gesture = useRef<Gesture | null>(null)

  const latest = useRef(e)

  latest.current = e

  const [marquee, setMarquee] = useState<{
    x: number
    y: number
    width: number
    height: number
  } | null>(null)

  const marker = useId().replace(/:/g, '')
  const page = e.renderedPage
  const local = (event: { clientX: number; clientY: number }): Point => {
    const bounds = svg.current!.getBoundingClientRect()

    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
  }

  function cancel() {
    gesture.current = null
    latest.current.setPreview(null)
    setMarquee(null)
  }

  function fit() {
    const rect = svg.current?.getBoundingClientRect()

    if (rect) e.setView(fitView(e.page.elements, rect.width, rect.height))
  }
  useEffect(() => {
    const element = svg.current

    if (!element) return

    const rect = element.getBoundingClientRect()
    latest.current.setView(
      fitView(latest.current.page.elements, rect.width, rect.height)
    )
    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      if (gesture.current) return

      const current = latest.current

      if (event.ctrlKey || event.metaKey)
        current.setView(
          zoomAt(
            current.view,
            local(event),
            current.view.zoom * Math.exp(-event.deltaY * 0.006)
          )
        )
      else
        current.setView({
          ...current.view,
          x: current.view.x - event.deltaX,
          y: current.view.y - event.deltaY
        })
    }
    element.addEventListener('wheel', wheel, { passive: false })
    window.addEventListener('blur', cancel)

    return () => {
      element.removeEventListener('wheel', wheel)
      window.removeEventListener('blur', cancel)
      gesture.current = null
    }
  }, [e.pageId])

  useEffect(() => {
    if (e.readOnly) cancel()
  }, [e.readOnly])

  function pointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.button !== 0 && event.button !== 1) return

    if (gesture.current) {
      cancel()

      return
    }
    svg.current?.focus()
    event.preventDefault()
    const point = local(event),
      world = toWorld(point, e.view)
    const target = event.target as SVGElement
    const id = target.closest('[data-element]')?.getAttribute('data-element')
    const edge = target.closest('[data-edge]')?.getAttribute('data-edge')
    const resize = target.closest('[data-resize]')?.getAttribute('data-resize')
    const vectorNode = target
      .closest('[data-vector-node]')
      ?.getAttribute('data-vector-node')
    const start: Gesture = {
      kind: 'marquee',
      start: world,
      client: point,
      page: clone(e.page),
      basis: clone(e.page),
      view: e.view,
      ids: [],
      pointer: event.pointerId
    }

    if (event.button === 1 || e.tool === 'hand') start.kind = 'pan'
    else if (vectorNode && e.vectorEditing && e.tool !== 'pen' && !e.readOnly) {
      const item = page.elements.find(el => el.id === e.vectorEditing)

      if (!item || item.locked) return
      start.kind = 'vector'
      start.element = item.id
      start.node = vectorNode
      start.handle = (target.getAttribute('data-vector-handle') ?? 'anchor') as
        'anchor' | 'in' | 'out'
      e.setVectorNode(vectorNode)
    } else if (e.tool === 'comment' && !e.readOnly) {
      const item = page.elements.find(el => el.id === id)
      e.setCommentPin({
        x: world.x - (item?.x ?? 0),
        y: world.y - (item?.y ?? 0),
        element: item?.id ?? null
      })
      e.setActiveComment(null)
      e.setCommentsOpen(true)

      return
    } else if (e.tool === 'pen' && !e.readOnly) {
      const item = page.elements.find(
        el =>
          el.id === e.vectorEditing &&
          el.vector?.length === 1 &&
          !el.vector[0]!.closed
      )

      if (item && item.vector) {
        const vector = clone(item.vector),
          contour = vector[0]!,
          point = vectorPoint(item, world)

        if (contour.nodes.length >= 2000) return

        const first = contour.nodes[0]!

        if (
          contour.nodes.length > 2 &&
          Math.hypot(point.x - first.x, point.y - first.y) * e.view.zoom < 10
        ) {
          contour.closed = true
          e.setTool('select')
        } else
          contour.nodes.push({
            id: crypto.randomUUID(),
            ...point,
            mode: 'corner',
            in: null,
            out: null
          })
        e.changeElements([item.id], { vector })
        e.setVectorNode(contour.nodes[contour.nodes.length - 1]!.id)
      } else {
        const item = makeElement('path', world, t('tools.pen'))
        item.width = 512
        item.height = 512
        item.strokeWidth = 2
        item.fillOpacity = 0
        item.pathViewBox = { x: 0, y: 0, width: 512, height: 512 }
        const id = crypto.randomUUID()
        item.vector = [
          {
            id: crypto.randomUUID(),
            closed: false,
            nodes: [{ id, x: 0, y: 0, in: null, out: null, mode: 'corner' }]
          }
        ]
        e.insertElement(e.pageId, item)
        e.setVectorEditing(item.id)
        e.setVectorNode(id)
      }

      return
    } else if (resize && !e.readOnly) {
      start.kind = 'resize'
      start.ids = [resize]
    } else if (e.tool === 'connect' && id && !e.readOnly) {
      e.connect(id)

      return
    } else if (id && (e.tool === 'select' || e.readOnly)) {
      const item = page.elements.find(el => el.id === id)!
      const ids = event.altKey ? [id] : selectionIds(page, id)
      const selected = event.shiftKey
        ? e.selected.includes(id)
          ? e.selected.filter(key => !ids.includes(key))
          : [...new Set([...e.selected, ...ids])]
        : e.selected.includes(id)
          ? e.selected
          : ids
      e.setSelected(selected)
      if (item.locked || e.readOnly) return
      start.kind = 'move'
      start.ids = [...descendants(page, selected)]
    } else if (edge && e.tool === 'select') {
      e.setSelected([edge])

      return
    } else if (
      !['select', 'hand', 'connect', 'image'].includes(e.tool) &&
      !e.readOnly
    ) {
      const element = makeElement(
        e.tool as 'rectangle',
        world,
        t(`tools.${e.tool}`)
      )

      if (e.tool === 'path') {
        element.width = 1
        element.height = 1
        element.strokeWidth = 3
        element.points = [{ x: 0, y: 0 }]
      }
      start.kind = 'draw'
      start.element = element.id
      start.page.elements.push(element)
      e.setSelected([element.id])
      start.draft = start.page
      e.setPreview(start.page)
    } else {
      e.setSelected(event.shiftKey ? e.selected : [])
      start.ids = event.shiftKey ? e.selected : []
    }
    gesture.current = start
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function pointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    e.setCursor(toWorld(local(event), e.view))
    const current = gesture.current

    if (!current || current.pointer !== event.pointerId) return

    const point = local(event),
      world = toWorld(point, current.view)
    const dx = world.x - current.start.x,
      dy = world.y - current.start.y

    if (current.kind === 'pan') {
      e.setView({
        ...current.view,
        x: current.view.x + point.x - current.client.x,
        y: current.view.y + point.y - current.client.y
      })

      return
    }

    if (current.kind === 'marquee') {
      current.marquee = {
        x: Math.min(current.start.x, world.x),
        y: Math.min(current.start.y, world.y),
        width: Math.abs(dx),
        height: Math.abs(dy)
      }
      setMarquee(current.marquee)

      return
    }

    if (e.readOnly) {
      cancel()

      return
    }

    if (
      (current.kind === 'move' || current.kind === 'resize') &&
      Math.abs(point.x - current.client.x) +
        Math.abs(point.y - current.client.y) <
        2
    ) {
      current.draft = undefined
      e.setPreview(null)

      return
    }

    const snap = (n: number) =>
      clamp(
        e.snap && !event.altKey ? Math.round(n / 8) * 8 : n,
        -100000,
        100000
      )
    const draft = clone(current.page)

    if (current.kind === 'vector') {
      const item = draft.elements.find(el => el.id === current.element)

      if (!item?.vector || item.locked) return

      const point = vectorPoint(item, world)
      point.x = clamp(point.x, -100000, 100000)
      point.y = clamp(point.y, -100000, 100000)
      item.vector = item.vector.map(c => ({
        ...c,
        nodes: c.nodes.map(n =>
          n.id === current.node ? moveNode(n, point, current.handle!) : n
        )
      }))
    } else if (current.kind === 'move') {
      const movable = draft.elements.filter(
        el => current.ids.includes(el.id) && !el.locked
      )
      const first = movable[0]
      const moveX = first ? snap(first.x + dx) - first.x : 0,
        moveY = first ? snap(first.y + dy) - first.y : 0

      for (const item of movable) {
        item.x = clamp(item.x + moveX, -100000, 100000)
        item.y = clamp(item.y + moveY, -100000, 100000)
      }
    } else if (current.kind === 'resize') {
      const item = draft.elements.find(el => el.id === current.ids[0])!
      // Rotate pointer deltas into the object's local axes.
      const angle = (-item.rotation * Math.PI) / 180
      const localX = dx * Math.cos(angle) - dy * Math.sin(angle),
        localY = dx * Math.sin(angle) + dy * Math.cos(angle)
      const width = clamp(snap(item.width + localX), 8, 20000),
        height = clamp(
          event.shiftKey
            ? (width * item.height) / item.width
            : snap(item.height + localY),
          8,
          20000
        )

      if (item.kind === 'path')
        item.points = item.points.map(p => ({
          x: (p.x * width) / item.width,
          y: (p.y * height) / item.height
        }))

      const halfX = (width - item.width) / 2,
        halfY = (height - item.height) / 2
      item.x = clamp(
        item.x - halfX + Math.cos(-angle) * halfX - Math.sin(-angle) * halfY,
        -100000,
        100000
      )
      item.y = clamp(
        item.y - halfY + Math.sin(-angle) * halfX + Math.cos(-angle) * halfY,
        -100000,
        100000
      )
      item.width = width
      item.height = height
    } else {
      const item = draft.elements.find(el => el.id === current.element)!

      if (item.kind === 'path') {
        const base = current.page.elements.find(
          el => el.id === current.element
        )!

        if (base.points.length >= 9999) return
        base.points.push({ x: dx, y: dy })
        item.points = [...base.points]
      } else if (Math.abs(dx) + Math.abs(dy) > 5) {
        item.x = snap(Math.min(current.start.x, world.x))
        item.y = snap(Math.min(current.start.y, world.y))
        item.width = clamp(Math.abs(snap(dx)), 8, 20000)
        item.height = clamp(
          event.shiftKey ? item.width : Math.abs(snap(dy)),
          8,
          20000
        )
      }
    }
    current.draft = draft
    e.setPreview(draft)
  }

  function pointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    const current = gesture.current

    if (!current || event.pointerId !== current.pointer) return
    pointerMove(event)
    gesture.current = null
    const marquee = current.marquee

    if (current.kind === 'marquee' && marquee) {
      e.setSelected([
        ...new Set([
          ...current.ids,
          ...e.page.elements
            .filter(el => {
              const b = elementBounds(el)

              return (
                !el.hidden &&
                !el.locked &&
                b.x >= marquee.x &&
                b.y >= marquee.y &&
                b.x + b.width <= marquee.x + marquee.width &&
                b.y + b.height <= marquee.y + marquee.height
              )
            })
            .map(el => el.id)
        ])
      ])
    } else if (current.kind !== 'pan' && current.draft && !e.readOnly) {
      const next = clone(current.draft)

      if (current.kind === 'draw' && current.element) {
        const item = next.elements.find(el => el.id === current.element)!

        if (item.kind === 'path') {
          const minX = Math.min(...item.points.map(p => p.x)),
            minY = Math.min(...item.points.map(p => p.y))
          item.width = Math.max(
            1,
            Math.max(...item.points.map(p => p.x)) - minX
          )
          item.height = Math.max(
            1,
            Math.max(...item.points.map(p => p.y)) - minY
          )
          item.x += minX
          item.y += minY
          item.points = item.points.map(p => ({ x: p.x - minX, y: p.y - minY }))
        }
        e.setTool('select')
      }
      e.updatePage(next, current.basis)
    }
    e.setPreview(null)
    setMarquee(null)
  }

  return (
    <Box
      className="redraw-stage"
      flex="1"
      height="100%"
      minHeight="12rem"
      minWidth="0"
      overflow="hidden"
      position="relative"
    >
      <svg
        ref={svg}
        aria-describedby="redraw-keys"
        aria-label={t('editor.surface')}
        className="redraw-viewport"
        data-tool={e.tool}
        role="application"
        style={{ backgroundColor: page.background }}
        tabIndex={0}
        onDoubleClick={event => {
          const id = (event.target as SVGElement)
            .closest('[data-element]')
            ?.getAttribute('data-element')
          const element = page.elements.find(el => el.id === id)

          if (
            !e.readOnly &&
            element &&
            !element.locked &&
            ['path', 'rectangle', 'ellipse', 'diamond'].includes(element.kind)
          ) {
            try {
              e.changeElements([element.id], toVector(element))
              e.setSelected([element.id])
              e.setVectorEditing(element.id)
            } catch {
              e.setError('invalidPath')
            }

            return
          }
          document
            .querySelector<HTMLTextAreaElement>('[data-redraw-text] textarea')
            ?.focus()
        }}
        onKeyDown={event => {
          if (event.key === 'Escape') {
            cancel()
            e.setTool('select')
            e.setSelected([])
            e.setConnectionStart(null)
            e.setVectorEditing(null)
            e.setVectorNode(null)
            e.setCommentPin(null)

            return
          }

          if (event.key === '0') {
            event.preventDefault()
            fit()

            return
          }
          if (gesture.current) return

          const mod = event.ctrlKey || event.metaKey

          if (mod && event.key.toLowerCase() === 'a') {
            event.preventDefault()
            e.setSelected(
              page.elements
                .filter(el => !el.hidden && !el.locked)
                .map(el => el.id)
            )

            return
          }
          if (e.readOnly) return

          const vectorElement = page.elements.find(
            el =>
              el.id === e.vectorEditing &&
              e.selected.includes(el.id) &&
              !el.locked
          )

          if (event.key === 'Enter' && vectorElement) {
            event.preventDefault()
            e.changeElements([vectorElement.id], fitVector(vectorElement))
            e.setTool('select')
            e.setVectorEditing(null)

            return
          }

          if (
            vectorElement?.vector &&
            e.vectorNode &&
            (['Delete', 'Backspace'].includes(event.key) ||
              event.key.startsWith('Arrow'))
          ) {
            event.preventDefault()
            const vector = clone(vectorElement.vector),
              contour = vector.find(c =>
                c.nodes.some(n => n.id === e.vectorNode)
              )

            if (!contour) return

            if (['Delete', 'Backspace'].includes(event.key)) {
              if (contour.nodes.length > 1)
                contour.nodes = contour.nodes.filter(n => n.id !== e.vectorNode)
            } else {
              const step = event.shiftKey ? 10 : 1
              contour.nodes = contour.nodes.map(n =>
                n.id !== e.vectorNode
                  ? n
                  : moveNode(
                      n,
                      {
                        x:
                          n.x +
                          (event.key === 'ArrowRight'
                            ? step
                            : event.key === 'ArrowLeft'
                              ? -step
                              : 0),
                        y:
                          n.y +
                          (event.key === 'ArrowDown'
                            ? step
                            : event.key === 'ArrowUp'
                              ? -step
                              : 0)
                      },
                      'anchor'
                    )
              )
            }
            e.changeElements([vectorElement.id], { vector })

            return
          }

          if (mod && ['z', 'y'].includes(event.key.toLowerCase())) {
            event.preventDefault()
            e.history(event.shiftKey || event.key === 'y' ? 'redo' : 'undo')
          } else if (mod && event.key.toLowerCase() === 'd') {
            event.preventDefault()
            e.duplicate()
          } else if (mod && event.key.toLowerCase() === 'g') {
            event.preventDefault()
            e.group(event.shiftKey)
          } else if (event.key === 'Delete' || event.key === 'Backspace') {
            event.preventDefault()
            e.remove()
          } else if (event.key.startsWith('Arrow') && e.selected.length) {
            event.preventDefault()
            const step = event.shiftKey ? 10 : 1
            e.updatePage({
              ...page,
              elements: page.elements.map(el =>
                !e.selected.includes(el.id) || el.locked
                  ? el
                  : {
                      ...el,
                      x: clamp(
                        el.x +
                          (event.key === 'ArrowRight'
                            ? step
                            : event.key === 'ArrowLeft'
                              ? -step
                              : 0),
                        -100000,
                        100000
                      ),
                      y: clamp(
                        el.y +
                          (event.key === 'ArrowDown'
                            ? step
                            : event.key === 'ArrowUp'
                              ? -step
                              : 0),
                        -100000,
                        100000
                      )
                    }
              )
            })
          } else if (
            event.key === 'Enter' &&
            page.mode === 'blackboard' &&
            e.selected.length === 1
          ) {
            event.preventDefault()
            e.addBranch(t('samples.newIdea'))
          } else if (!mod) {
            const tools: Partial<Record<string, Tool>> = {
              v: 'select',
              h: 'hand',
              r: 'rectangle',
              o: 'ellipse',
              t: 'text',
              n: 'sticky',
              c: 'connect',
              p: 'pen',
              b: 'path',
              f: 'frame'
            }
            const tool = tools[event.key]

            if (tool) e.setTool(tool)
          }
        }}
        onLostPointerCapture={cancel}
        onPointerCancel={cancel}
        onPointerDown={pointerDown}
        onPointerLeave={() => e.setCursor(null)}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
      >
        <defs>
          <pattern
            height={24 * e.view.zoom}
            id={`${marker}-grid`}
            patternUnits="userSpaceOnUse"
            width={24 * e.view.zoom}
            x={e.view.x}
            y={e.view.y}
          >
            <circle cx="1" cy="1" fill="#64748b" opacity="0.25" r="1" />
          </pattern>
          <marker
            id={marker}
            markerHeight="7"
            markerWidth="7"
            orient="auto-start-reverse"
            refX="9"
            refY="5"
            viewBox="0 0 10 10"
          >
            <path d="M0 0L10 5L0 10z" fill="context-stroke" />
          </marker>
        </defs>
        {e.grid && (
          <rect fill={`url(#${marker}-grid)`} height="100%" width="100%" />
        )}
        <g
          transform={`translate(${e.view.x} ${e.view.y}) scale(${e.view.zoom})`}
        >
          {page.elements
            .filter(el => !el.hidden && el.kind === 'frame')
            .map(el => (
              <g key={el.id} data-element={el.id}>
                <ClippedGraphic element={el} page={page} />
                <text
                  fill="#64748b"
                  fontSize={13 / e.view.zoom}
                  x={el.x}
                  y={el.y - 12}
                >
                  {el.name}
                </text>
              </g>
            ))}
          {page.connectors.map(edge => {
            const geometry = edgeGeometry(edge, page.elements)

            return (
              geometry && (
                <g key={edge.id} className="redraw-edge" data-edge={edge.id}>
                  <path
                    d={geometry.path}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={18 / e.view.zoom}
                  />
                  <path
                    d={geometry.path}
                    fill="none"
                    markerEnd={edge.arrow ? `url(#${marker})` : undefined}
                    stroke={
                      e.selected.includes(edge.id) ? '#7c3aed' : edge.color
                    }
                    strokeWidth={e.selected.includes(edge.id) ? 3 : 2}
                  />
                  {edge.label && (
                    <text
                      fill={edge.color}
                      fontSize="16"
                      textAnchor="middle"
                      x={geometry.x}
                      y={geometry.y - 12}
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              )
            )
          })}
          {page.elements
            .filter(el => !el.hidden && el.kind !== 'frame')
            .map(el => (
              <g key={el.id} data-element={el.id}>
                <ClippedGraphic element={el} page={page}>
                  <ElementGraphic element={el} />
                  <rect
                    fill="transparent"
                    height={el.height}
                    transform={`rotate(${el.rotation} ${el.x + el.width / 2} ${el.y + el.height / 2})`}
                    width={el.width}
                    x={el.x}
                    y={el.y}
                  />
                </ClippedGraphic>
              </g>
            ))}
          {page.elements
            .filter(
              el =>
                !el.hidden &&
                (e.selected.includes(el.id) || e.connectionStart === el.id)
            )
            .map(el => (
              <g
                key={`selection-${el.id}`}
                transform={`translate(${el.x} ${el.y}) rotate(${el.rotation} ${el.width / 2} ${el.height / 2})`}
              >
                <rect
                  fill="none"
                  height={el.height}
                  pointerEvents="none"
                  stroke="#7c3aed"
                  strokeWidth={1.5 / e.view.zoom}
                  width={el.width}
                />
                {!e.readOnly && !el.locked && e.vectorEditing !== el.id && (
                  <rect
                    className="redraw-resize"
                    data-resize={el.id}
                    fill="#ffffff"
                    height={10 / e.view.zoom}
                    stroke="#7c3aed"
                    strokeWidth={1.5 / e.view.zoom}
                    width={10 / e.view.zoom}
                    x={el.width - 5 / e.view.zoom}
                    y={el.height - 5 / e.view.zoom}
                  />
                )}
              </g>
            ))}
          {e.peers
            .filter(peer => peer.page === e.pageId)
            .map(peer => (
              <g
                key={`${peer.user}:${peer.session}`}
                data-peer={peer.session}
                pointerEvents="none"
              >
                {page.elements
                  .filter(element => peer.selection.includes(element.id))
                  .map(element => (
                    <rect
                      key={element.id}
                      {...elementBounds(element)}
                      fill="none"
                      stroke={peer.color}
                      strokeDasharray="5 3"
                      strokeWidth={2 / e.view.zoom}
                    />
                  ))}
                {peer.cursor && (
                  <g
                    transform={`translate(${peer.cursor.x} ${peer.cursor.y}) scale(${1 / e.view.zoom})`}
                  >
                    <path
                      d="M0 0L5 20L10 12L20 8Z"
                      fill={peer.color}
                      stroke="white"
                    />
                    <rect
                      fill={peer.color}
                      height="23"
                      rx="5"
                      width={Math.min(180, peer.name.length * 7 + 14)}
                      x="14"
                      y="16"
                    />
                    <text fill="white" fontSize="12" x="21" y="32">
                      {peer.name.slice(0, 24)}
                    </text>
                  </g>
                )}
              </g>
            ))}
          {marquee && (
            <rect
              {...marquee}
              fill="#7c3aed20"
              pointerEvents="none"
              stroke="#7c3aed"
              strokeWidth={1 / e.view.zoom}
            />
          )}
          <VectorHandles />
          {e.commentsOpen && <CommentPins />}
        </g>
      </svg>
      <Box
        bottom="1rem"
        className="redraw-stage-hint"
        display={{ base: 'none', lg: 'block' }}
        left="1rem"
        maxWidth="55%"
        position="absolute"
      >
        <Text bg={surface.default} color="muted" p="xs" size="sm">
          {e.connectionStart ? t('editor.connectTarget') : t(`hints.${e.tool}`)}
        </Text>
      </Box>
      <Flex
        align="center"
        bg={surface.default}
        bottom="1rem"
        gap="xs"
        p="xs"
        position="absolute"
        r="md"
        right="1rem"
      >
        <Button
          aria-label={t('editor.zoomOut')}
          icon="lucide:minus"
          variant="plain"
          onClick={() =>
            e.setView(
              zoomAt(
                e.view,
                {
                  x: (svg.current?.clientWidth ?? 800) / 2,
                  y: (svg.current?.clientHeight ?? 600) / 2
                },
                e.view.zoom / 1.25
              )
            )
          }
        />
        <Text size="sm">{Math.round(e.view.zoom * 100)}%</Text>
        <Button
          aria-label={t('editor.zoomIn')}
          icon="lucide:plus"
          variant="plain"
          onClick={() =>
            e.setView(
              zoomAt(
                e.view,
                {
                  x: (svg.current?.clientWidth ?? 800) / 2,
                  y: (svg.current?.clientHeight ?? 600) / 2
                },
                e.view.zoom * 1.25
              )
            )
          }
        />
        <Button
          aria-label={t('editor.fit')}
          icon="lucide:maximize"
          variant="plain"
          onClick={fit}
        />
      </Flex>
    </Box>
  )
}
