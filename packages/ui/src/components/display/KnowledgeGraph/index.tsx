import type {
  GraphEdgeKind,
  GraphNode,
  KnowledgeSnapshot,
  PageKind
} from '@monolith/blocks'
import {
  type Simulation,
  type SimulationNodeDatum,
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY
} from 'd3-force'
import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/inputs'
import { Box, Flex, Text } from '@/components/primitives'
import { spring, stepSpring } from '@/utils/spring'

import { atlasTargets, graphLabels } from './atlasLayout'
import './graph.css'

type Viewport = { x: number; y: number; scale: number }

const initialViewport: Viewport = { x: 0, y: 0, scale: 1 }

export function KnowledgeGraph<Kind extends string = PageKind>({
  graph,
  selected,
  onSelect,
  onOpen,
  onSelectEdge,
  selectedEdge,
  nodeLabel,
  presentation = 'standard',
  layout = 'force',
  root,
  showLabels = true,
  paused = false,
  spacing = 140
}: {
  graph: KnowledgeSnapshot<Kind, GraphEdgeKind>
  selected?: string
  onSelect: (key: string) => void
  onOpen?: (node: GraphNode<Kind>) => void
  onSelectEdge?: (id: string) => void
  selectedEdge?: string
  nodeLabel?: (node: GraphNode<Kind>) => string
  presentation?: 'standard' | 'atlas'
  layout?: 'force' | 'radial'
  root?: string
  showLabels?: boolean
  paused?: boolean
  spacing?: number
}) {
  type PositionedNode = GraphNode<Kind> &
    SimulationNodeDatum & { tx?: number; ty?: number }
  const { t } = useTranslation('common')
  const svg = useRef<SVGSVGElement>(null)
  const simulation = useRef<Simulation<PositionedNode, undefined> | null>(null)
  const reducedMotion = useRef(false)
  const clickedNode = useRef<string | undefined>(undefined)
  const cached = useRef(new Map<string, { x: number; y: number }>())
  const nodeElements = useRef(new Map<string, SVGGElement>())
  const edgeElements = useRef(new Map<string, SVGLineElement>())
  const labelElements = useRef(new Map<string, SVGTextElement>())
  const refreshLabels = useRef(() => {})
  const lastLayout = useRef('')
  const layoutFrame = useRef(0)
  const autoFit = useRef(true)
  const pausedRef = useRef(paused)
  const previousPaused = useRef(paused)
  const cancelPointer = useRef(() => {})
  pausedRef.current = paused
  const positions = useMemo<PositionedNode[]>(
    () =>
      graph.nodes.map((node, i) => ({
        ...node,
        ...(cached.current.get(node.key) ?? {
          x: 500 + Math.cos(i * 2.399) * (40 + Math.sqrt(i) * 35),
          y: 320 + Math.sin(i * 2.399) * (40 + Math.sqrt(i) * 35)
        })
      })),
    [graph.nodes]
  )
  const lookup = useMemo(
    () => new Map(positions.map(node => [node.key, node])),
    [positions]
  )
  const edges = useMemo(
    () =>
      graph.edges.filter(
        edge => lookup.has(edge.source) && lookup.has(edge.target)
      ),
    [graph.edges, lookup]
  )
  const [hovered, setHovered] = useState<string>()
  const [viewport, setViewport] = useState(initialViewport)
  const [unitScale, setUnitScale] = useState(1)
  const [canvasHeight, setCanvasHeight] = useState(640)
  const canvas = useRef({ height: 640, unit: 1 })
  canvas.current = { height: canvasHeight, unit: unitScale }
  const viewportRef = useRef(viewport)
  const zoomFrame = useRef(0)
  const zoomTarget = useRef<Viewport | null>(null)
  useEffect(
    () => () => {
      cancelAnimationFrame(zoomFrame.current)
      cancelAnimationFrame(layoutFrame.current)
    },
    []
  )

  viewportRef.current = viewport
  const drag = useRef<{
    pointer: number
    node?: PositionedNode
    x: number
    y: number
    view: Viewport
    moved: boolean
    origin?: { x: number; y: number }
  } | null>(null)
  cancelPointer.current = () => {
    const action = drag.current
    if (!action) return
    drag.current = null
    if (action.node) {
      action.node.fx = null
      action.node.fy = null
      if (action.origin) Object.assign(action.node, action.origin)
      simulation.current?.alphaTarget(0).stop()
      paint()
    } else moveViewport(action.view, false)
    if (svg.current?.hasPointerCapture(action.pointer))
      svg.current.releasePointerCapture(action.pointer)
  }
  useEffect(() => {
    const blur = () => {
      cancelPointer.current()
      cancelAnimationFrame(zoomFrame.current)
      zoomTarget.current = null
      setHovered(undefined)
    }
    window.addEventListener('blur', blur)
    return () => window.removeEventListener('blur', blur)
  }, [])
  const degree = useMemo(() => {
    const values = new Map<string, number>()

    for (const edge of graph.edges)
      for (const key of [edge.source, edge.target])
        values.set(key, (values.get(key) ?? 0) + 1)

    return values
  }, [graph.edges])

  useEffect(() => {
    if (!svg.current) return

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect

      if (width && height) {
        setUnitScale(
          presentation === 'atlas'
            ? width / 1000
            : Math.min(width / 1000, height / 640)
        )
        setCanvasHeight(
          presentation === 'atlas' ? (height / width) * 1000 : 640
        )
      }
    })
    observer.observe(svg.current)

    return () => observer.disconnect()
  }, [presentation])

  useEffect(() => {
    if (autoFit.current) fit(false)
    // Resizing the inspector must use the actual drawable canvas bounds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasHeight, unitScale])

  useEffect(() => {
    const nodes = positions
    const signature = [
      layout,
      root,
      spacing,
      ...nodes.map(node => node.key).sort(),
      ...edges.map(edge => `${edge.source}:${edge.target}:${edge.kind}`).sort()
    ].join('|')
    const changed = lastLayout.current !== signature
    const firstLayout = !lastLayout.current
    lastLayout.current = signature
    if (changed) autoFit.current = true
    drag.current = null
    for (const key of cached.current.keys())
      if (!lookup.has(key)) cached.current.delete(key)
    const targets =
      presentation === 'atlas'
        ? atlasTargets(nodes, edges, spacing)
        : new Map<string, { x: number; y: number; group: number }>()
    if (layout === 'radial' && nodes.length) {
      const center = lookup.has(root ?? '')
        ? root!
        : [...nodes].sort(
            (a, b) => (degree.get(b.key) ?? 0) - (degree.get(a.key) ?? 0)
          )[0].key
      const neighbors = new Map(
        nodes.map(node => [node.key, new Set<string>()])
      )
      for (const edge of edges) {
        neighbors.get(edge.source)!.add(edge.target)
        neighbors.get(edge.target)!.add(edge.source)
      }
      const depths = new Map([[center, 0]]),
        queue = [center]
      for (let i = 0; i < queue.length; i++)
        for (const neighbor of neighbors.get(queue[i])!) {
          if (!depths.has(neighbor)) {
            depths.set(neighbor, depths.get(queue[i])! + 1)
            queue.push(neighbor)
          }
        }
      const outer = Math.max(1, ...depths.values()) + 1
      const rings = new Map<number, PositionedNode[]>()
      for (const node of nodes) {
        const d = depths.get(node.key) ?? outer
        rings.set(d, [...(rings.get(d) ?? []), node])
      }
      let previousRadius = 0
      for (const [depth, ring] of rings) {
        const radius =
          depth === 0
            ? 0
            : Math.max(
                previousRadius + spacing * 1.1,
                (ring.length * 65) / (Math.PI * 2)
              )
        previousRadius = radius
        ring
          .sort((a, b) => a.key.localeCompare(b.key))
          .forEach((node, index) => {
            const angle = (index / ring.length) * Math.PI * 2 - Math.PI / 2
            node.tx = 500 + Math.cos(angle) * radius
            node.ty = 320 + Math.sin(angle) * radius
          })
      }
    } else if (presentation === 'atlas') {
      for (const node of nodes) {
        const target = targets.get(node.key)!
        node.tx = target.x
        node.ty = target.y
        if (!cached.current.has(node.key)) {
          node.x = target.x
          node.y = target.y
        }
      }
    }
    const links = edges.map(edge => ({
      source: edge.source,
      target: edge.target,
      strength:
        edge.kind === 'context'
          ? 0.025
          : edge.kind === 'topic' || edge.kind === 'tag'
            ? 0.06
            : presentation === 'atlas' &&
                targets.get(edge.source)?.group !==
                  targets.get(edge.target)?.group
              ? 0.07
              : 0.35
    }))
    const engine = forceSimulation(nodes)
      .force(
        'link',
        forceLink<
          PositionedNode,
          {
            source: string | PositionedNode
            target: string | PositionedNode
            strength: number
          }
        >(links)
          .id(node => node.key)
          .distance(spacing)
          .strength(link => (layout === 'radial' ? 0.05 : link.strength))
      )
      .force(
        'charge',
        forceManyBody<PositionedNode>().strength(node =>
          layout === 'radial'
            ? -100
            : -spacing * ((degree.get(node.key) ?? 0) < 2 ? 1.1 : 3.5)
        )
      )
      .force('center', forceCenter(500, 320))
      .force(
        'collision',
        forceCollide(presentation === 'atlas' ? 42 : 65).iterations(2)
      )
      .force(
        'x',
        forceX<PositionedNode>(500).strength(node =>
          (degree.get(node.key) ?? 0) < 2 ? 0.16 : 0.035
        )
      )
      .force(
        'y',
        forceY<PositionedNode>(320).strength(node =>
          (degree.get(node.key) ?? 0) < 2 ? 0.16 : 0.035
        )
      )
      .alphaDecay(0.055)
    if (layout === 'radial' || presentation === 'atlas')
      engine
        .force('center', null)
        .force(
          'x',
          forceX<PositionedNode>(node => node.tx ?? 500).strength(
            layout === 'radial' ? 0.65 : 0.16
          )
        )
        .force(
          'y',
          forceY<PositionedNode>(node => node.ty ?? 320).strength(
            layout === 'radial' ? 0.65 : 0.16
          )
        )
    simulation.current = engine
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const changeMotion = () => {
      reducedMotion.current = reduced.matches
      if (reduced.matches || pausedRef.current) {
        cancelAnimationFrame(layoutFrame.current)
        cancelAnimationFrame(zoomFrame.current)
        zoomTarget.current = null
        engine.stop().tick(160)
        paint()
        if (autoFit.current) fit(false)
      }
    }
    engine.on('tick', paint).on('end', () => {
      refreshLabels.current()
    })
    engine.stop()
    reducedMotion.current = reduced.matches
    if (changed && presentation === 'atlas') {
      const start = nodes.map(node => ({ x: node.x ?? 500, y: node.y ?? 320 }))
      engine.tick(140)
      if (layout === 'force' && nodes.length > 1) {
        const bounds = svg.current?.getBoundingClientRect()
        const xs = nodes.map(node => node.x!),
          ys = nodes.map(node => node.y!)
        const centerX = (Math.max(...xs) + Math.min(...xs)) / 2
        const centerY = (Math.max(...ys) + Math.min(...ys)) / 2
        const aspect =
          Math.max(1, Math.max(...xs) - Math.min(...xs)) /
          Math.max(1, Math.max(...ys) - Math.min(...ys))
        const targetAspect =
          bounds && bounds.height ? bounds.width / bounds.height : 1.6
        const stretchX = Math.max(
          1,
          Math.min(2.2, (targetAspect / aspect) * 0.9)
        )
        const stretchY = Math.max(
          1,
          Math.min(2.2, (aspect / targetAspect) * 0.9)
        )
        for (const node of nodes) {
          node.x = centerX + (node.x! - centerX) * stretchX
          node.y = centerY + (node.y! - centerY) * stretchY
          node.tx = centerX + ((node.tx ?? node.x) - centerX) * stretchX
          node.ty = centerY + ((node.ty ?? node.y) - centerY) * stretchY
        }
        engine.force(
          'x',
          forceX<PositionedNode>(node => node.tx!).strength(0.16)
        )
        engine.force(
          'y',
          forceY<PositionedNode>(node => node.ty!).strength(0.16)
        )
      }
      const end = nodes.map(node => ({ x: node.x!, y: node.y! }))
      fit(!firstLayout)
      if (firstLayout || reduced.matches || pausedRef.current) paint()
      else {
        const started = performance.now()
        const draw = (now: number) => {
          const progress = Math.min(1, (now - started) / 320)
          const eased = 1 - Math.pow(1 - progress, 3)
          nodes.forEach((node, i) => {
            node.x = start[i].x + (end[i].x - start[i].x) * eased
            node.y = start[i].y + (end[i].y - start[i].y) * eased
          })
          paint()
          if (progress < 1) layoutFrame.current = requestAnimationFrame(draw)
        }
        layoutFrame.current = requestAnimationFrame(draw)
      }
    } else if (presentation !== 'atlas') {
      engine.tick(35)
      paint()
      fit(false)
      if (!reduced.matches && !pausedRef.current) engine.alpha(0.3).restart()
      else changeMotion()
    } else paint()
    reduced.addEventListener('change', changeMotion)

    return () => {
      engine.stop()
      cancelAnimationFrame(layoutFrame.current)
      reduced.removeEventListener('change', changeMotion)
      simulation.current = null
      drag.current = null
    }
    // Selection changes must not restart the force engine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions, edges, layout, root, spacing, presentation])

  useEffect(() => {
    if (paused || reducedMotion.current) {
      cancelAnimationFrame(layoutFrame.current)
      simulation.current?.stop()
    } else if (presentation !== 'atlas' || previousPaused.current)
      simulation.current?.alpha(0.2).restart()
    previousPaused.current = paused
  }, [paused, presentation])

  // Paint coordinates without reconciling every node in React on each frame.
  function paint() {
    for (const node of positions) {
      cached.current.set(node.key, { x: node.x ?? 500, y: node.y ?? 320 })
      nodeElements.current
        .get(node.key)
        ?.setAttribute(
          'transform',
          `translate(${node.x ?? 500} ${node.y ?? 320})`
        )
    }
    for (const edge of edges) {
      const element = edgeElements.current.get(edge.id),
        source = lookup.get(edge.source)!,
        target = lookup.get(edge.target)!
      element?.setAttribute('x1', String(source.x ?? 500))
      element?.setAttribute('y1', String(source.y ?? 320))
      element?.setAttribute('x2', String(target.x ?? 500))
      element?.setAttribute('y2', String(target.y ?? 320))
    }
    refreshLabels.current()
  }

  function zoom(
    factor: number,
    anchor = { x: 500, y: canvas.current.height / 2 }
  ) {
    autoFit.current = false
    const view = zoomTarget.current ?? viewportRef.current
    const scale = Math.max(0.06, Math.min(5, view.scale * factor))
    const ratio = scale / view.scale
    const target = {
      scale,
      x: anchor.x - (anchor.x - view.x) * ratio,
      y: anchor.y - (anchor.y - view.y) * ratio
    }
    moveViewport(target)
  }

  function moveViewport(target: Viewport, animate = true) {
    cancelAnimationFrame(zoomFrame.current)
    zoomTarget.current = target
    if (reducedMotion.current || !animate) {
      zoomTarget.current = null
      viewportRef.current = target
      setViewport(target)
      return
    }
    const x = spring(viewportRef.current.x),
      y = spring(viewportRef.current.y),
      z = spring(viewportRef.current.scale)
    let last = performance.now(),
      elapsed = 0
    const draw = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      elapsed += dt
      const next = {
        x: stepSpring(x, target.x, dt, 420, 36),
        y: stepSpring(y, target.y, dt, 420, 36),
        scale: stepSpring(z, target.scale, dt, 420, 36)
      }
      if (elapsed > 0.6 || reducedMotion.current) {
        viewportRef.current = target
        setViewport(target)
        zoomTarget.current = null
        return
      }
      setViewport(next)
      viewportRef.current = next
      zoomFrame.current = requestAnimationFrame(draw)
    }
    zoomFrame.current = requestAnimationFrame(draw)
  }
  useEffect(() => {
    const element = svg.current

    if (!element) return

    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      const delta =
        event.deltaY *
        (event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? element.clientHeight
            : 1)
      zoom(
        Math.exp(-Math.max(-400, Math.min(400, delta)) * 0.0015),
        coordinates(event.clientX, event.clientY)
      )
    }
    element.addEventListener('wheel', wheel, { passive: false })

    return () => element.removeEventListener('wheel', wheel)
  }, [])

  function coordinates(clientX: number, clientY: number) {
    const element = svg.current!
    const point = element.createSVGPoint()
    point.x = clientX
    point.y = clientY

    return point.matrixTransform(element.getScreenCTM()!.inverse())
  }

  const [keyboardFocus, setKeyboardFocus] = useState<string>()
  const focus = hovered ?? keyboardFocus ?? selected
  const neighbors = new Set(
    graph.edges
      .filter(edge => edge.source === focus || edge.target === focus)
      .flatMap(edge => [edge.source, edge.target])
  )

  const screenScale = unitScale * viewport.scale
  const nodeRadius = (node: PositionedNode) =>
    Math.max(
      presentation === 'atlas'
        ? 6 + Math.min(10, Math.sqrt(degree.get(node.key) ?? 0) * 2)
        : 10 + Math.min(10, (degree.get(node.key) ?? 0) * 1.5),
      (node.key === selected ? 7 : 4) / Math.max(0.04, screenScale)
    )

  function updateLabels() {
    const view = viewportRef.current,
      unit = canvas.current.unit
    const scale = unit * view.scale
    const budget = Math.max(
      4,
      Math.min(
        36,
        Math.floor((1000 * unit * canvas.current.height * unit) / 26000)
      )
    )
    const visible = graphLabels(
      positions.map(node => ({
        key: node.key,
        x: ((node.x ?? 500) * view.scale + view.x) * unit,
        y: ((node.y ?? 320) * view.scale + view.y) * unit,
        radius: nodeRadius(node) * scale,
        width:
          (labelElements.current.get(node.key)?.getComputedTextLength() ??
            150 / scale) * scale,
        priority:
          !showLabels ||
          (focus && node.key !== focus && !neighbors.has(node.key))
            ? -1
            : (neighbors.has(node.key) ? 100 : 0) + (degree.get(node.key) ?? 0),
        required: node.key === focus
      })),
      1000 * unit,
      canvas.current.height * unit,
      budget
    )
    for (const [key, element] of labelElements.current) {
      const placement = visible.get(key)
      element.setAttribute('data-visible', String(!!placement))
      if (placement) {
        element.setAttribute('x', String(placement.x / scale))
        element.setAttribute('y', String(placement.y / scale))
        element.setAttribute('text-anchor', placement.anchor)
      }
    }
  }
  refreshLabels.current = updateLabels
  useEffect(updateLabels, [
    viewport,
    unitScale,
    canvasHeight,
    focus,
    showLabels,
    positions
  ])

  function fit(animate = true) {
    if (!positions.length) {
      moveViewport(initialViewport, false)

      return
    }

    const xs = positions.map(node => node.x ?? 500),
      ys = positions.map(node => node.y ?? 320)
    const minX = Math.min(...xs) - 85,
      maxX = Math.max(...xs) + 85,
      minY = Math.min(...ys) - 60,
      maxY = Math.max(...ys) + 60
    const height = canvas.current.height
    const scale = Math.min(
      1.5,
      880 / (maxX - minX),
      (height * 0.82) / (maxY - minY)
    )
    moveViewport(
      {
        scale,
        x: 500 - ((minX + maxX) / 2) * scale,
        y: height / 2 - ((minY + maxY) / 2) * scale
      },
      animate
    )
  }

  return (
    <Box
      className="knowledge-graph-frame"
      data-presentation={presentation}
      bg={{ base: 'bg-100', dark: 'bg-900' }}
      minWidth="0"
      overflow="hidden"
      position="relative"
      r="xl"
      style={
        {
          '--graph-label-size': `${12 / Math.max(0.001, unitScale * viewport.scale)}px`
        } as CSSProperties
      }
      width="100%"
    >
      <Flex
        className="knowledge-graph-toolbar"
        align="center"
        gap="xs"
        justify="between"
        p="sm"
        wrap="wrap"
      >
        <Text color="muted" size="sm">
          {t('graph.count', {
            nodes: graph.nodes.length,
            edges: graph.edges.length
          })}
        </Text>
        <Flex gap="xs">
          <Button
            aria-label={t('graph.zoomIn')}
            icon="tabler:plus"
            namespace={false}
            variant="plain"
            onClick={() => zoom(1.2)}
          />
          <Button
            aria-label={t('graph.zoomOut')}
            icon="tabler:minus"
            namespace={false}
            variant="plain"
            onClick={() => zoom(1 / 1.2)}
          />
          <Button
            icon="tabler:focus-centered"
            namespace={false}
            variant="secondary"
            onClick={() => {
              autoFit.current = true
              fit()
            }}
          >
            {t('graph.fit')}
          </Button>
        </Flex>
      </Flex>
      <svg
        ref={svg}
        aria-label={t('graph.map')}
        className="zillion-knowledge-graph"
        role="group"
        tabIndex={0}
        viewBox={`0 0 1000 ${canvasHeight}`}
        onDoubleClick={event => {
          const key = (event.target as Element)
            .closest('[data-node-key]')
            ?.getAttribute('data-node-key')
          const node = graph.nodes.find(node => node.key === key)

          if (node) onOpen?.(node)
        }}
        onKeyDown={event => {
          if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            cancelAnimationFrame(layoutFrame.current)
            cancelAnimationFrame(zoomFrame.current)
            zoomTarget.current = null
            const wasDragging = !!drag.current
            cancelPointer.current()
            setHovered(undefined)
            if (!wasDragging) {
              setKeyboardFocus(undefined)
              svg.current?.focus({ preventScroll: true })
              onSelect('')
            }
            return
          }
          if (event.target !== event.currentTarget) return

          if (['+', '=', '-'].includes(event.key)) {
            event.preventDefault()
            zoom(event.key === '-' ? 1 / 1.2 : 1.2)
          }

          const delta = {
            ArrowLeft: [35, 0],
            ArrowRight: [-35, 0],
            ArrowUp: [0, 35],
            ArrowDown: [0, -35]
          }[event.key]

          if (delta) {
            event.preventDefault()
            cancelAnimationFrame(zoomFrame.current)
            zoomTarget.current = null
            autoFit.current = false
            setViewport(view => ({
              ...view,
              x: view.x + delta[0],
              y: view.y + delta[1]
            }))
          }
        }}
        onPointerCancel={() => cancelPointer.current()}
        onLostPointerCapture={() => cancelPointer.current()}
        onPointerDown={event => {
          if (event.button !== 0 || drag.current) return
          cancelAnimationFrame(layoutFrame.current)
          cancelAnimationFrame(zoomFrame.current)
          zoomTarget.current = null
          if (
            (event.target as Element).closest('[data-edge-id]') &&
            onSelectEdge
          )
            return

          const element = (event.target as Element).closest('[data-node-key]')
          const key = element?.getAttribute('data-node-key')
          const node = simulation.current
            ?.nodes()
            .find(node => node.key === key)
          const point = coordinates(event.clientX, event.clientY)
          drag.current = {
            pointer: event.pointerId,
            node,
            x: point.x,
            y: point.y,
            view: viewportRef.current,
            moved: false,
            origin: node ? { x: node.x ?? 500, y: node.y ?? 320 } : undefined
          }

          if (node) {
            node.fx = node.x
            node.fy = node.y
          }
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={event => {
          const action = drag.current

          if (!action || action.pointer !== event.pointerId) return

          const point = coordinates(event.clientX, event.clientY)

          if (Math.hypot(point.x - action.x, point.y - action.y) > 4) {
            action.moved = true
            autoFit.current = false
          }
          if (action.node) {
            if (!action.moved) return
            action.node.fx = (point.x - action.view.x) / action.view.scale
            action.node.fy = (point.y - action.view.y) / action.view.scale

            action.node.x = action.node.fx
            action.node.y = action.node.fy
            paint()
            if (!reducedMotion.current && !paused)
              simulation.current?.alphaTarget(0.04).restart()
          } else
            setViewport({
              ...action.view,
              x: action.view.x + point.x - action.x,
              y: action.view.y + point.y - action.y
            })
        }}
        onPointerUp={event => {
          const action = drag.current

          if (!action || action.pointer !== event.pointerId) return

          if (action.node) {
            if (!action.moved) {
              clickedNode.current = action.node.key
              onSelect(action.node.key)
            } else clickedNode.current = undefined
            action.node.fx = null
            action.node.fy = null
            simulation.current?.alphaTarget(0)
          } else {
            clickedNode.current = undefined
            if (!action.moved) onSelect('')
          }
          drag.current = null
          event.currentTarget.releasePointerCapture(event.pointerId)
        }}
      >
        <g
          transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.scale})`}
        >
          {edges.map(edge => {
            const source = lookup.get(edge.source),
              target = lookup.get(edge.target)

            return source && target ? (
              <line
                key={edge.id}
                ref={element => {
                  if (element) edgeElements.current.set(edge.id, element)
                  else edgeElements.current.delete(edge.id)
                }}
                className="zillion-graph-edge"
                style={
                  edge.color
                    ? ({ '--graph-color': edge.color } as CSSProperties)
                    : undefined
                }
                data-colored={!!edge.color}
                data-edge-id={edge.id}
                data-selected={edge.id === selectedEdge}
                role={onSelectEdge ? 'button' : undefined}
                tabIndex={onSelectEdge ? 0 : undefined}
                aria-label={`${source.title} → ${target.title}: ${edge.label}`}
                onClick={() => onSelectEdge?.(edge.id)}
                onKeyDown={event => {
                  if (
                    onSelectEdge &&
                    (event.key === 'Enter' || event.key === ' ')
                  ) {
                    event.preventDefault()
                    event.stopPropagation()
                    onSelectEdge(edge.id)
                  }
                }}
                data-active={edge.source === focus || edge.target === focus}
                data-dimmed={
                  !!focus && edge.source !== focus && edge.target !== focus
                }
                data-kind={edge.kind}
                x1={source.x}
                x2={target.x}
                y1={source.y}
                y2={target.y}
              >
                <title>{`${source.title} → ${target.title}\n${edge.label}${edge.evidence?.length ? '\n' + edge.evidence.join(' · ') : ''}`}</title>
              </line>
            ) : null
          })}
          {positions.map(node => (
            <g
              key={node.key}
              ref={element => {
                if (element) nodeElements.current.set(node.key, element)
                else nodeElements.current.delete(node.key)
              }}
              aria-label={
                nodeLabel?.(node) ??
                `${node.title} · ${t(`graph.kinds.${node.kind}`)}`
              }
              aria-pressed={node.key === selected}
              className="zillion-graph-node"
              data-dimmed={
                !!focus && node.key !== focus && !neighbors.has(node.key)
              }
              data-kind={node.kind}
              data-entity={node.entityType}
              data-colored={!!node.color}
              style={
                node.color
                  ? ({ '--graph-color': node.color } as CSSProperties)
                  : undefined
              }
              data-node-key={node.key}
              data-selected={node.key === selected}
              data-neighbor={neighbors.has(node.key)}
              role="button"
              tabIndex={0}
              transform={`translate(${node.x ?? 500} ${node.y ?? 320})`}
              onPointerEnter={() => {
                if (!drag.current) setHovered(node.key)
              }}
              onPointerLeave={() => setHovered(undefined)}
              onFocus={() => setKeyboardFocus(node.key)}
              onBlur={() => setKeyboardFocus(undefined)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  event.stopPropagation()
                  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey))
                    onOpen?.(node)
                  else onSelect(node.key)
                }
              }}
            >
              <title>{node.title}</title>
              <circle
                className="zillion-graph-halo"
                r={nodeRadius(node) + 6 / Math.max(0.08, screenScale)}
              />
              <circle className="zillion-graph-dot" r={nodeRadius(node)} />
              <text
                ref={element => {
                  if (element) labelElements.current.set(node.key, element)
                  else labelElements.current.delete(node.key)
                }}
                textAnchor="middle"
                y={nodeRadius(node) + 18 / Math.max(0.04, screenScale)}
              >
                {node.title.length > 28
                  ? node.title.slice(0, 27) + '…'
                  : node.title}
              </text>
            </g>
          ))}
        </g>
      </svg>
      {!graph.nodes.length && (
        <Text align="center" as="p" color="muted" p="lg">
          {t('graph.empty')}
        </Text>
      )}
      <Text as="p" color="muted" pb="md" px="md" size="sm">
        {t('graph.hint')}
      </Text>
    </Box>
  )
}
