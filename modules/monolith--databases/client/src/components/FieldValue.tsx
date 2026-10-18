import { safeCoverUrl } from '@monolith/blocks'
import { useModuleTranslation } from '@monolith/localization'
import { Button, Flex, Icon, Text } from '@monolith/ui'
import dayjs from 'dayjs'
import type { CSSProperties } from 'react'

import { useDatabases } from '@/DatabaseProvider'
import { valueColor } from '@/utils/recordColors'

import { type CellValue, type Field, isISODate } from '../../../shared'

export function FieldValue({
  field,
  value
}: {
  field: Field
  value: CellValue | undefined
}) {
  const { propertyLabel } = useDatabases()
  const { t } = useModuleTranslation()

  if (value == null || value === '' || (Array.isArray(value) && !value.length))
    return <Text color="muted">—</Text>

  if (field.kind === 'progress' && typeof value === 'number') {
    const percent = Math.min(100, Math.max(0, value))
    return (
      <span
        className="database-progress"
        style={
          {
            '--progress-color':
              field.config.progress?.color || 'var(--selection-color)'
          } as CSSProperties
        }
        role="progressbar"
        aria-label={field.name}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        aria-valuetext={`${Math.round(percent)}%`}
      >
        <span className="database-progress-track">
          <span style={{ width: `${percent}%` }} />
        </span>
        {field.config.progress?.show_number !== false && (
          <span className="database-progress-number">
            {Math.round(percent)}%
          </span>
        )}
      </span>
    )
  }

  if (
    (field.kind === 'select' || field.kind === 'status') &&
    typeof value === 'string'
  )
    return (
      <span
        className={`database-tag${field.kind === 'status' ? ' database-status-tag' : ''}`}
        style={{
          backgroundColor: `color-mix(in srgb, ${valueColor(value, field.config.option_colors)} 38%, var(--bg-surface))`
        }}
      >
        {field.kind === 'status' && (
          <span
            className="database-tag-dot"
            style={{
              backgroundColor: valueColor(value, field.config.option_colors)
            }}
          />
        )}
        {value}
      </span>
    )

  if (field.kind === 'multi-select' && Array.isArray(value))
    return (
      <Flex gap="xs" wrap="wrap">
        {value.map(option => (
          <span
            key={option}
            className="database-tag"
            style={{
              backgroundColor: `color-mix(in srgb, ${valueColor(option, field.config.option_colors)} 38%, var(--bg-surface))`
            }}
          >
            {option}
          </span>
        ))}
      </Flex>
    )

  if (field.kind === 'checkbox')
    return (
      <Flex align="center" gap="sm">
        <Icon
          aria-hidden="true"
          color={value === true ? 'primary' : 'muted'}
          icon={value === true ? 'tabler:square-check' : 'tabler:square'}
        />
        <Text color={value === true ? undefined : 'muted'}>
          {t(value === true ? 'checked' : 'unchecked')}
        </Text>
      </Flex>
    )

  if (field.kind === 'date' && isISODate(value))
    return (
      <Flex align="center" gap="sm">
        <Icon aria-hidden="true" color="muted" icon="tabler:calendar" />
        <Text as="time" dateTime={value} whiteSpace="nowrap">
          {dayjs(value).format('D MMM YYYY')}
        </Text>
      </Flex>
    )

  if (['person', 'created-by', 'last-edited-by'].includes(field.kind))
    return (
      <Flex align="center" gap="sm">
        <Icon aria-hidden="true" color="muted" icon="tabler:user-circle" />
        <Text>{propertyLabel(field, value) || '—'}</Text>
      </Flex>
    )

  if (
    ['created-time', 'last-edited-time'].includes(field.kind) &&
    typeof value === 'string'
  )
    return (
      <Text as="time" dateTime={value}>
        {dayjs(value).format('D MMM YYYY HH:mm')}
      </Text>
    )
  if (field.kind === 'files' && Array.isArray(value))
    return (
      <Flex gap="sm" wrap="wrap">
        {value.filter(safeCoverUrl).map((url, i) => (
          <Text
            as="a"
            key={url}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('fileNumber', { number: i + 1 })}
          </Text>
        ))}
      </Flex>
    )
  if (
    (field.kind === 'url' || field.kind === 'button') &&
    typeof value === 'string' &&
    safeCoverUrl(value)
  )
    return (
      <Button
        as="a"
        namespace={false}
        variant="plain"
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        icon="lucide:external-link"
      >
        {field.kind === 'button' ? field.name : value}
      </Button>
    )
  return (
    <Text weight={field.kind === 'number' ? 'medium' : 'normal'}>
      {propertyLabel(field, value) || '—'}
    </Text>
  )
}
