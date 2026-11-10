import { type CSSProperties, type KeyboardEvent, useId, useState } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import { Flex, Text } from '@monolith/ui'

import { barPath, labelIndexes, linear, niceTicks } from './scale'

export type FlowPoint = {
  key: string
  /** Short axis label, e.g. "12" or "Mar". */
  label: string
  /** Full label for the tooltip and table, e.g. "12 March 2026". */
  detail: string
  income: number
  expense: number
  net: number
}

const W = 640
const H = 264
const M = { top: 14, right: 12, bottom: 28, left: 58 }

/**
 * Income rises above the baseline and spending falls below it, so polarity
 * reads from position as well as color; the net line shares the same axis.
 */
export function CashflowChart({
  points,
  label,
  format,
  formatAxis
}: {
  points: FlowPoint[]
  label: string
  format: (value: number) => string
  formatAxis: (value: number) => string
}) {
  const { t } = useModuleTranslation()
  const id = useId()
  const [active, setActive] = useState<number | null>(null)

  const high = Math.max(
    0,
    ...points.map(point => Math.max(point.income, point.net))
  )
  const low = Math.min(
    0,
    ...points.map(point => Math.min(-point.expense, point.net))
  )
  const ticks = niceTicks(low, high)
  const domain: [number, number] = [ticks[0]!, ticks[ticks.length - 1]!]
  const y = linear(domain, [H - M.bottom, M.top])
  const band = (W - M.left - M.right) / Math.max(1, points.length)
  const barWidth = Math.max(3, Math.min(24, band * 0.62))
  const center = (index: number) => M.left + band * index + band / 2
  const zero = y(0)
  const shown = labelIndexes(points.length, points.length > 14 ? 8 : 12)
  const selected = active === null ? null : points[active]
  const signature = points
    .map(point => `${point.key}:${point.income}:${point.expense}`)
    .join('|')
  const netPath = points
    .map(
      (point, index) => `${index ? 'L' : 'M'}${center(index)},${y(point.net)}`
    )
    .join('')
  const hasData = points.some(point => point.income || point.expense)

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    setActive(current => {
      if (event.key === 'Home') return 0
      if (event.key === 'End') return points.length - 1

      const next =
        (current ?? points.length - 1) + (event.key === 'ArrowLeft' ? -1 : 1)

      return Math.max(0, Math.min(points.length - 1, next))
    })
  }

  return (
    <figure aria-labelledby={id} className="finance-chart">
      <Flex align="center" gap="md" justify="between" wrap="wrap">
        <Text as="figcaption" id={id} weight="semibold">
          {label}
        </Text>
        <Flex className="finance-legend" gap="md" wrap="wrap">
          <span data-series="income">{t('series.income')}</span>
          <span data-series="expense">{t('series.expense')}</span>
          <span data-series="net">{t('series.net')}</span>
        </Flex>
      </Flex>
      <div
        aria-label={t('charts.inspect', { label })}
        className="finance-plot"
        role="group"
        tabIndex={points.length ? 0 : undefined}
        onBlur={() => setActive(null)}
        onKeyDown={onKey}
        onPointerLeave={() => setActive(null)}
      >
        <svg key={signature} aria-hidden="true" viewBox={`0 0 ${W} ${H}`}>
          {ticks.map(tick => (
            <g key={tick}>
              <path
                className={tick === 0 ? 'finance-baseline' : 'finance-grid'}
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
          {points.map((point, index) => {
            const x = center(index) - barWidth / 2

            return (
              <g
                key={point.key}
                className="finance-column"
                data-active={active === index || undefined}
                style={{ '--i': index } as CSSProperties}
              >
                <path
                  className="finance-bar"
                  d={barPath(x, barWidth, zero, y(point.income))}
                  data-series="income"
                />
                <path
                  className="finance-bar"
                  d={barPath(x, barWidth, zero, y(-point.expense))}
                  data-series="expense"
                />
                {shown.has(index) && (
                  <text
                    className="finance-axis"
                    textAnchor="middle"
                    x={center(index)}
                    y={H - 8}
                  >
                    {point.label}
                  </text>
                )}
                <rect
                  className="finance-hit"
                  height={H - M.top - M.bottom}
                  width={band}
                  x={M.left + band * index}
                  y={M.top}
                  onPointerEnter={() => setActive(index)}
                />
              </g>
            )
          })}
          {hasData && points.length > 1 && (
            <path
              className="finance-line"
              d={netPath}
              data-series="net"
              pathLength={1}
            />
          )}
          {hasData &&
            points.map((point, index) =>
              active === index || points.length <= 12 ? (
                <circle
                  key={point.key}
                  className="finance-dot"
                  cx={center(index)}
                  cy={y(point.net)}
                  data-active={active === index || undefined}
                  data-series="net"
                  r={active === index ? 5 : 4}
                />
              ) : null
            )}
        </svg>
        {selected && (
          <div
            className="finance-tooltip"
            role="status"
            style={{
              left: `${(center(active!) / W) * 100}%`,
              top: `${(Math.min(y(selected.income), zero) / H) * 100}%`
            }}
          >
            <Text size="sm" weight="semibold">
              {selected.detail}
            </Text>
            <dl>
              <dt data-series="income">{t('series.income')}</dt>
              <dd>{format(selected.income)}</dd>
              <dt data-series="expense">{t('series.expense')}</dt>
              <dd>{format(-selected.expense)}</dd>
              <dt data-series="net">{t('series.net')}</dt>
              <dd>{format(selected.net)}</dd>
            </dl>
          </div>
        )}
        {!hasData && (
          <Text className="finance-chart-empty" color="muted">
            {t('charts.empty')}
          </Text>
        )}
      </div>
      <DataTable
        caption={label}
        columns={[
          t('charts.period'),
          t('series.income'),
          t('series.expense'),
          t('series.net')
        ]}
        rows={points.map(point => [
          point.detail,
          format(point.income),
          format(-point.expense),
          format(point.net)
        ])}
      />
    </figure>
  )
}

/** Every plotted value, available without hover or color. */
export function DataTable({
  caption,
  columns,
  rows
}: {
  caption: string
  columns: string[]
  rows: string[][]
}) {
  const { t } = useModuleTranslation()

  if (!rows.length) return null

  return (
    <details className="finance-table-toggle">
      <summary>{t('charts.showTable')}</summary>
      <div className="finance-table-scroll">
        <table className="finance-table">
          <caption>{caption}</caption>
          <thead>
            <tr>
              {columns.map(column => (
                <th key={column} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                {row.map((cell, column) =>
                  column === 0 ? (
                    <th key={column} scope="row">
                      {cell}
                    </th>
                  ) : (
                    <td key={column}>{cell}</td>
                  )
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
