import dayjs from 'dayjs'
import { parseAsString, parseAsStringEnum, useQueryState } from 'nuqs'
import { useState } from 'react'

import { useModuleTranslation } from '@lifeforge/localization'
import { Box, Button, DateInput, Flex, Grid, Stack, Text } from '@lifeforge/ui'

import { useDatabases } from '@/DatabaseProvider'
import {
  addCalendarDays,
  calendarDays,
  calendarRecordPatch,
  rangesOverlap,
  recordCalendarRange,
  shiftCalendarMonth
} from '@/utils/calendar'

import {
  type CellValue,
  type Field,
  type RecordPage,
  type SavedView,
  isISODate,
  viewProperties
} from '../../../shared'
import { CALENDAR_DRAG_TYPE, CalendarRecordCard } from './CalendarRecordCard'

export function DatabaseCalendar({
  records,
  fields,
  view,
  onCreate
}: {
  records: RecordPage[]
  fields: Field[]
  view: SavedView
  onCreate: (values: Record<string, CellValue>) => void
}) {
  const { api: forgeAPI, openRecord, run, busy, readOnly } = useDatabases()
  const { t, i18n } = useModuleTranslation()

  const today = dayjs().format('YYYY-MM-DD')
  const [rawAnchor, setAnchor] = useQueryState(
    'calendarDate',
    parseAsString.withDefault(today)
  )
  const [layout, setLayout] = useQueryState(
    'calendarLayout',
    parseAsStringEnum(['month', 'week', 'agenda'] as const).withDefault('month')
  )
  const anchor = isISODate(rawAnchor) ? rawAnchor : today
  const [moving, setMoving] = useState<{
    record: RecordPage
    date: string
  } | null>(null)
  const properties = [...viewProperties('', t), ...fields]
  const dateField = properties.find(
    field => field.id === view.config.date_field_id && field.kind === 'date'
  )
  const endField = properties.find(
    field => field.id === view.config.end_date_field_id && field.kind === 'date'
  )
  const cardFields = fields.filter(
    field => !view.config.hidden_fields.includes(field.id)
  )
  const dated = records.map(record => ({
    record,
    range: recordCalendarRange(record, dateField?.id, endField?.id)
  }))
  const scheduled = dated.filter(item => item.range !== null)
  const unscheduled = dated.filter(item => item.range === null)
  const days = calendarDays(anchor, layout === 'week' ? 'week' : 'month')
  const first =
    layout === 'week' ? (days[0] ?? anchor) : anchor.slice(0, 7) + '-01'
  const last =
    layout === 'week'
      ? (days[6] ?? first)
      : dayjs(first).endOf('month').format('YYYY-MM-DD')
  const inPeriod = scheduled.filter(
    item => item.range && rangesOverlap(item.range, first, last)
  )

  if (!view.config.sorts.length)
    inPeriod.sort((a, b) =>
      (a.range?.start ?? '').localeCompare(b.range?.start ?? '')
    )

  const weekdays = days.slice(0, 7).map(date =>
    new Intl.DateTimeFormat(i18n.language, {
      weekday: 'short',
      timeZone: 'UTC'
    }).format(new Date(date + 'T12:00:00Z'))
  )

  function navigate(direction: number) {
    void setAnchor(
      layout === 'week'
        ? addCalendarDays(anchor, direction * 7)
        : shiftCalendarMonth(anchor, direction)
    )
  }

  async function move(record: RecordPage, date: string) {
    if (!dateField || busy || readOnly) return

    const patch = calendarRecordPatch(record, date, dateField.id, endField?.id)

    if (!patch) return

    const result = await run(() =>
      forgeAPI.updateRecord.input({ id: record.id }).mutate({
        title: record.title,
        content: record.content,
        ...patch,
        expected_updated: record.updated
      })
    )

    if (result) setMoving(null)
  }

  function create(date: string) {
    if (!dateField || busy || readOnly) return
    onCreate({
      [dateField.id]: date,
      ...(endField ? { [endField.id]: date } : {})
    })
  }

  if (!dateField)
    return <Text color="muted">{t('calendarView.noDateFields')}</Text>

  return (
    <Stack gap="md" minWidth="0" width="100%">
      <Flex align="center" gap="sm" justify="between" wrap="wrap">
        <Flex align="center" gap="sm" wrap="wrap">
          <Button
            aria-label={t('calendarView.previous')}
            icon="tabler:chevron-left"
            variant="plain"
            onClick={() => navigate(-1)}
          />
          <Text as="h3" size="xl" weight="semibold">
            {layout === 'week'
              ? `${dayjs(first).format('D MMM')} – ${dayjs(last).format('D MMM YYYY')}`
              : dayjs(anchor).format('MMMM YYYY')}
          </Text>
          <Button
            aria-label={t('calendarView.next')}
            icon="tabler:chevron-right"
            variant="plain"
            onClick={() => navigate(1)}
          />
          <Button
            variant="secondary"
            onClick={() => {
              void setAnchor(today)
            }}
          >
            calendarToday
          </Button>
        </Flex>
        <Flex gap="xs" wrap="wrap">
          {(['month', 'week', 'agenda'] as const).map(mode => (
            <Button
              key={mode}
              aria-pressed={layout === mode}
              namespace={false}
              variant={layout === mode ? 'primary' : 'secondary'}
              onClick={() => {
                void setLayout(mode)
              }}
            >
              {t(`calendarView.${mode}`)}
            </Button>
          ))}
        </Flex>
      </Flex>
      <Text color="muted">
        {t('calendarView.dateBinding', {
          start: dateField.name,
          end: endField?.name ?? dateField.name
        })}
      </Text>
      <Text color="muted" size="sm">
        {t('calendarView.moveHelp')}
      </Text>
      {moving && (
        <Stack bg={{ base: 'bg-100', dark: 'bg-900' }} gap="sm" p="md" r="lg">
          <Text weight="semibold">
            {t('calendarView.moveRecord', { title: moving.record.title })}
          </Text>
          <DateInput
            autoFocus
            disabled={busy || readOnly}
            icon="tabler:calendar"
            label="inputs.date"
            value={isISODate(moving.date) ? dayjs(moving.date).toDate() : null}
            onChange={date =>
              setMoving(
                current =>
                  current && {
                    ...current,
                    date: date ? dayjs(date).format('YYYY-MM-DD') : ''
                  }
              )
            }
          />
          <Flex gap="sm">
            <Button
              disabled={readOnly || !isISODate(moving.date)}
              icon="tabler:check"
              loading={busy}
              onClick={() => {
                void move(moving.record, moving.date)
              }}
            >
              calendarMove
            </Button>
            <Button variant="secondary" onClick={() => setMoving(null)}>
              cancel
            </Button>
          </Flex>
        </Stack>
      )}
      {layout === 'agenda' ? (
        <Stack gap="md">
          {inPeriod.map(({ record, range }) => (
            <Stack key={record.id} gap="sm">
              <Text color="muted">
                {range?.start}{' '}
                {range?.end !== range?.start ? `– ${range?.end}` : ''}
              </Text>
              <CalendarRecordCard
                fields={cardFields}
                record={record}
                onMove={() =>
                  setMoving({ record, date: range?.start ?? today })
                }
              />
            </Stack>
          ))}
          {!inPeriod.length && (
            <Text color="muted">{t('calendarView.noScheduled')}</Text>
          )}
        </Stack>
      ) : (
        <Box minWidth="0" overflowX="auto" width="100%">
          <Stack
            aria-label={t('calendarView.gridLabel', {
              month: dayjs(anchor).format('MMMM YYYY')
            })}
            gap="xs"
            minWidth="630px"
            role="table"
          >
            <Grid gap="xs" role="row" templateCols={7}>
              {weekdays.map((day, index) => (
                <Text
                  key={index}
                  align="center"
                  p="sm"
                  role="columnheader"
                  weight="semibold"
                >
                  {day}
                </Text>
              ))}
            </Grid>
            {Array.from({ length: days.length / 7 }, (_, week) => (
              <Grid key={days[week * 7]} gap="xs" role="row" templateCols={7}>
                {days.slice(week * 7, week * 7 + 7).map(date => (
                  <Stack
                    key={date}
                    aria-label={date}
                    bg={{ base: 'bg-100', dark: 'bg-900' }}
                    gap="xs"
                    minHeight="150px"
                    minWidth="0"
                    p="sm"
                    r="lg"
                    role="cell"
                    style={{
                      opacity:
                        layout === 'month' &&
                        date.slice(0, 7) !== anchor.slice(0, 7)
                          ? 0.65
                          : 1
                    }}
                    onDragOver={event => {
                      if (
                        !busy &&
                        !readOnly &&
                        event.dataTransfer.types.includes(CALENDAR_DRAG_TYPE)
                      )
                        event.preventDefault()
                    }}
                    onDrop={event => {
                      event.preventDefault()
                      const record = records.find(
                        record =>
                          record.id ===
                          event.dataTransfer.getData(CALENDAR_DRAG_TYPE)
                      )

                      if (record && !busy && !readOnly) void move(record, date)
                    }}
                  >
                    <Flex align="center" gap="xs" justify="between">
                      <Text
                        color={date === today ? 'primary' : 'muted'}
                        weight={date === today ? 'bold' : 'normal'}
                      >
                        {dayjs(date).format('D')}
                      </Text>
                      <Button
                        aria-label={t('calendarView.newOn', { date })}
                        disabled={busy || readOnly}
                        icon="tabler:plus"
                        variant="plain"
                        onClick={() => create(date)}
                      />
                    </Flex>
                    {scheduled
                      .filter(
                        item =>
                          item.range && rangesOverlap(item.range, date, date)
                      )
                      .map(({ record, range }) => (
                        <CalendarRecordCard
                          key={record.id}
                          fields={cardFields}
                          record={record}
                          onMove={() =>
                            setMoving({ record, date: range?.start ?? date })
                          }
                        />
                      ))}
                  </Stack>
                ))}
              </Grid>
            ))}
          </Stack>
        </Box>
      )}
      <Stack bg={{ base: 'bg-100', dark: 'bg-900' }} gap="sm" p="md" r="lg">
        <Text as="h3" weight="semibold">
          {t('calendarView.unscheduled', { count: unscheduled.length })}
        </Text>
        <Text color="muted" size="sm">
          {t('calendarView.unscheduledHelp')}
        </Text>
        <Flex gap="sm" wrap="wrap">
          {unscheduled.map(({ record }) => (
            <Button
              key={record.id}
              icon="tabler:file-text"
              namespace={false}
              variant="secondary"
              onClick={() => openRecord(record)}
            >
              {record.title}
            </Button>
          ))}
        </Flex>
      </Stack>
    </Stack>
  )
}
