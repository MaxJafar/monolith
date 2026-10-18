import dayjs from 'dayjs'
import { parseAsString, parseAsStringEnum, useQueryState } from 'nuqs'
import { type ReactNode, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { useModuleTranslation } from '@monolith/localization'
import {
  Box,
  Button,
  ChoiceSelect,
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
import { CalendarMiniMonth } from './calendar/CalendarMiniMonth'
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
  onCreate,
  sidebar,
  toolbar
}: {
  records: RecordPage[]
  fields: Field[]
  view: SavedView
  onCreate: (values: Record<string, CellValue>, anchor?: HTMLElement) => void
  sidebar?: ReactNode
  toolbar?: ReactNode
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
  const disabled = readOnly || busy || schedules.isFetching || !!schedules.error

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

  function create(start: string, end: string, anchor?: HTMLElement) {
    if (disabled) return

    const a = system ? 'date' : (view.config.date_field_id ?? 'date')
    const b = system ? 'end_date' : view.config.end_date_field_id
    onCreate(
      {
        [a]: a === 'date' ? start : dayjs(start).format('YYYY-MM-DD'),
        ...(b
          ? {
              [b]:
                b === 'end_date'
                  ? end
                  : dayjs(end).subtract(1, 'millisecond').format('YYYY-MM-DD')
            }
          : {})
      },
      anchor
    )
  }

  function monthMove(item: CalendarOccurrence, date: string) {
    const next = moveToDate(item, date)
    void change(item, next.start, next.end)
  }

  function open(item: CalendarOccurrence, element: HTMLElement) {
    setSelected({ item, anchor: element })
  }

  return (
    <Box className={system ? 'calendar-layout' : undefined}>
      {system && (
        <Stack as="aside" className="calendar-rail" gap="lg">
          <CalendarMiniMonth
            date={anchor}
            onChange={value => {
              void setDate(value)
            }}
          />
          {sidebar}
        </Stack>
      )}
      <Stack className="calendar-main" gap="sm" minWidth="0" width="100%">
        <Flex
          align="center"
          className="calendar-toolbar"
          gap="sm"
          justify="between"
          wrap="wrap"
        >
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
                aria-label={t(
                  direction < 0 ? 'calendarView.previous' : 'calendarView.next'
                )}
                icon={
                  direction < 0 ? 'tabler:chevron-left' : 'tabler:chevron-right'
                }
                variant="plain"
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
            <Box width="250px">
              <ChoiceSelect
                label={t('scheduling.startProperty')}
                options={[
                  {
                    value: '',
                    label: t('scheduling.automaticDates'),
                    icon: 'lucide:calendar'
                  },
                  { value: 'date', label: t('itemDate') },
                  ...fields
                    .filter(field => field.kind === 'date')
                    .map(field => ({ value: field.id, label: field.name }))
                ]}
                value={field ?? ''}
                onChange={value => void setField(value || null)}
              />
            </Box>
          )}
          <Flex
            aria-label={t('viewLayout')}
            className="monolith-calendar-modes"
            gap="xs"
            role="group"
          >
            {modes.map(value => (
              <Button
                key={value}
                aria-pressed={mode === value}
                namespace={false}
                variant="plain"
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
          {toolbar}
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
        <Box className={notice ? 'calendar-notice' : 'calendar-quiet-status'}>
          <Text role="status" size="sm">
            {notice}
          </Text>
        </Box>
        {mode !== 'month' ? (
          <TimeGrid
            days={days}
            disabled={disabled}
            eventStyle={item =>
              colorStyle(recordColor(item.record, view.config.color, fields))
            }
            items={items}
            onChange={async (item, start, end) => {
              await change(item, start, end)
            }}
            onCreate={create}
            onOpen={open}
          />
        ) : (
          <Box overflowX="auto">
            <Grid
              aria-label={t('scheduling.monthGrid')}
              gap={system ? 'none' : 'xs'}
              minWidth="700px"
              templateCols={7}
            >
              {days.slice(0, 7).map(date => (
                <Text key={date} align="center" color="muted" p="sm" size="sm">
                  {dayjs(date).locale(i18n.language).format('ddd')}
                </Text>
              ))}
              {days.map(date => (
                <Stack
                  key={date}
                  className="monolith-calendar-month"
                  gap="xs"
                  minHeight="150px"
                  minWidth="0"
                  p="xs"
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
                  <Flex align="center" justify="between">
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
                      aria-label={t('calendarView.newOn', { date })}
                      disabled={disabled}
                      icon="tabler:plus"
                      variant="plain"
                      onClick={event =>
                        create(
                          dayjs(date).hour(9).toISOString(),
                          dayjs(date).hour(10).toISOString(),
                          event.currentTarget
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
                        data-done={item.done}
                        draggable={!disabled}
                        r="sm"
                        style={colorStyle(
                          recordColor(item.record, view.config.color, fields)
                        )}
                        onDragStart={event =>
                          setInternalDragData(
                            event.nativeEvent,
                            dragType,
                            item.id
                          )
                        }
                      >
                        <Button
                          justify="start"
                          namespace={false}
                          p="xs"
                          variant="plain"
                          width="100%"
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
            anchor={selected.anchor}
            disabled={disabled}
            item={selected.item}
            onCancel={() => mark(selected.item, true)}
            onChange={(start, end) => change(selected.item, start, end)}
            onClose={() => setSelected(null)}
            onComplete={() => mark(selected.item)}
            onOpenPage={() => {
              navigate(recordHref(selected.item.record) + '&pageMode=full')
              setSelected(null)
            }}
            onSave={async (title, description, start, end) => {
              if (disabled || !workspaceId) return false

              const item = selected.item
              const result = await run(() =>
                workspaceAPI.calendar.edit
                  .input({
                    workspace_id: workspaceId,
                    record_id: item.record.id
                  })
                  .mutate({
                    title,
                    description,
                    expected_updated: item.record.updated,
                    time_zone:
                      item.schedule?.settings.time_zone ??
                      Intl.DateTimeFormat().resolvedOptions().timeZone,
                    start_field: item.startField,
                    end_field: item.endField,
                    start,
                    end,
                    ...(item.schedule?.settings.recurrence
                      ? {
                          occurrence: {
                            original: item.original,
                            expected_revision: item.schedule.revision
                          }
                        }
                      : {})
                  })
              )

              return !!result
            }}
          />
        )}
      </Stack>
    </Box>
  )
}
