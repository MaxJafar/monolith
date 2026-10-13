import {
  type Simulation,
  type SimulationNodeDatum,
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation
} from 'd3-force'
import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { GraphNode, KnowledgeSnapshot } from '@lifeforge/blocks'

import { Button } from '@/components/inputs'
import { Box, Flex, Text } from '@/components/primitives'

import './graph.css'

type PositionedNode = GraphNode & SimulationNodeDatum
type Viewport = { x: number; y: number; scale: number }

const initialViewport: Viewport = { x: 0, y: 0, scale: 1 }

export function KnowledgeGraph({
  graph,
  selected,
  onSelect,
  onOpen
}: {
  graph: KnowledgeSnapshot
  selected?: string
  onSelect: (key: string) => void
  onOpen?: (node: GraphNode) => void
}) {
  const { t } = useTranslation('common')
  const svg = useRef<SVGSVGElement>(null)
  const simulation = useRef<Simulation<PositionedNode, undefined> | null>(null)
  const reducedMotion = useRef(false)
  const clickedNode = useRef<string | undefined>(undefined)
  const cached = useRef(new Map<string, { x: number; y: number }>())
  const [positions, setPositions] = useState<PositionedNode[]>([])
  const [viewport, setViewport] = useState(initialViewport)
  const [unitScale, setUnitScale] = useState(1)
  const viewportRef = useRef(viewport)

  viewportRef.current = viewport
  const drag = useRef<{
    pointer: number
    node?: PositionedNode
    x: number
    y: number
    view: Viewport
    moved: boolean
  } | null>(null)
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

      if (width && height) setUnitScale(Math.min(width / 1000, height / 640))
    })
    observer.observe(svg.current)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const nodes: PositionedNode[] = graph.nodes.map((node, i) => ({
      ...node,
      ...(cached.current.get(node.key) ?? {
        x: 500 + Math.cos(i * 2.399) * (40 + Math.sqrt(i) * 26),
        y: 320 + Math.sin(i * 2.399) * (40 + Math.sqrt(i) * 26)
      })
    }))
    const links = graph.edges.map(edge => ({
      source: edge.source,
      target: edge.target
    }))
    const engine = forceSimulation(nodes)
      .force(
        'link',
        forceLink<
          PositionedNode,
          { source: string | PositionedNode; target: string | PositionedNode }
        >(links)
          .id(node => node.key)
          .distance(140)
          .strength(0.35)
      )
      .force('charge', forceManyBody().strength(-440))
      .force('center', forceCenter(500, 320))
      .force('collision', forceCollide(45))
      .alphaDecay(0.055)
    simulation.current = engine
    const paint = () => {
      for (const node of nodes)
        cached.current.set(node.key, { x: node.x ?? 500, y: node.y ?? 320 })
      setPositions(nodes.map(node => ({ ...node })))
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const changeMotion = () => {
      reducedMotion.current = reduced.matches
      if (reduced.matches) {
        engine.stop().tick(160)
        paint()
      } else engine.alpha(0.3).restart()
    }
    engine.on('tick', paint)
    paint()
    changeMotion()
    reduced.addEventListener('change', changeMotion)

    return () => {
      engine.stop()
      reduced.removeEventListener('change', changeMotion)
      simulation.current = null
    }
  }, [graph.nodes, graph.edges])

  function zoom(factor: number) {
    setViewport(view => {
      const scale = Math.max(0.25, Math.min(4, view.scale * factor))
      const ratio = scale / view.scale

      return {
        scale,
        x: 500 - (500 - view.x) * ratio,
        y: 320 - (320 - view.y) * ratio
      }
    })
  }
  useEffect(() => {
    const element = svg.current

    if (!element) return

    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      zoom(Math.exp(-event.deltaY * 0.0015))
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

  const lookup = new Map(positions.map(node => [node.key, node]))
  const neighbors = new Set(
    graph.edges
      .filter(edge => edge.source === selected || edge.target === selected)
      .flatMap(edge => [edge.source, edge.target])
  )

  function fit() {
    if (!positions.length) {
      setViewport(initialViewport)

      return
    }

    const xs = positions.map(node => node.x ?? 500),
      ys = positions.map(node => node.y ?? 320)
    const minX = Math.min(...xs) - 85,
      maxX = Math.max(...xs) + 85,
      minY = Math.min(...ys) - 60,
      maxY = Math.max(...ys) + 60
    const scale = Math.min(3, 950 / (maxX - minX), 590 / (maxY - minY))
    setViewport({
      scale,
      x: 500 - ((minX + maxX) / 2) * scale,
      y: 320 - ((minY + maxY) / 2) * scale
    })
  }

  return (
    <Box
      bg={{ base: 'bg-100', dark: 'bg-900' }}
      minWidth="0"
      overflow="hidden"
      position="relative"
      r="xl"
      style={
        {
          '--graph-label-size': `${12 / (unitScale * viewport.scale)}px`
        } as CSSProperties
      }
      width="100%"
    >
      <Flex align="center" gap="xs" justify="between" p="md" wrap="wrap">
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
            onClick={fit}
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
        viewBox="0 0 1000 640"
        onDoubleClick={() => {
          const node = graph.nodes.find(
            node => node.key === clickedNode.current
          )

          if (node) onOpen?.(node)
        }}
        onKeyDown={event => {
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
            setViewport(view => ({
              ...view,
              x: view.x + delta[0],
              y: view.y + delta[1]
            }))
          }
        }}
        onPointerCancel={() => {
          const node = drag.current?.node

          if (node) {
            node.fx = null
            node.fy = null
          }
          simulation.current?.alphaTarget(0)
          drag.current = null
        }}
        onPointerDown={event => {
          if (event.button !== 0) return

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
            moved: false
          }

          if (node) {
            node.fx = node.x
            node.fy = node.y
            if (!reducedMotion.current)
              simulation.current?.alphaTarget(0.1).restart()
          }
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={event => {
          const action = drag.current

          if (!action || action.pointer !== event.pointerId) return

          const point = coordinates(event.clientX, event.clientY)

          if (Math.hypot(point.x - action.x, point.y - action.y) > 4)
            action.moved = true
          if (action.node) {
            action.node.fx = (point.x - action.view.x) / action.view.scale
            action.node.fy = (point.y - action.view.y) / action.view.scale

            if (reducedMotion.current) {
              action.node.x = action.node.fx
              action.node.y = action.node.fy
              cached.current.set(action.node.key, {
                x: action.node.x,
                y: action.node.y
              })
              setPositions(
                simulation.current?.nodes().map(node => ({ ...node })) ?? []
              )
            }
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
          } else clickedNode.current = undefined
          drag.current = null
          event.currentTarget.releasePointerCapture(event.pointerId)
        }}
      >
        <g
          transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.scale})`}
        >
          {graph.edges.map(edge => {
            const source = lookup.get(edge.source),
              target = lookup.get(edge.target)

            return source && target ? (
              <line
                key={edge.id}
                className="zillion-graph-edge"
                data-active={
                  edge.source === selected || edge.target === selected
                }
                data-kind={edge.kind}
                x1={source.x}
                x2={target.x}
                y1={source.y}
                y2={target.y}
              >
                <title>{edge.label}</title>
              </line>
            ) : null
          })}
          {positions.map(node => (
            <g
              key={node.key}
              aria-label={`${node.title} · ${t(`graph.kinds.${node.kind}`)}`}
              aria-pressed={node.key === selected}
              className="zillion-graph-node"
              data-dimmed={
                !!selected && node.key !== selected && !neighbors.has(node.key)
              }
              data-kind={node.kind}
              data-node-key={node.key}
              data-selected={node.key === selected}
              role="button"
              tabIndex={0}
              transform={`translate(${node.x ?? 500} ${node.y ?? 320})`}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  event.stopPropagation()
                  onSelect(node.key)
                }
              }}
            >
              <title>{node.title}</title>
              <circle
                r={10 + Math.min(10, (degree.get(node.key) ?? 0) * 1.5)}
              />
              <text
                textAnchor="middle"
                y={
                  10 +
                  Math.min(10, (degree.get(node.key) ?? 0) * 1.5) +
                  20 / (unitScale * viewport.scale)
                }
              >
                {node.title.length > 24
                  ? node.title.slice(0, 23) + '…'
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
