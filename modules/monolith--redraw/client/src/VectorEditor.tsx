import { useModuleTranslation } from '@monolith/localization'
import { Button, Flex, Stack, Text } from '@monolith/ui'

import {
  fitVector,
  moveNode,
  splitSegment,
  toVector,
  vectorWorld
} from '../../vector'
import { useEditor } from './EditorProvider'

export function VectorInspector() {
  const e = useEditor(),
    { t } = useModuleTranslation()
  const element = e.page.elements.find(
    el => e.selected.length === 1 && el.id === e.selected[0]
  )

  if (
    !element ||
    !['path', 'rectangle', 'ellipse', 'diamond'].includes(element.kind)
  )
    return null

  const editing = e.vectorEditing === element.id
  const contour = element.vector?.find(c =>
    c.nodes.some(n => n.id === e.vectorNode)
  )
  const selected = contour?.nodes.find(n => n.id === e.vectorNode)
  const disabled = e.readOnly || element.locked

  return (
    <Stack aria-label={t('vector.title')} gap="sm">
      <Text size="sm" weight="semibold">
        {t('vector.title')}
      </Text>
      <Button
        disabled={disabled}
        variant="secondary"
        onClick={() => {
          if (editing) {
            e.changeElements([element.id], fitVector(element))
            e.setVectorEditing(null)

            return
          }

          try {
            e.changeElements([element.id], toVector(element))
            e.setVectorEditing(element.id)
            e.setVectorNode(null)
            e.setTool('select')
          } catch {
            e.setError('invalidPath')
          }
        }}
      >
        {editing ? 'finishVector' : 'editVector'}
      </Button>
      {editing && (
        <>
          <Text color="muted" size="sm">
            {t('vector.hint')}
          </Text>
          {selected && contour && (
            <>
              <Flex gap="xs" wrap="wrap">
                {(['corner', 'smooth', 'symmetric'] as const).map(mode => (
                  <Button
                    key={mode}
                    disabled={disabled}
                    namespace={false}
                    variant={selected.mode === mode ? 'secondary' : 'plain'}
                    onClick={() => {
                      const vector = structuredClone(element.vector!)
                      const c = vector.find(c => c.id === contour.id)!,
                        i = c.nodes.findIndex(n => n.id === selected.id),
                        n = c.nodes[i]!
                      n.mode = mode

                      if (mode === 'corner') {
                        n.in = null
                        n.out = null
                      } else {
                        const before =
                            c.nodes[(i + c.nodes.length - 1) % c.nodes.length]!,
                          after = c.nodes[(i + 1) % c.nodes.length]!
                        const angle = Math.atan2(
                            after.y - before.y,
                            after.x - before.x
                          ),
                          length = Math.max(
                            8,
                            Math.hypot(after.x - before.x, after.y - before.y) /
                              6
                          )
                        n.out ??= {
                          x: n.x + Math.cos(angle) * length,
                          y: n.y + Math.sin(angle) * length
                        }
                        n.in ??= { x: n.x * 2 - n.out.x, y: n.y * 2 - n.out.y }
                        c.nodes[i] = moveNode(n, n.out, 'out')
                      }
                      e.changeElements([element.id], { vector })
                    }}
                  >
                    {t(`vector.${mode}`)}
                  </Button>
                ))}
              </Flex>
              <Button
                disabled={
                  disabled ||
                  (!contour.closed &&
                    selected.id === contour.nodes[contour.nodes.length - 1]?.id)
                }
                variant="plain"
                onClick={() =>
                  e.changeElements([element.id], {
                    vector: splitSegment(
                      element.vector!,
                      contour.id,
                      selected.id
                    )
                  })
                }
              >
                splitSegment
              </Button>
              <Button
                disabled={disabled || contour.nodes.length < 3}
                variant="plain"
                onClick={() =>
                  e.changeElements([element.id], {
                    vector: element.vector!.map(c =>
                      c.id === contour.id ? { ...c, closed: !c.closed } : c
                    )
                  })
                }
              >
                {contour.closed ? 'openPath' : 'closePath'}
              </Button>
              <Button
                dangerous
                disabled={disabled || contour.nodes.length < 2}
                variant="plain"
                onClick={() => {
                  e.changeElements([element.id], {
                    vector: element.vector!.map(c =>
                      c.id === contour.id
                        ? {
                            ...c,
                            nodes: c.nodes.filter(n => n.id !== selected.id)
                          }
                        : c
                    )
                  })
                  e.setVectorNode(null)
                }}
              >
                deleteNode
              </Button>
            </>
          )}
        </>
      )}
    </Stack>
  )
}

export function VectorHandles() {
  const e = useEditor()

  const element = e.renderedPage.elements.find(
    el => el.id === e.vectorEditing && e.selected.includes(el.id)
  )

  if (!element?.vector || e.readOnly || element.locked) return null

  const size = 5 / e.view.zoom

  return (
    <g data-vector-editor={element.id}>
      {element.vector.flatMap(c =>
        c.nodes.map(n => {
          const p = vectorWorld(element, n)

          return (
            <g key={n.id}>
              {n.id === e.vectorNode &&
                (['in', 'out'] as const).map(handle => {
                  if (!n[handle]) return null

                  const h = vectorWorld(element, n[handle])

                  return (
                    <g key={handle}>
                      <line
                        stroke="#7c3aed"
                        strokeWidth={1 / e.view.zoom}
                        x1={p.x}
                        x2={h.x}
                        y1={p.y}
                        y2={h.y}
                      />
                      <circle
                        cx={h.x}
                        cy={h.y}
                        data-vector-handle={handle}
                        data-vector-node={n.id}
                        fill="white"
                        r={size}
                        stroke="#7c3aed"
                        strokeWidth={1.5 / e.view.zoom}
                      />
                    </g>
                  )
                })}
              <rect
                data-vector-handle="anchor"
                data-vector-node={n.id}
                fill={e.vectorNode === n.id ? '#7c3aed' : 'white'}
                height={size * 2}
                stroke="#7c3aed"
                strokeWidth={1.5 / e.view.zoom}
                width={size * 2}
                x={p.x - size}
                y={p.y - size}
              />
            </g>
          )
        })
      )}
    </g>
  )
}
