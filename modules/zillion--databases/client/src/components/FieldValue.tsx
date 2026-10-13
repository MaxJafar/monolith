import dayjs from 'dayjs'

import { useModuleTranslation } from '@lifeforge/localization'
import { Flex, Icon, TagChip, Text } from '@lifeforge/ui'

import { useDatabases } from '@/DatabaseProvider'

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

  if (field.kind === 'select' && typeof value === 'string')
    return <TagChip as="span" label={value} variant="filled" />

  if (field.kind === 'multi-select' && Array.isArray(value))
    return (
      <Flex gap="xs" wrap="wrap">
        {value.map(option => (
          <TagChip key={option} as="span" label={option} variant="filled" />
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

  if (field.kind === 'person')
    return (
      <Flex align="center" gap="sm">
        <Icon aria-hidden="true" color="muted" icon="tabler:user-circle" />
        <Text>{propertyLabel(field, value) || '—'}</Text>
      </Flex>
    )

  return (
    <Text weight={field.kind === 'number' ? 'medium' : 'normal'}>
      {propertyLabel(field, value) || '—'}
    </Text>
  )
}
