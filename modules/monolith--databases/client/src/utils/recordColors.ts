import type { CSSProperties } from 'react'

import {
  type Field,
  type RecordPage,
  type ViewConfig,
  propertyValue
} from '../../../shared'

const palette = [
  '#bd5c58',
  '#b1883e',
  '#60896b',
  '#518e97',
  '#587faa',
  '#8a70ac',
  '#b46d8e',
  '#a77758'
]

export function valueColor(value: string, colors?: Record<string, string>) {
  if (colors?.[value] && /^#[0-9a-f]{6}$/i.test(colors[value]))
    return colors[value]
  let hash = 0
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) >>> 0

  return palette[hash % palette.length]!
}

export function recordColor(
  record: RecordPage,
  config?: ViewConfig['color'],
  fields: Field[] = []
) {
  if (!config || config.by === 'none') return undefined
  if (config.by === 'solid') return config.palette.solid ?? '#587faa'

  const value = propertyValue(record, config.by)
  const key = Array.isArray(value) ? value[0] : value

  return key == null || key === ''
    ? undefined
    : valueColor(String(key), {
        ...fields.find(field => field.id === config.by)?.config.option_colors,
        ...config.palette
      })
}

export function colorStyle(color?: string): CSSProperties | undefined {
  return color
    ? ({
        '--record-color': color,
        backgroundColor: `color-mix(in srgb, ${color} 15%, var(--bg-surface))`,
        borderColor: `color-mix(in srgb, ${color} 32%, var(--border-subtle))`
      } as CSSProperties)
    : undefined
}
