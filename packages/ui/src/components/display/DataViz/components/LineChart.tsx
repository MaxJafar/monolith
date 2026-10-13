import { useId, useState } from 'react'

import { Flex, Stack, Text } from '@/components/primitives'

import {
  axisLabel,
  chartFrame,
  chartSvg,
  numeric,
  pointTarget
} from '../DataViz.css'
import { accent, formatNumber, muted, track } from '../constants'
import { axisTickIndexes, lineLayout } from '../model'
import type { ChartProps } from '../types'
import { DataTable } from './DataTable'

/** Actual data coordinates, gaps, reference lines and keyboard point inspection. */
export function LineChart({
  points,
  label,
  formatValue = formatNumber,
  domain,
  invertY = false,
  reference,
  emptyLabel
}: ChartProps & {
  domain?: [number, number]
  invertY?: boolean
  reference?: { value: number; label: string }
}) {
  const id = useId()
  const [active, setActive] = useState<number | null>(null)

  const layout = lineLayout(points, domain, invertY, reference?.value)
  const selected =
    layout.points.find(point => point.index === active) ?? layout.points.at(-1)
  const referenceY =
    reference &&
    Number.isFinite(reference.value) &&
    reference.value >= layout.min &&
    reference.value <= layout.max
      ? layout.y(reference.value)
      : null
  const tickIndexes = axisTickIndexes(layout.positions)

  return (
    <Stack
      as="figure"
      className={chartFrame}
      gap="sm"
      m="none"
      position="relative"
    >
      {layout.points.length ? (
        <svg
          aria-labelledby={id}
          className={chartSvg}
          role="img"
          viewBox="0 0 640 224"
        >
          <title id={id}>{label}</title>
          <defs>
            <linearGradient id={`${id}-fill`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.2" />
              <stop offset="100%" stopColor={accent} stopOpacity="0.01" />
            </linearGradient>
          </defs>
          {[0, 0.5, 1].map(ratio => {
            const value = layout.min + (layout.max - layout.min) * ratio
            const y = layout.y(value)

            return (
              <g key={ratio}>
                <path
                  d={`M64 ${y}H624`}
                  fill="none"
                  stroke={track}
                  strokeDasharray={ratio ? '3 5' : undefined}
                />
                <text
                  className={axisLabel}
                  dominantBaseline="middle"
                  fill={muted}
                  textAnchor="end"
                  x="54"
                  y={y}
                >
                  {formatValue(value)}
                </text>
              </g>
            )
          })}
          {layout.segments.map((segment, index) => {
            const coordinates = segment
              .map(point => `${point.x},${point.y}`)
              .join(' ')

            return (
              <g key={index}>
                {segment.length > 1 && (
                  <>
                    <polygon
                      fill={`url(#${id}-fill)`}
                      points={`${segment[0]!.x},176 ${coordinates} ${segment.at(-1)!.x},176`}
                    />
                    <polyline
                      fill="none"
                      points={coordinates}
                      stroke={accent}
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                    />
                  </>
                )}
              </g>
            )
          })}
          {referenceY !== null && reference && (
            <g>
              <path
                d={`M64 ${referenceY}H624`}
                fill="none"
                stroke={muted}
                strokeDasharray="6 4"
              />
              <title>
                {reference.label}: {formatValue(reference.value)}
              </title>
            </g>
          )}
          {layout.points.map(point => (
            <g
              key={point.index}
              aria-label={`${point.label}: ${formatValue(point.value)}${point.detail ? ` · ${point.detail}` : ''}`}
              className={pointTarget}
              role="img"
              tabIndex={0}
              onBlur={() => setActive(null)}
              onFocus={() => setActive(point.index)}
              onMouseEnter={() => setActive(point.index)}
              onMouseLeave={() => setActive(null)}
            >
              <circle cx={point.x} cy={point.y} fill="transparent" r="10" />
              <circle
                cx={point.x}
                cy={point.y}
                fill={point.color ?? accent}
                r={selected?.index === point.index ? 4.5 : 3}
                stroke="var(--color-bg-900)"
                strokeWidth="1.5"
              />
              <title>
                {point.label}: {formatValue(point.value)}
                {point.detail && ` · ${point.detail}`}
              </title>
            </g>
          ))}
          {tickIndexes.map((index, tick) => {
            const point = points[index]

            return (
              point && (
                <text
                  key={index}
                  className={axisLabel}
                  fill={muted}
                  textAnchor={
                    tickIndexes.length === 1
                      ? 'middle'
                      : tick === 0
                        ? 'start'
                        : tick === tickIndexes.length - 1
                          ? 'end'
                          : 'middle'
                  }
                  x={layout.x(layout.positions[index]!)}
                  y="205"
                >
                  {point.label}
                </text>
              )
            )
          })}
        </svg>
      ) : (
        <Text color="muted">{emptyLabel ?? '—'}</Text>
      )}
      {selected && (
        <Flex
          align="baseline"
          as="figcaption"
          gap="sm"
          justify="between"
          wrap="wrap"
        >
          <Text color="muted" size="sm">
            {selected.label}
            {selected.detail && ` · ${selected.detail}`}
          </Text>
          <Text className={numeric} size="sm" weight="semibold">
            {formatValue(selected.value)}
          </Text>
        </Flex>
      )}
      {reference && (
        <Text color="muted" size="xs">
          {reference.label}: {formatValue(reference.value)}
        </Text>
      )}
      <DataTable formatValue={formatValue} label={label} points={points} />
    </Stack>
  )
}
