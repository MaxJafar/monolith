import type { ReactNode } from 'react'

export function meterLevel(value: number | null) {
  if (value === null) return 'empty'

  return value >= 90 ? 'critical' : value >= 75 ? 'warning' : 'normal'
}

/** Usage against a fixed 100% scale; the fill turns amber, then red, as it
 * fills. A plain meter (availability, where full is good) keeps one colour. */
export function Meter({
  label,
  value,
  detail,
  plain = false,
  compact = false
}: {
  label: ReactNode
  value: number | null
  detail?: ReactNode
  plain?: boolean
  compact?: boolean
}) {
  const shown =
    value === null
      ? '—'
      : `${value.toLocaleString(undefined, { maximumFractionDigits: value < 10 ? 1 : 0 })}%`

  return (
    <div
      className="tech-lab-meter"
      data-level={plain ? 'normal' : meterLevel(value)}
    >
      {!compact && (
        <div className="tech-lab-meter-label">
          <span>{label}</span>
          <span className="tech-lab-meter-value">{shown}</span>
        </div>
      )}
      <div
        aria-label={typeof label === 'string' ? label : undefined}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={value ?? undefined}
        aria-valuetext={shown}
        className="tech-lab-meter-track"
        role="meter"
      >
        <span style={{ width: `${Math.min(100, Math.max(0, value ?? 0))}%` }} />
      </div>
      {detail && <span className="tech-lab-meter-detail">{detail}</span>}
    </div>
  )
}
