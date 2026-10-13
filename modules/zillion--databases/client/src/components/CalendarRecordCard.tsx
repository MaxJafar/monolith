import { useModuleTranslation } from '@lifeforge/localization'
import { Button, Flex, Stack, Text } from '@lifeforge/ui'

import { useDatabases } from '@/DatabaseProvider'

import type { Field, RecordPage } from '../../../shared'

export const CALENDAR_DRAG_TYPE = 'application/x-zillion-calendar-record'

export function CalendarRecordCard({
  record,
  fields,
  onMove
}: {
  record: RecordPage
  fields: Field[]
  onMove: () => void
}) {
  const { openRecord, busy, propertyLabel, readOnly } = useDatabases()
  const { t } = useModuleTranslation()

  const details = fields
    .filter(
      field =>
        ['person', 'multi-select', 'select'].includes(field.kind) &&
        propertyLabel(field, record.values[field.id])
    )
    .slice(0, 3)

  return (
    <Stack
      bg={{ base: 'bg-50', dark: 'bg-800' }}
      draggable={!busy && !readOnly}
      gap="xs"
      minWidth="0"
      p="xs"
      r="md"
      onDragStart={event =>
        event.dataTransfer.setData(CALENDAR_DRAG_TYPE, record.id)
      }
    >
      <Button
        justify="start"
        namespace={false}
        variant="plain"
        width="100%"
        onClick={() => openRecord(record)}
      >
        <Text truncate size="sm">
          {record.title}
        </Text>
      </Button>
      {details.map(field => (
        <Text key={field.id} truncate color="muted" size="sm">
          {field.name}: {propertyLabel(field, record.values[field.id])}
        </Text>
      ))}
      <Flex justify="end">
        <Button
          aria-label={t('calendarView.moveRecord', { title: record.title })}
          disabled={busy || readOnly}
          icon="tabler:calendar-event"
          variant="plain"
          onClick={onMove}
        />
      </Flex>
    </Stack>
  )
}
