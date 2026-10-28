export function formatPercent(value: number | null, language?: string) {
  if (value === null) return '—'

  return `${value.toLocaleString(language, {
    maximumFractionDigits: value > 0 && value < 10 ? 1 : 0
  })}%`
}

/** "3d 4h", "5h 12m" or "40m", using the reader's own unit symbols. */
export function formatDuration(seconds: number | null, language?: string) {
  if (seconds === null) return '—'

  const unit = (value: number, name: 'day' | 'hour' | 'minute') =>
    new Intl.NumberFormat(language, {
      style: 'unit',
      unit: name,
      unitDisplay: 'narrow'
    }).format(value)
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days) return `${unit(days, 'day')} ${unit(hours, 'hour')}`
  if (hours) return `${unit(hours, 'hour')} ${unit(minutes, 'minute')}`

  return unit(minutes, 'minute')
}

export function formatLatency(value: number | null, language?: string) {
  return value === null
    ? '—'
    : new Intl.NumberFormat(language, {
        style: 'unit',
        unit: 'millisecond',
        unitDisplay: 'narrow',
        maximumFractionDigits: 0
      }).format(value)
}
