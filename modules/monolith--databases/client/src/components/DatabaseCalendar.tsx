import dayjs from 'dayjs'
import { parseAsString, parseAsStringEnum, useQueryState } from 'nuqs'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { useModuleTranslation } from '@monolith/localization'
import {
  Box,
  Button,
  Flex,
  Grid,
  Stack,
  Text,
  getInternalDragData,
  hasInternalDragData,
  setInternalDragData
} from '@monolith/ui'

import { useDatabases } from '@/DatabaseProvider'
import { workspaceAPI } from '@/manifest'
import {
  addCalendarDays,
  calendarDays,
  shiftCalendarMonth
} from '@/utils/calendar'
import { colorStyle, recordColor } from '@/utils/recordColors'

import {
  type CalendarOccurrence,
  calendarBinding,
  calendarTiming,
  expandCalendarRecord
} from '../../../calendarShared'
import {
  type CellValue,
  type Field,
  type RecordPage,
  type SavedView,
  isISODate
} from '../../../shared'
import { DatabaseCardProperties } from './DatabaseCardProperties'
import { CalendarEventPopover } from './calendar/CalendarEventPopover'
import { TimeGrid } from './calendar/TimeGrid'
import './calendar/calendar.css'
import {
  CALENDAR_OCCURRENCE_DRAG,
  moveToDate,
  occursOnDay
} from './calendar/timeGridModel'
import { useCalendarSchedules } from './calendar/useCalendarSchedules'

const dragType = CALENDAR_OCCURRENCE_DRAG
const modes = ['month', 'week', 'agenda'] as const
type Mode = (typeof modes)[number]

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
  const {
    api,
    openRecord,
    recordHref,
    run,
    busy,
    readOnly,
    embedded,
    workspaceId
  } = useDatabases()
  const { t, i18n } = useModuleTranslation(),
    navigate = useNavigate()
  const schedules = useCalendarSchedules()
  const today = dayjs().format('YYYY-MM-DD')
  const [routeDate, setRouteDate] = useQueryState(
    'calendarDate',
    parseAsString.withDefault(today)
  )
  const [routeMode, setRouteMode] = useQueryState(
    'calendarLayout',
    parseAsStringEnum<Mode>([...modes]).withDefault('week')
  )
  const [field, setField] = useQueryState('calendarField', parseAsString)
  const [localDate, setLocalDate] = useState(today),
    [localMode, setLocalMode] = useState<Mode>('month')
  const anchor = isISODate(embedded ? localDate : routeDate)
    ? embedded
      ? localDate
      : routeDate
    : today
  const mode = embedded ? localMode : routeMode
  const setDate = embedded ? setLocalDate : setRouteDate,
    setMode = embedded ? setLocalMode : setRouteMode
  const days = mode === 'agenda' ? [anchor] : calendarDays(anchor, mode)
  // All-day items retain their calendar date in the event's own time zone.
  // Pad the expansion range so distant time zones cannot omit a boundary day.
  const from = dayjs(days[0]).subtract(1, 'day').startOf('day').toISOString(),
    to = dayjs(days[days.length - 1])
      .add(2, 'day')
      .startOf('day')
      .toISOString()
  const [selected, setSelected] = useState<{
    item: CalendarOccurrence
    anchor: HTMLElement
  } | null>(null)
  const [provisional, setProvisional] = useState<{
    id: string
    start: string
    end: string
  } | null>(null)
  const [notice, setNotice] = useState('')
  const system = view.id === 'system-calendar'
  const disabled = readOnly || busy || schedules.isLoading || !!schedules.error
  function binding(record: RecordPage) {
    const schedule = schedules.data?.schedules.find(
      row => row.record_id === record.id
    )
    return system
      ? field
        ? { start: field, end: field === 'date' ? 'end_date' : null }
        : schedule
          ? {
              start: schedule.settings.start_field,
              end: schedule.settings.end_field
            }
          : calendarBinding(record, fields)
      : {
          start: view.config.date_field_id ?? 'date',
          end: view.config.end_date_field_id ?? null
        }
  }
  const occurrences = useMemo(() => {
    const rows = new Map(
      schedules.data?.schedules.map(row => [row.record_id, row])
    )
    return records
      .flatMap(record =>
        expandCalendarRecord(
          record,
          from,
          to,
          fields,
          rows.get(record.id),
          binding(record)
        )
      )
      .sort(
        (a, b) =>
          a.start.localeCompare(b.start) ||
          a.record.title.localeCompare(b.record.title)
      )
  }, [
    records,
    fields,
    schedules.data,
    from,
    to,
    view.config.date_field_id,
    view.config.end_date_field_id,
    field,
    system
  ])
  const items = provisional
    ? occurrences.map(item =>
        item.id === provisional.id ? { ...item, ...provisional } : item
      )
    : occurrences
  const unscheduled = records.filter(record => {
    const b = binding(record)
    return !calendarTiming(record, b.start, b.end)
  })
  async function change(item: CalendarOccurrence, start: string, end: string) {
    if (disabled || !workspaceId) return false
    setProvisional({ id: item.id, start, end })
    setNotice('')
    const result = await run(async () => {
      if (item.schedule?.settings.recurrence)
        return workspaceAPI.calendar.occurrence
          .input({ workspace_id: workspaceId, record_id: item.record.id })
          .mutate({
            expected_revision: item.schedule.revision,
            original: item.original,
            change: { start, end }
          })
      return workspaceAPI.calendar.move
        .input({ workspace_id: workspaceId, record_id: item.record.id })
        .mutate({
          expected_updated: item.record.updated,
          time_zone:
            item.schedule?.settings.time_zone ??
            Intl.DateTimeFormat().resolvedOptions().timeZone,
          start_field: item.startField,
          end_field: item.endField,
          start,
          end
        })
    })
    setProvisional(null)
    setNotice(t(result ? 'scheduling.timeSaved' : 'scheduling.moveFailed'))
    return !!result
  }
  async function mark(item: CalendarOccurrence, cancelled = false) {
    if (disabled || !workspaceId) return false
    const result = await run(async () => {
      if (item.schedule?.settings.recurrence)
        return workspaceAPI.calendar.occurrence
          .input({ workspace_id: workspaceId, record_id: item.record.id })
          .mutate({
            expected_revision: item.schedule.revision,
            original: item.original,
            change: cancelled ? { cancelled: true } : { done: !item.done }
          })
      return api.updateRecord
        .input({ id: item.record.id })
        .mutate({ done: !item.done, expected_updated: item.record.updated })
    })
    return !!result
  }
  function create(start: string, end: string) {
    if (disabled) return
    const a = system ? 'date' : (view.config.date_field_id ?? 'date')
    const b = system ? 'end_date' : view.config.end_date_field_id
    onCreate({
      [a]: a === 'date' ? start : dayjs(start).format('YYYY-MM-DD'),
      ...(b
        ? {
            [b]:
              b === 'end_date'
                ? end
                : dayjs(end).subtract(1, 'millisecond').format('YYYY-MM-DD')
          }
        : {})
    })
  }
  function monthMove(item: CalendarOccurrence, date: string) {
    const next = moveToDate(item, date)
    void change(item, next.start, next.end)
  }
  function open(item: CalendarOccurrence, element: HTMLElement) {
    setSelected({ item, anchor: element })
  }
  return (
    <Stack gap="md" minWidth="0" width="100%">
      <Flex align="center" justify="between" gap="sm" wrap="wrap">
        <Flex align="center" gap="sm">
          <Button
            namespace={false}
            variant="secondary"
            onClick={() => void setDate(today)}
          >
            {t('scheduling.today')}
          </Button>
          {[-1, 1].map(direction => (
            <Button
              key={direction}
              icon={
                direction < 0 ? 'tabler:chevron-left' : 'tabler:chevron-right'
              }
              variant="plain"
              aria-label={t(
                direction < 0 ? 'calendarView.previous' : 'calendarView.next'
              )}
              onClick={() =>
                void setDate(
                  mode === 'month'
                    ? shiftCalendarMonth(anchor, direction)
                    : addCalendarDays(
                        anchor,
                        direction * (mode === 'week' ? 7 : 1)
                      )
                )
              }
            />
          ))}
          <Text as="h2" size="xl" weight="semibold">
            {dayjs(anchor)
              .locale(i18n.language)
              .format(mode === 'agenda' ? 'ddd, D MMMM YYYY' : 'MMMM YYYY')}
          </Text>
        </Flex>
        {system && (
          <Box as="label" className="monolith-calendar-field" width="220px">
            <select
              aria-label={t('scheduling.startProperty')}
              value={field ?? ''}
              onChange={event => void setField(event.target.value || null)}
            >
              <option value="">{t('scheduling.automaticDates')}</option>
              <option value="date">{t('itemDate')}</option>
              {fields
                .filter(field => field.kind === 'date')
                .map(field => (
                  <option key={field.id} value={field.id}>
                    {field.name}
                  </option>
                ))}
            </select>
          </Box>
        )}
        <Flex gap="xs" wrap="wrap">
          {modes.map(value => (
            <Button
              key={value}
              namespace={false}
              variant={mode === value ? 'primary' : 'secondary'}
              aria-pressed={mode === value}
              onClick={() => void setMode(value)}
            >
              {t(
                value === 'agenda'
                  ? 'scheduling.dayAgenda'
                  : `calendarView.${value}`
              )}
            </Button>
          ))}
        </Flex>
      </Flex>

      {schedules.error && (
        <Flex gap="sm">
          <Text color="dangerous" role="alert">
            {schedules.error.message}
          </Text>
          <Button onClick={() => void schedules.refetch()}>
            {t('scheduling.retry')}
          </Button>
        </Flex>
      )}
      <Box minHeight="20px">
        <Text role="status" size="sm">
          {notice}
        </Text>
      </Box>
      {mode !== 'month' ? (
        <TimeGrid
          days={days}
          items={items}
          disabled={disabled}
          onOpen={open}
          onChange={async (item, start, end) => {
            await change(item, start, end)
          }}
          onCreate={create}
          eventStyle={item =>
            colorStyle(recordColor(item.record, view.config.color, fields))
          }
        />
      ) : (
        <Box overflowX="auto">
          <Grid
            templateCols={7}
            gap="xs"
            minWidth="700px"
            aria-label={t('scheduling.monthGrid')}
          >
            {days.slice(0, 7).map(date => (
              <Text key={date} p="sm" size="sm" color="muted" align="center">
                {dayjs(date).locale(i18n.language).format('ddd')}
              </Text>
            ))}
            {days.map(date => (
              <Stack
                key={date}
                className="monolith-calendar-month"
                gap="xs"
                p="xs"
                minHeight="150px"
                minWidth="0"
                onDragOver={event => {
                  if (
                    !disabled &&
                    hasInternalDragData(event.nativeEvent, dragType)
                  )
                    event.preventDefault()
                }}
                onDrop={event => {
                  event.preventDefault()
                  if (disabled) return
                  const id = getInternalDragData(event.nativeEvent, dragType)
                  const item = items.find(item => item.id === id)
                  if (item) monthMove(item, date)
                }}
              >
                <Flex justify="between" align="center">
                  <Button
                    namespace={false}
                    variant={date === today ? 'secondary' : 'plain'}
                    onClick={() => {
                      void setDate(date)
                      void setMode('agenda')
                    }}
                  >
                    {dayjs(date).format('D')}
                  </Button>
                  <Button
                    icon="tabler:plus"
                    variant="plain"
                    disabled={disabled}
                    aria-label={t('calendarView.newOn', { date })}
                    onClick={() =>
                      create(
                        dayjs(date).hour(9).toISOString(),
                        dayjs(date).hour(10).toISOString()
                      )
                    }
                  />
                </Flex>
                {items
                  .filter(item => occursOnDay(item, date))
                  .map(item => (
                    <Box
                      key={item.id}
                      className="monolith-calendar-month-event"
                      style={colorStyle(
                        recordColor(item.record, view.config.color, fields)
                      )}
                      data-done={item.done}
                      r="sm"
                      draggable={!disabled}
                      onDragStart={event =>
                        setInternalDragData(
                          event.nativeEvent,
                          dragType,
                          item.id
                        )
                      }
                    >
                      <Button
                        namespace={false}
                        justify="start"
                        variant="plain"
                        width="100%"
                        p="xs"
                        onClick={event => open(item, event.currentTarget)}
                      >
                        <Text truncate size="sm">
                          {!item.allDay &&
                            `${dayjs(item.start).format('HH:mm')} `}
                          {item.record.title}
                          {item.schedule?.settings.recurrence ? ' ↻' : ''}
                        </Text>
                      </Button>
                      {!system && (
                        <DatabaseCardProperties
                          fields={fields.filter(
                            field =>
                              !view.config.hidden_fields.includes(field.id)
                          )}
                          record={item.record}
                        />
                      )}
                    </Box>
                  ))}
              </Stack>
            ))}
          </Grid>
        </Box>
      )}
      {unscheduled.length > 0 && (
        <Stack gap="sm">
          <Text color="muted">
            {t('calendarView.unscheduled', { count: unscheduled.length })}
          </Text>
          <Flex gap="sm" wrap="wrap">
            {unscheduled.map(record => (
              <Button
                key={record.id}
                namespace={false}
                variant="secondary"
                onClick={() => openRecord(record)}
              >
                {record.title}
              </Button>
            ))}
          </Flex>
        </Stack>
      )}
      {selected && (
        <CalendarEventPopover
          key={selected.item.id}
          item={selected.item}
          anchor={selected.anchor}
          disabled={disabled}
          onClose={() => setSelected(null)}
          onChange={(start, end) => change(selected.item, start, end)}
          onComplete={() => mark(selected.item)}
          onCancel={() => mark(selected.item, true)}
          onOpenPage={() => {
            navigate(recordHref(selected.item.record) + '&pageMode=full')
            setSelected(null)
          }}
        />
      )}
    </Stack>
  )
}
