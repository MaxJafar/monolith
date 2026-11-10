import { type KeyboardEvent, type PointerEvent, useId, useState } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import { Flex, Text } from '@monolith/ui'

import { DataTable } from './CashflowChart'
import { labelIndexes, linear } from './scale'

export type TrendPoint = {
  key: string
  label: string
  detail: string
  value: number
}

const W = 640
const H = 200
const M = { top: 16, right: 16, bottom: 26, left: 58 }

/** One series over time: a 2px line over a faint wash, with a crosshair. */
export function TrendArea({
  points,
  label,
  format,
  formatAxis,
  series = 'net',
  note
}: {
  points: TrendPoint[]
  label: string
  format: (value: number) => string
  formatAxis: (value: number) => string
  series?: 'net' | 'income' | 'expense' | 'accent'
  note?: string
}) {
  const { t } = useModuleTranslation()
  const id = useId()
  const gradient = useId()
  const [active, setActive] = useState<number | null>(null)

  const values = points.map(point => point.value)
  const low = Math.min(...values, 0)
  const high = Math.max(...values, 0)
  const pad = (high - low || Math.abs(high) || 1) * 0.08
  const domain: [number, number] = [low - (low < 0 ? pad : 0), high + pad]
  const y = linear(domain, [H - M.bottom, M.top])
  const x = (index: number) =>
    points.length > 1
      ? M.left + (index / (points.length - 1)) * (W - M.left - M.right)
      : (M.left + W - M.right) / 2
  const line = points
    .map((point, index) => `${index ? 'L' : 'M'}${x(index)},${y(point.value)}`)
    .join('')
  const area = points.length
    ? `${line}L${x(points.length - 1)},${y(Math.max(domain[0], 0))}L${x(0)},${y(Math.max(domain[0], 0))}Z`
    : ''
  const ticks = [domain[0], (domain[0] + domain[1]) / 2, domain[1]]
  const shown = labelIndexes(points.length, 7)
  const focus = active ?? points.length - 1
  const selected = points[focus]

  const inspect = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const ratio = ((event.clientX - box.left) / box.width) * W

    let best = 0

    points.forEach((_, index) => {
      if (Math.abs(x(index) - ratio) < Math.abs(x(best) - ratio)) best = index
    })
    setActive(best)
  }
  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    setActive(current =>
      Math.max(
        0,
        Math.min(
          points.length - 1,
          (current ?? points.length - 1) + (event.key === 'ArrowLeft' ? -1 : 1)
        )
      )
    )
  }

  return (
    <figure aria-labelledby={id} className="finance-chart" data-series={series}>
      <Flex align="baseline" gap="md" justify="between" wrap="wrap">
        <Text as="figcaption" id={id} weight="semibold">
          {label}
        </Text>
        {selected && (
          <Text color="muted" size="sm">
            {selected.detail} · {format(selected.value)}
          </Text>
        )}
      </Flex>
      <div
        aria-label={t('charts.inspect', { label })}
        className="finance-plot"
        role="group"
        tabIndex={points.length ? 0 : undefined}
        onBlur={() => setActive(null)}
        onKeyDown={onKey}
        onPointerLeave={() => setActive(null)}
        onPointerMove={points.length > 1 ? inspect : undefined}
      >
        <svg
          key={points.map(point => point.value).join(',')}
          aria-hidden="true"
          viewBox={`0 0 ${W} ${H}`}
        >
          <defs>
            <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
              <stop
                className="finance-wash-stop"
                offset="0%"
                stopOpacity="0.16"
              />
              <stop
                className="finance-wash-stop"
                offset="100%"
                stopOpacity="0.01"
              />
            </linearGradient>
          </defs>
          {ticks.map(tick => (
            <g key={tick}>
              <path
                className="finance-grid"
                d={`M${M.left} ${y(tick)}H${W - M.right}`}
              />
              <text
                className="finance-axis"
                textAnchor="end"
                x={M.left - 8}
                y={y(tick) + 4}
              >
                {formatAxis(tick)}
              </text>
            </g>
          ))}
          {domain[0] < 0 && (
            <path
              className="finance-baseline"
              d={`M${M.left} ${y(0)}H${W - M.right}`}
            />
          )}
          {points.length > 1 && (
            <>
              <path
                className="finance-wash"
                d={area}
                fill={`url(#${gradient})`}
              />
              <path className="finance-line" d={line} pathLength={1} />
            </>
          )}
          {points.map((point, index) =>
            shown.has(index) ? (
              <text
                key={point.key}
                className="finance-axis"
                textAnchor={
                  index === 0
                    ? 'start'
                    : index === points.length - 1
                      ? 'end'
                      : 'middle'
                }
                x={x(index)}
                y={H - 7}
              >
                {point.label}
              </text>
            ) : null
          )}
          {selected && (
            <>
              {active !== null && (
                <path
                  className="finance-crosshair"
                  d={`M${x(focus)} ${M.top}V${H - M.bottom}`}
                />
              )}
              <circle
                className="finance-dot"
                cx={x(focus)}
                cy={y(selected.value)}
                r="5"
              />
            </>
          )}
        </svg>
      </div>
      {note && (
        <Text color="muted" size="xs">
          {note}
        </Text>
      )}
      <DataTable
        caption={label}
        columns={[t('charts.period'), label]}
        rows={points.map(point => [point.detail, format(point.value)])}
      />
    </figure>
  )
}

/** A 12-point trend mark for a stat tile; no axes, no interaction. */
export function Spark({
  values,
  series = 'net'
}: {
  values: number[]
  series?: string
}) {
  if (values.length < 2) return null

  const low = Math.min(...values)
  const high = Math.max(...values)
  const y = linear([low, high === low ? low + 1 : high], [26, 2])
  const path = values
    .map(
      (value, index) =>
        `${index ? 'L' : 'M'}${(index / (values.length - 1)) * 100},${y(value)}`
    )
    .join('')

  return (
    <svg
      aria-hidden="true"
      className="finance-spark"
      data-series={series}
      preserveAspectRatio="none"
      viewBox="0 0 100 28"
    >
      <path d={path} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** Progress toward a limit: blue within budget, amber near it, red over. */
export function Meter({ ratio, label }: { ratio: number; label: string }) {
  const clamped = Math.max(0, Math.min(1, ratio))
  const tone = ratio > 1 ? 'over' : ratio >= 0.85 ? 'near' : 'ok'

  return (
    <div
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(clamped * 100)}
      className="finance-meter"
      data-tone={tone}
      role="meter"
    >
      <span style={{ width: `${clamped * 100}%` }} />
    </div>
  )
}
