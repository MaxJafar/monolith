import { useEffect, useRef, useState } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import { Box, Button, Flex, Icon, Stack, Text } from '@monolith/ui'

import type { FlowNode } from '../../shared'
import { useAutomation } from './AutomationProvider'

export const nodeIcons: Record<FlowNode['kind'], string> = {
  trigger: 'lucide:zap',
  set: 'lucide:braces',
  condition: 'lucide:git-branch',
  http: 'lucide:globe',
  delay: 'lucide:clock',
  output: 'lucide:terminal'
}
export function FlowCanvas() {
  const { t } = useModuleTranslation(),
    {
      draft,
      readOnly,
      busy,
      selected,
      setSelected,
      updateNode,
      connect,
      result
    } = useAutomation()
  const [zoom, setZoom] = useState(1),
    [wire, setWire] = useState<{
      source: string
      port: 'main' | 'true' | 'false'
    } | null>(null)
  const [moving, setMoving] = useState<{
    id: string
    x: number
    y: number
  } | null>(null)
  const drag = useRef<{
    id: string
    x: number
    y: number
    px: number
    py: number
  } | null>(null)
  const locked = readOnly || busy
  useEffect(() => {
    const cancel = () => {
        drag.current = null
        setMoving(null)
        setWire(null)
      },
      key = (e: KeyboardEvent) => {
        if (e.key === 'Escape') cancel()
      }
    window.addEventListener('blur', cancel)
    window.addEventListener('keydown', key)
    return () => {
      window.removeEventListener('blur', cancel)
      window.removeEventListener('keydown', key)
    }
  }, [])
  useEffect(() => {
    if (locked) {
      drag.current = null
      setMoving(null)
      setWire(null)
    }
  }, [locked])
  const nodes = draft.graph.nodes.map(n =>
    moving?.id === n.id ? { ...n, x: moving.x, y: moving.y } : n
  )
  const width = Math.max(1100, ...nodes.map(n => n.x + 300)),
    height = Math.max(600, ...nodes.map(n => n.y + 210))
  return (
    <Stack gap="none" minWidth="0" flex="1">
      <Flex
        align="center"
        justify="between"
        gap="sm"
        px="md"
        py="sm"
        className="automation-canvas-toolbar"
      >
        <Text color="muted" size="sm" role="status">
          {wire ? t('connectHint') : t('canvasHint')}
        </Text>
        <Flex gap="xs" align="center">
          <Button
            variant="plain"
            icon="lucide:minus"
            aria-label={t('zoomOut')}
            onClick={() => setZoom(z => Math.max(0.4, z - 0.1))}
          />
          <Text size="sm">{Math.round(zoom * 100)}%</Text>
          <Button
            variant="plain"
            icon="lucide:plus"
            aria-label={t('zoomIn')}
            onClick={() => setZoom(z => Math.min(1.6, z + 0.1))}
          />
          <Button variant="plain" onClick={() => setZoom(1)}>
            reset
          </Button>
        </Flex>
      </Flex>
      <Box
        className="automation-canvas"
        overflow="auto"
        flex="1"
        minHeight="28rem"
        aria-label={t('canvas')}
      >
        <Box
          position="relative"
          width={`${width * zoom}px`}
          height={`${height * zoom}px`}
        >
          <Box
            position="absolute"
            inset="0"
            width={`${width}px`}
            height={`${height}px`}
            style={{ transform: `scale(${zoom})`, transformOrigin: '0 0' }}
          >
            <svg
              className="automation-wires"
              width={width}
              height={height}
              aria-hidden="true"
            >
              {draft.graph.edges.map(edge => {
                const from = nodes.find(n => n.id === edge.source)!,
                  to = nodes.find(n => n.id === edge.target)!
                const x = from.x + 216,
                  y = from.y + (edge.port === 'false' ? 92 : 60),
                  tx = to.x,
                  ty = to.y + 60
                return (
                  <path
                    key={edge.id}
                    d={`M${x},${y} C${x + 90},${y} ${tx - 90},${ty} ${tx},${ty}`}
                    data-port={edge.port}
                  />
                )
              })}
            </svg>
            {nodes.map(node => {
              const step = result?.steps.findLast(s => s.node_id === node.id)
              return (
                <Box
                  key={node.id}
                  className="automation-node"
                  position="absolute"
                  width="216px"
                  left={`${node.x}px`}
                  top={`${node.y}px`}
                  r="lg"
                  data-selected={selected === node.id}
                  data-status={step?.status}
                >
                  <Flex
                    as="button"
                    type="button"
                    className="automation-node-title"
                    width="100%"
                    align="center"
                    gap="sm"
                    p="md"
                    onClick={() => setSelected(node.id)}
                    onPointerDown={event => {
                      if (locked || event.button !== 0) return
                      event.currentTarget.setPointerCapture(event.pointerId)
                      drag.current = {
                        id: node.id,
                        x: node.x,
                        y: node.y,
                        px: event.clientX,
                        py: event.clientY
                      }
                      setSelected(node.id)
                    }}
                    onPointerMove={event => {
                      const d = drag.current
                      if (d?.id !== node.id) return
                      setMoving({
                        id: node.id,
                        x: Math.max(
                          0,
                          Math.min(10000, d.x + (event.clientX - d.px) / zoom)
                        ),
                        y: Math.max(
                          0,
                          Math.min(10000, d.y + (event.clientY - d.py) / zoom)
                        )
                      })
                    }}
                    onPointerUp={() => {
                      if (
                        drag.current?.id === node.id &&
                        moving?.id === node.id
                      )
                        updateNode(node.id, {
                          x: Math.round(moving.x),
                          y: Math.round(moving.y)
                        })
                      drag.current = null
                      setMoving(null)
                    }}
                    onPointerCancel={() => {
                      drag.current = null
                      setMoving(null)
                    }}
                    onLostPointerCapture={() => {
                      drag.current = null
                      setMoving(null)
                    }}
                    onKeyDown={event => {
                      if (
                        locked ||
                        ![
                          'ArrowUp',
                          'ArrowDown',
                          'ArrowLeft',
                          'ArrowRight'
                        ].includes(event.key)
                      )
                        return
                      event.preventDefault()
                      const dx =
                          event.key === 'ArrowRight'
                            ? 24
                            : event.key === 'ArrowLeft'
                              ? -24
                              : 0,
                        dy =
                          event.key === 'ArrowDown'
                            ? 24
                            : event.key === 'ArrowUp'
                              ? -24
                              : 0
                      updateNode(node.id, {
                        x: Math.max(0, Math.min(10000, node.x + dx)),
                        y: Math.max(0, Math.min(10000, node.y + dy))
                      })
                    }}
                  >
                    <Icon icon={nodeIcons[node.kind]} size="1.4em" />
                    <Stack gap="xs" minWidth="0">
                      <Text truncate weight="medium">
                        {node.name}
                      </Text>
                      <Text color="muted" size="sm">
                        {t(`nodes.${node.kind}`)}
                      </Text>
                    </Stack>
                  </Flex>
                  <Flex
                    align="center"
                    justify="between"
                    px="sm"
                    pb="sm"
                    gap="sm"
                  >
                    {node.kind !== 'trigger' ? (
                      <Button
                        variant="plain"
                        disabled={locked || !wire}
                        aria-label={`${t('connectTo')} ${node.name}`}
                        onClick={() => {
                          if (wire) {
                            connect(wire.source, node.id, wire.port)
                            setWire(null)
                          }
                        }}
                      >
                        <span className="automation-port" />
                        {t('input')}
                      </Button>
                    ) : (
                      <Text color="muted" size="sm" px="sm">
                        {t('startHere')}
                      </Text>
                    )}
                    {node.kind !== 'output' && (
                      <Stack gap="none" width="auto">
                        {(node.kind === 'condition'
                          ? (['true', 'false'] as const)
                          : (['main'] as const)
                        ).map(port => (
                          <Button
                            key={port}
                            variant="plain"
                            disabled={locked}
                            aria-pressed={
                              wire?.source === node.id && wire.port === port
                            }
                            onClick={() => setWire({ source: node.id, port })}
                          >
                            <Text size="sm">{t(`ports.${port}`)}</Text>
                            <span className="automation-port" />
                          </Button>
                        ))}
                      </Stack>
                    )}
                    {step && (
                      <Icon
                        icon={
                          step.status === 'error'
                            ? 'lucide:circle-alert'
                            : 'lucide:check'
                        }
                        color={step.status === 'error' ? 'dangerous' : 'muted'}
                      />
                    )}
                  </Flex>
                </Box>
              )
            })}
          </Box>
        </Box>
      </Box>
    </Stack>
  )
}
