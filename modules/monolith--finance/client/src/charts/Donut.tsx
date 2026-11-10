import { type CSSProperties, useId } from 'react'

import { Text } from '@monolith/ui'

export type Slice = {
  id: string
  label: string
  value: number
  color: string
}

const R = 78
const C = 2 * Math.PI * R
const GAP = 2.5

/**
 * Parts of one whole. Each arc sweeps in on mount, separated by a surface
 * gap; hovering or focusing a legend row (via `activeId`) lifts its arc.
 */
export function Donut({
  slices,
  label,
  center,
  caption,
  activeId,
  onActivate
}: {
  slices: Slice[]
  label: string
  center: string
  caption: string
  activeId?: string | null
  onActivate?: (id: string | null) => void
}) {
  const id = useId()

  const total = slices.reduce((sum, slice) => sum + Math.max(0, slice.value), 0)

  let offset = 0

  return (
    <div className="finance-donut">
      <svg aria-labelledby={id} role="img" viewBox="0 0 200 200">
        <title id={id}>{label}</title>
        <circle className="finance-donut-track" cx="100" cy="100" r={R} />
        {total > 0 &&
          slices.map((slice, index) => {
            const share = Math.max(0, slice.value) / total
            const length = Math.max(
              0,
              share * C - (slices.length > 1 ? GAP : 0)
            )
            const arc = (
              <circle
                key={slice.id}
                className="finance-donut-arc"
                cx="100"
                cy="100"
                data-active={activeId === slice.id || undefined}
                data-dim={(activeId && activeId !== slice.id) || undefined}
                r={R}
                style={
                  {
                    '--arc': `${length}px`,
                    '--circ': `${C}px`,
                    '--i': index,
                    stroke: slice.color,
                    strokeDasharray: `${length} ${C}`,
                    strokeDashoffset: -offset
                  } as CSSProperties
                }
                onPointerEnter={() => onActivate?.(slice.id)}
                onPointerLeave={() => onActivate?.(null)}
              />
            )

            offset += share * C

            return arc
          })}
      </svg>
      <div aria-hidden="true" className="finance-donut-center">
        <Text className="finance-donut-value" weight="semibold">
          {center}
        </Text>
        <Text color="muted" size="xs">
          {caption}
        </Text>
      </div>
    </div>
  )
}
