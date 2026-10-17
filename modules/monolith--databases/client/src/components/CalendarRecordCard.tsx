import { useModuleTranslation } from '@monolith/localization'
import {
  Button,
  Flex,
  Stack,
  Text,
  elasticDragPreview,
  setInternalDragData
} from '@monolith/ui'

import { useDatabases } from '@/DatabaseProvider'
import { useViewColors } from '@/utils/viewColors'

import type { Field, RecordPage } from '../../../shared'
import { DatabaseCardProperties } from './DatabaseCardProperties'

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
  const { openRecord, busy, readOnly } = useDatabases()
  const { t } = useModuleTranslation()
  const colors = useViewColors()

  return (
    <Stack
      bg={{ base: 'bg-50', dark: 'bg-800' }}
      draggable={!busy && !readOnly}
      gap="xs"
      minWidth="0"
      p="xs"
      r="md"
      style={colors.style(record)}
      onDragStart={event => {
        setInternalDragData(event.nativeEvent, CALENDAR_DRAG_TYPE, record.id)
        elasticDragPreview(event.nativeEvent, record.title, event.currentTarget)
      }}
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
      <DatabaseCardProperties fields={fields} record={record} />
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
