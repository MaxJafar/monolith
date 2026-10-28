import { type KeyboardEvent, type PointerEvent, useState } from 'react'

/** A single live series: 2px line over a faint wash, with a hover readout. */
export function Sparkline({
  values,
  labels,
  label,
  format,
  max = 100
}: {
  values: (number | null)[]
  labels: string[]
  label: string
  format: (value: number) => string
  max?: number
}) {
  const [active, setActive] = useState<number | null>(null)

  const count = values.length
  const x = (index: number) => (count > 1 ? (index / (count - 1)) * 100 : 50)
  const y = (value: number) =>
    100 - Math.min(100, Math.max(0, (value / Math.max(max, 1)) * 100))
  const segments: { index: number; value: number }[][] = []

  values.forEach((value, index) => {
    if (value === null) segments.push([])
    else {
      if (!segments.length) segments.push([])
      segments[segments.length - 1]!.push({ index, value })
    }
  })

  const latest = [...values].reverse().find(value => value !== null) ?? null
  const shown = active !== null ? values[active] : null

  const inspect = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const ratio = (event.clientX - box.left) / Math.max(1, box.width)

    setActive(Math.max(0, Math.min(count - 1, Math.round(ratio * (count - 1)))))
  }
  const step = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    setActive(current =>
      Math.max(
        0,
        Math.min(
          count - 1,
          (current ?? count - 1) + (event.key === 'ArrowLeft' ? -1 : 1)
        )
      )
    )
  }

  return (
    <div
      aria-label={latest === null ? label : `${label}: ${format(latest)}`}
      className="tech-lab-spark"
      role="img"
      tabIndex={count > 1 ? 0 : undefined}
      onBlur={() => setActive(null)}
      onKeyDown={step}
      onPointerLeave={() => setActive(null)}
      onPointerMove={count > 1 ? inspect : undefined}
    >
      <svg aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 100 100">
        <path className="tech-lab-spark-grid" d="M0 50H100" />
        {segments
          .filter(segment => segment.length > 1)
          .map(segment => {
            const line = segment
              .map(
                (point, index) =>
                  `${index ? 'L' : 'M'}${x(point.index)} ${y(point.value)}`
              )
              .join('')

            return (
              <g key={segment[0]!.index}>
                <path
                  className="tech-lab-spark-area"
                  d={`${line}L${x(segment[segment.length - 1]!.index)} 100L${x(segment[0]!.index)} 100Z`}
                />
                <path className="tech-lab-spark-line" d={line} />
              </g>
            )
          })}
      </svg>
      {active !== null && shown !== null && shown !== undefined && (
        <>
          <span
            className="tech-lab-spark-cursor"
            style={{ left: `${x(active)}%` }}
          />
          <span
            className="tech-lab-spark-dot"
            style={{ left: `${x(active)}%`, top: `${y(shown)}%` }}
          />
          <span
            className="tech-lab-spark-tip"
            data-edge={
              x(active) < 20 ? 'start' : x(active) > 80 ? 'end' : undefined
            }
            style={{ left: `${x(active)}%` }}
          >
            <strong>{format(shown)}</strong> {labels[active]}
          </span>
        </>
      )}
    </div>
  )
}
