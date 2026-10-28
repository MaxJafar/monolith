import dayjs, { type Dayjs } from 'dayjs'
import {
  type CSSProperties,
  Fragment,
  type ReactNode,
  useMemo,
  useState
} from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import {
  Box,
  Button,
  type CanvasWidgetConfiguration,
  Flex,
  HoverCard,
  Stack,
  Text,
  useHoverCard
} from '@monolith/ui'

import { useRpg } from '@/addons/urpg/useRpg'

import type {
  Field,
  RecordPage
} from '../../../../../../modules/monolith--databases/shared'
import { widgetConfig } from '../../../../../../modules/monolith--databases/widgetShared'
import { CalendarPreviewCard } from './CalendarPreviewCard'
import './calendarWidget.css'
import {
  type CalendarPreview,
  type WidgetEvent,
  eventsOn,
  formatRange,
  recordEvents,
  sortEvents,
  startOfWeek,
  timeRange,
  useWidgetSchedules
} from './calendarWidgetModel'

const modes = ['day', 'week', 'month'] as const

type Mode = (typeof modes)[number]

export function CalendarWidget({
  records,
  fields,
  workspaceId,
  configuration
}: {
  records: RecordPage[]
  fields: Field[]
  workspaceId: string
  configuration?: CanvasWidgetConfiguration
}) {
  const { t, i18n } = useTranslation('common', { keyPrefix: 'widgetSettings' }),
    rpg = useRpg(),
    schedules = useWidgetSchedules(workspaceId),
    card = useHoverCard<CalendarPreview>()
  const config = widgetConfig(configuration?.filter)
  // Saved agenda widgets predate the day view; the week list is closest.
  const savedMode: Mode =
    config.mode === 'agenda'
      ? 'week'
      : (modes.find(mode => mode === config.mode) ?? 'month')
  // A local choice (or a drill-down into a day) lasts until the saved mode changes.

  const [local, setLocal] = useState<{ mode: Mode; from: Mode }>()

  const mode = local?.from === savedMode ? local.mode : savedMode

  const [cursor, setCursor] = useState(() => dayjs().startOf('day'))
  const [direction, setDirection] = useState<'next' | 'previous'>()

  const today = dayjs().startOf('day')
  const month = cursor.startOf('month')
  const first =
    mode === 'month'
      ? startOfWeek(month)
      : mode === 'week'
        ? startOfWeek(cursor)
        : cursor
  const length =
    mode === 'month'
      ? Math.ceil((month.diff(first, 'day') + month.daysInMonth()) / 7) * 7
      : mode === 'week'
        ? 7
        : 1
  const days = Array.from({ length }, (_, index) => first.add(index, 'day'))
  const last = first.add(length, 'day')
  const showingToday =
    mode === 'month'
      ? cursor.isSame(today, 'month')
      : !today.isBefore(first) && today.isBefore(last)
  const rangeStart = first.valueOf()

  const events = useMemo(
    () => [
      ...recordEvents(
        records,
        fields,
        schedules,
        dayjs(rangeStart),
        dayjs(rangeStart).add(length, 'day'),
        workspaceId
      ),
      ...(rpg.state?.encounters ?? []).map(encounter =>
        questEvent(
          encounter.id,
          encounter.title,
          encounter.day,
          workspaceId,
          'encounters'
        )
      ),
      ...(rpg.state?.items ?? []).flatMap(item =>
        item.due && !item.archived
          ? [questEvent(item.id, item.title, item.due, workspaceId, 'quests')]
          : []
      )
    ],
    [records, fields, schedules, rpg.state, workspaceId, rangeStart, length]
  )

  function changeMode(next: Mode) {
    setLocal({ mode: next, from: savedMode })
    if (next !== savedMode)
      configuration?.onConfigChange?.(JSON.stringify({ ...config, mode: next }))
  }

  function move(step: number) {
    setDirection(step > 0 ? 'next' : 'previous')
    setCursor(current => current.add(step, mode))
  }

  function openDay(day: Dayjs) {
    card.close()
    setDirection(day.isBefore(cursor) ? 'previous' : 'next')
    setCursor(day)
    // Drilling into a day is temporary; it does not change the saved view.
    setLocal({ mode: 'day', from: savedMode })
  }

  const title =
    mode === 'month'
      ? new Intl.DateTimeFormat(i18n.language, {
          month: 'long',
          year: 'numeric'
        }).format(cursor.toDate())
      : mode === 'week'
        ? formatRange(
            new Intl.DateTimeFormat(i18n.language, {
              month: 'short',
              day: 'numeric'
            }),
            first.toDate(),
            last.subtract(1, 'day').toDate()
          )
        : new Intl.DateTimeFormat(i18n.language, {
            weekday: 'long',
            month: 'short',
            day: 'numeric'
          }).format(cursor.toDate())
  const weekday = (day: Dayjs, style: 'narrow' | 'short') =>
    new Intl.DateTimeFormat(i18n.language, { weekday: style }).format(
      day.toDate()
    )

  function chip(event: WidgetEvent, showTime: boolean) {
    return (
      <Box
        key={event.id}
        as={Link}
        className="workspace-calendar-event"
        data-done={event.done || undefined}
        data-kind={event.kind}
        to={event.href}
        {...card.trigger({ type: 'event', event })}
      >
        <Text truncate size="xs" weight="medium">
          {event.title || t('untitled')}
        </Text>
        {showTime && !event.allDay && (
          <Text className="workspace-calendar-event-time" size="xs">
            {timeRange(event, i18n.language)}
          </Text>
        )}
      </Box>
    )
  }

  return (
    <Stack className="workspace-calendar" data-mode={mode} gap="sm">
      <Flex
        align="center"
        className="workspace-calendar-head"
        gap="xs"
        justify="between"
        wrap="wrap"
      >
        <Text
          aria-live="polite"
          className="workspace-calendar-title"
          size="sm"
          weight="semibold"
        >
          {title}
        </Text>
        <Flex align="center" gap="xs">
          <Button
            aria-label={t('previous')}
            icon="lucide:chevron-left"
            namespace={false}
            p="xs"
            variant="plain"
            onClick={() => move(-1)}
          />
          <Button
            className="workspace-calendar-today"
            disabled={showingToday}
            namespace={false}
            variant="plain"
            onClick={() => {
              setDirection(today.isBefore(cursor) ? 'previous' : 'next')
              setCursor(today)
            }}
          >
            {t('today')}
          </Button>
          <Button
            aria-label={t('next')}
            icon="lucide:chevron-right"
            namespace={false}
            p="xs"
            variant="plain"
            onClick={() => move(1)}
          />
        </Flex>
      </Flex>
      <Flex
        aria-label={t('calendarView')}
        className="workspace-calendar-modes"
        role="group"
      >
        {modes.map(value => (
          <Button
            key={value}
            aria-pressed={mode === value}
            namespace={false}
            variant="plain"
            onClick={() => changeMode(value)}
          >
            {t(value)}
          </Button>
        ))}
      </Flex>
      <Box
        key={`${mode}:${rangeStart}`}
        className="workspace-calendar-view"
        data-direction={direction}
      >
        {mode === 'month' && (
          <Box className="workspace-calendar-month">
            {days.slice(0, 7).map(day => (
              <Text
                key={`weekday-${day.day()}`}
                aria-hidden
                className="workspace-calendar-weekday"
                size="xs"
              >
                {weekday(day, 'narrow')}
              </Text>
            ))}
            {days.map(day => {
              const items = eventsOn(events, day)
              const isToday = day.isSame(today)

              return (
                <Box
                  key={day.valueOf()}
                  className="workspace-calendar-cell"
                  data-outside={!day.isSame(month, 'month') || undefined}
                  data-today={isToday || undefined}
                >
                  <button
                    aria-current={isToday ? 'date' : undefined}
                    aria-label={`${new Intl.DateTimeFormat(i18n.language, {
                      dateStyle: 'full'
                    }).format(day.toDate())}, ${t('eventCount', {
                      count: items.length
                    })}`}
                    className="workspace-calendar-date"
                    type="button"
                    onClick={() => openDay(day)}
                    {...(items.length || isToday
                      ? card.trigger({
                          type: 'day',
                          day: day.format('YYYY-MM-DD')
                        })
                      : {})}
                  >
                    <span>{day.date()}</span>
                    {items.length > 0 && (
                      <span aria-hidden className="workspace-calendar-dots">
                        {items.slice(0, 3).map(event => (
                          <span key={event.id} data-kind={event.kind} />
                        ))}
                      </span>
                    )}
                  </button>
                  <Stack className="workspace-calendar-cell-events" gap="xs">
                    {items.slice(0, 2).map(event => chip(event, false))}
                    {items.length > 2 && (
                      <button
                        className="workspace-calendar-more"
                        type="button"
                        onClick={() => openDay(day)}
                      >
                        {t('moreEvents', { count: items.length - 2 })}
                      </button>
                    )}
                  </Stack>
                </Box>
              )
            })}
          </Box>
        )}
        {mode === 'week' && (
          <Box className="workspace-calendar-week">
            {days.map((day, index) => {
              const items = eventsOn(events, day)
              const isToday = day.isSame(today)

              return (
                <Box
                  key={day.valueOf()}
                  className="workspace-calendar-week-day"
                  data-today={isToday || undefined}
                  style={{ '--stagger': index } as CSSProperties}
                >
                  <button
                    aria-current={isToday ? 'date' : undefined}
                    className="workspace-calendar-week-date"
                    type="button"
                    onClick={() => openDay(day)}
                  >
                    <Text size="xs">{weekday(day, 'short')}</Text>
                    <Text className="workspace-calendar-week-number" size="sm">
                      {day.date()}
                    </Text>
                  </button>
                  <Stack className="workspace-calendar-week-events" gap="xs">
                    {items.map(event => chip(event, true))}
                    {!items.length && (
                      <Text className="workspace-calendar-empty" size="xs">
                        —
                      </Text>
                    )}
                  </Stack>
                </Box>
              )
            })}
          </Box>
        )}
        {mode === 'day' && (
          <DayTimeline
            day={cursor}
            events={eventsOn(events, cursor)}
            renderChip={chip}
          />
        )}
      </Box>
      <HoverCard
        card={card}
        contentKey={
          card.preview?.type === 'event'
            ? card.preview.event.id
            : card.preview?.type === 'day'
              ? card.preview.day
              : 'agenda'
        }
        label={t('calendarPreview')}
        width={card.preview?.type === 'day' ? 300 : 260}
      >
        {card.preview && (
          <CalendarPreviewCard events={events} preview={card.preview} />
        )}
      </HoverCard>
    </Stack>
  )
}

function DayTimeline({
  day,
  events,
  renderChip
}: {
  day: Dayjs
  events: WidgetEvent[]
  renderChip: (event: WidgetEvent, showTime: boolean) => ReactNode
}) {
  const { t, i18n } = useTranslation('common', { keyPrefix: 'widgetSettings' })

  const now = dayjs()
  const allDay = events.filter(event => event.allDay)
  const timed = sortEvents(events.filter(event => !event.allDay))
  const isToday = day.isSame(now, 'day')
  const nowIndex = isToday
    ? timed.findIndex(event => event.start.isAfter(now))
    : -1
  const time = new Intl.DateTimeFormat(i18n.language, {
    hour: 'numeric',
    minute: '2-digit'
  })
  const marker = (
    <Flex key="now" align="center" className="workspace-calendar-now" gap="sm">
      <Text size="xs">{time.format(now.toDate())}</Text>
      <span aria-hidden className="workspace-calendar-now-line" />
    </Flex>
  )

  if (!events.length)
    return (
      <Stack align="center" className="workspace-calendar-day-empty" gap="xs">
        <Text color="muted" size="sm">
          {t(isToday ? 'noMoreEvents' : 'noEvents')}
        </Text>
      </Stack>
    )

  return (
    <Stack className="workspace-calendar-day" gap="sm">
      {allDay.length > 0 && (
        <Stack className="workspace-calendar-allday" gap="xs">
          <Text color="muted" size="xs" weight="medium">
            {t('allDay')}
          </Text>
          {allDay.map(event => renderChip(event, false))}
        </Stack>
      )}
      <Stack className="workspace-calendar-timeline" gap="none">
        {timed.map((event, index) => (
          <Fragment key={event.id}>
            {index === nowIndex && marker}
            <Flex
              className="workspace-calendar-slot"
              data-past={(isToday && event.end.isBefore(now)) || undefined}
              gap="sm"
              style={{ '--stagger': index } as CSSProperties}
            >
              <Text className="workspace-calendar-slot-time" size="xs">
                {time.format(event.start.toDate())}
              </Text>
              {renderChip(event, true)}
            </Flex>
          </Fragment>
        ))}
        {isToday && timed.length > 0 && nowIndex === -1 && marker}
      </Stack>
    </Stack>
  )
}

function questEvent(
  id: string,
  title: string,
  day: string,
  workspaceId: string,
  view: 'encounters' | 'quests'
): WidgetEvent {
  const start = dayjs(day).startOf('day')

  return {
    id: `${view}:${id}`,
    title,
    start,
    end: start.add(1, 'day'),
    allDay: true,
    kind: 'quest',
    done: false,
    href: `/urpg?${new URLSearchParams({ workspace: workspaceId, view })}`
  }
}
