import dayjs from 'dayjs'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useModuleTranslation } from '@monolith/localization'
import { Box, Button, Flex, FloatingPopover, Stack, Text } from '@monolith/ui'

import { DraftConfirmation, DraftNotice, useDraftGuard } from '@/useDraftGuard'

import type { CalendarOccurrence } from '../../../../calendarShared'
import { occurrenceZone } from './timeGridModel'

export function CalendarEventPopover({
  item,
  anchor,
  disabled,
  onClose,
  onChange,
  onSave,
  onComplete,
  onCancel,
  onOpenPage
}: {
  item: CalendarOccurrence
  anchor: HTMLElement
  disabled: boolean
  onClose: () => void
  onChange: (start: string, end: string) => Promise<boolean>
  onSave?: (
    title: string,
    description: string,
    start: string,
    end: string
  ) => Promise<boolean>
  onComplete: () => Promise<boolean>
  onCancel: () => Promise<boolean>
  onOpenPage: () => void
}) {
  const { t } = useModuleTranslation()
  const { t: work } = useTranslation('common.workHub')
  const [title, setTitle] = useState(item.record.title)
  const [description, setDescription] = useState(item.record.description ?? '')
  const [pending, setPending] = useState(false)
  const [discard, setDiscard] = useState(false)

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
  const dirty =
    title !== item.record.title ||
    description !== (item.record.description ?? '') ||
    start !== display(item.start).format(format) ||
    end !==
      display(item.end)
        .subtract(item.allDay ? 1 : 0, 'millisecond')
        .format(format)

  const { blocker, allowNavigation } = useDraftGuard(dirty || pending)

  function close() {
    if (pending) return
    if (dirty) setDiscard(true)
    else onClose()
  }

  async function save(openPage = false) {
    if (disabled || pending || !title.trim()) return

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
    setPending(true)

    try {
      const saved = onSave
        ? await onSave(
            title.trim(),
            description,
            a.toISOString(),
            b.toISOString()
          )
        : await onChange(a.toISOString(), b.toISOString())

      if (saved) {
        allowNavigation()
        if (openPage) onOpenPage()
        else onClose()
      } else setError(work('saveFailed'))
    } finally {
      setPending(false)
    }
  }

  return (
    <FloatingPopover
      anchor={anchor}
      className="calendar-event-editor"
      label={item.record.title}
      width={380}
      onClose={close}
    >
      <Stack gap="md">
        <Flex align="center" justify="between">
          <Text color="muted" size="xs">
            {work('eventDetails')}
          </Text>
          <Flex gap="xs">
            <Button
              aria-label={t('scheduling.openPage')}
              disabled={pending}
              icon="lucide:maximize-2"
              namespace={false}
              variant="plain"
              onClick={() => {
                if (dirty) void save(true)
                else onOpenPage()
              }}
            />
            <Button
              aria-label={work('close')}
              icon="lucide:x"
              namespace={false}
              variant="plain"
              onClick={close}
            />
          </Flex>
        </Flex>
        <Box
          aria-label={work('title')}
          as="input"
          className="monolith-calendar-create-title"
          disabled={disabled || pending || !onSave}
          maxLength={255}
          value={title}
          onChange={event => setTitle(event.target.value)}
        />
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
            disabled={disabled || pending}
            type={item.allDay ? 'date' : 'datetime-local'}
            value={start}
            onChange={event => setStart(event.target.value)}
          />
        </Box>
        <Box as="label" className="monolith-calendar-field">
          <Text size="sm">{t('scheduling.end')}</Text>
          <input
            disabled={disabled || pending || !item.endField}
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
        <Text color="muted" size="xs">
          {zone.replace(/_/g, ' ')}
          {item.allDay ? ` · ${work('allDay')}` : ''}
        </Text>
        <Box
          aria-label={work('description')}
          as="textarea"
          className="calendar-event-description"
          disabled={disabled || pending || !onSave}
          maxLength={10000}
          placeholder={work('descriptionEdit')}
          rows={3}
          value={description}
          onChange={event => setDescription(event.target.value)}
        />
        {recurring && (
          <Text color="muted" size="xs">
            {work('editSeries')}
          </Text>
        )}
        {error && (
          <Text color="dangerous" role="alert">
            {error}
          </Text>
        )}
        <Flex gap="sm" wrap="wrap">
          <Button
            disabled={disabled || pending || !title.trim()}
            loading={pending}
            namespace={false}
            onClick={() => void save()}
          >
            {work('saveEvent')}
          </Button>
          <Button
            disabled={pending}
            icon="lucide:maximize-2"
            namespace={false}
            variant="plain"
            onClick={() => {
              if (dirty) void save(true)
              else onOpenPage()
            }}
          >
            {t('scheduling.openPage')}
          </Button>
        </Flex>
        {item.record.item_type === 'task' && (
          <Button
            disabled={disabled || pending || dirty}
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
            disabled={disabled || pending || dirty}
            namespace={false}
            variant="plain"
            onClick={async () => {
              if (await onCancel()) onClose()
            }}
          >
            {t('scheduling.skipOccurrence')}
          </Button>
        )}
        {discard && (
          <DraftConfirmation
            onDiscard={() => {
              allowNavigation()
              onClose()
            }}
            onKeepEditing={() => setDiscard(false)}
          />
        )}
        <DraftNotice blocker={blocker} />
      </Stack>
    </FloatingPopover>
  )
}
