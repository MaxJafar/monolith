import dayjs from 'dayjs'
import { useState } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import { Box, Button, Flex, FloatingPopover, Stack, Text } from '@monolith/ui'

import type { CalendarOccurrence } from '../../../../calendarShared'
import { occurrenceZone } from './timeGridModel'

export function CalendarEventPopover({
  item,
  anchor,
  disabled,
  onClose,
  onChange,
  onComplete,
  onCancel,
  onOpenPage
}: {
  item: CalendarOccurrence
  anchor: HTMLElement
  disabled: boolean
  onClose: () => void
  onChange: (start: string, end: string) => Promise<boolean>
  onComplete: () => Promise<boolean>
  onCancel: () => Promise<boolean>
  onOpenPage: () => void
}) {
  const { t } = useModuleTranslation()

  const format = item.allDay ? 'YYYY-MM-DD' : 'YYYY-MM-DDTHH:mm'
  const zone = occurrenceZone(item)
  const display = (value: string) =>
    item.allDay ? dayjs(value).tz(zone) : dayjs(value)

  const [start, setStart] = useState(display(item.start).format(format))

  const [end, setEnd] = useState(
    display(item.end)
      .subtract(item.allDay ? 1 : 0, 'millisecond')
      .format(format)
  )

  const [error, setError] = useState('')

  const recurring = !!item.schedule?.settings.recurrence

  async function save() {
    if (!start || (item.endField && !end)) {
      setError(t('scheduling.invalidRange'))

      return
    }

    const a = item.allDay ? dayjs.tz(start + 'T00:00', zone) : dayjs(start)
    const b = item.endField
      ? item.allDay
        ? dayjs.tz(
            dayjs.utc(end).add(1, 'day').format('YYYY-MM-DD') + 'T00:00',
            zone
          )
        : dayjs(end)
      : item.allDay
        ? dayjs.tz(
            dayjs.utc(start).add(1, 'day').format('YYYY-MM-DD') + 'T00:00',
            zone
          )
        : a.add(dayjs(item.end).diff(dayjs(item.start), 'minute'), 'minute')

    if (!a.isValid() || !b.isValid() || !b.isAfter(a)) {
      setError(t('scheduling.invalidRange'))

      return
    }
    if (await onChange(a.toISOString(), b.toISOString())) onClose()
  }

  return (
    <FloatingPopover
      anchor={anchor}
      label={item.record.title}
      width={380}
      onClose={onClose}
    >
      <Stack gap="md">
        <Text as="h3" size="lg" weight="semibold">
          {item.record.title}
        </Text>
        <Flex gap="sm" wrap="wrap">
          <Text color="muted" size="sm">
            {t(
              `scheduling.${item.record.item_type === 'task' ? 'task' : 'event'}`
            )}
          </Text>
          {recurring && (
            <Text color="muted" size="sm">
              ↻ {t('scheduling.thisOccurrence')}
            </Text>
          )}
        </Flex>
        <Box as="label" className="monolith-calendar-field">
          <Text size="sm">{t('scheduling.start')}</Text>
          <input
            disabled={disabled}
            type={item.allDay ? 'date' : 'datetime-local'}
            value={start}
            onChange={event => setStart(event.target.value)}
          />
        </Box>
        <Box as="label" className="monolith-calendar-field">
          <Text size="sm">{t('scheduling.end')}</Text>
          <input
            disabled={disabled || !item.endField}
            type={item.allDay ? 'date' : 'datetime-local'}
            value={end}
            onChange={event => setEnd(event.target.value)}
          />
        </Box>
        {!item.endField && (
          <Text color="muted" size="sm">
            {t('scheduling.endPropertyHelp')}
          </Text>
        )}
        {error && (
          <Text color="dangerous" role="alert">
            {error}
          </Text>
        )}
        <Flex gap="sm" wrap="wrap">
          <Button
            disabled={disabled}
            namespace={false}
            onClick={() => void save()}
          >
            {t('scheduling.saveTime')}
          </Button>
          <Button
            icon="lucide:maximize-2"
            namespace={false}
            variant="secondary"
            onClick={onOpenPage}
          >
            {t('scheduling.openPage')}
          </Button>
        </Flex>
        {item.record.item_type === 'task' && (
          <Button
            disabled={disabled}
            namespace={false}
            variant="secondary"
            onClick={async () => {
              if (await onComplete()) onClose()
            }}
          >
            {t(item.done ? 'scheduling.reopen' : 'scheduling.complete')}
          </Button>
        )}
        {recurring && (
          <Button
            dangerous
            disabled={disabled}
            namespace={false}
            variant="plain"
            onClick={async () => {
              if (await onCancel()) onClose()
            }}
          >
            {t('scheduling.skipOccurrence')}
          </Button>
        )}
      </Stack>
    </FloatingPopover>
  )
}
