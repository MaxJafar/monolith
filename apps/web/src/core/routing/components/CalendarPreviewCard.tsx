import dayjs, { type Dayjs } from 'dayjs'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { Box, Flex, Stack, Text } from '@monolith/ui'

import {
  type CalendarPreview,
  type WidgetEvent,
  eventsOn,
  formatRange,
  timeRange
} from './calendarWidgetModel'

/** Hover card content shared by the calendar and upcoming events widgets. */
export function CalendarPreviewCard({
  preview,
  events,
  agendaDays = 5
}: {
  preview: CalendarPreview
  events: WidgetEvent[]
  agendaDays?: number
}) {
  if (preview.type === 'event') return <EventDetails event={preview.event} />
  if (preview.type === 'day')
    return <DayGroup day={dayjs(preview.day)} events={events} index={0} />

  const today = dayjs().startOf('day')
  const days = Array.from({ length: agendaDays }, (_, offset) =>
    today.add(offset, 'day')
  ).filter((day, offset) => offset === 0 || eventsOn(events, day).length > 0)

  return (
    <Stack className="workspace-calendar-agenda" gap="sm">
      {days.map((day, index) => (
        <DayGroup key={day.valueOf()} day={day} events={events} index={index} />
      ))}
    </Stack>
  )
}

function DayGroup({
  day,
  events,
  index
}: {
  day: Dayjs
  events: WidgetEvent[]
  index: number
}) {
  const { t, i18n } = useTranslation('common', { keyPrefix: 'widgetSettings' })

  const today = day.isSame(dayjs(), 'day')
  const now = dayjs()
  const items = eventsOn(events, day).filter(
    event => !today || event.allDay || event.end.isAfter(now)
  )

  return (
    <Flex
      data-stagger
      className="workspace-calendar-agenda-day"
      data-today={today || undefined}
      gap="md"
      style={{ '--stagger': index } as CSSProperties}
    >
      <Stack className="workspace-calendar-agenda-date" gap="none">
        <Text size="xs" weight="semibold">
          {today
            ? t('today')
            : new Intl.DateTimeFormat(i18n.language, {
                weekday: 'short'
              }).format(day.toDate())}
        </Text>
        <Text size="xs">
          {new Intl.DateTimeFormat(i18n.language, {
            month: 'short',
            day: 'numeric'
          }).format(day.toDate())}
        </Text>
      </Stack>
      <Stack className="workspace-calendar-agenda-events" gap="sm" minWidth="0">
        {items.length ? (
          items.map((event, position) => (
            <Box
              key={event.id}
              data-stagger
              as={Link}
              className="workspace-calendar-agenda-event"
              data-done={event.done || undefined}
              data-kind={event.kind}
              style={{ '--stagger': index + position + 1 } as CSSProperties}
              to={event.href}
            >
              <Text truncate size="sm" weight="medium">
                {event.title || t('untitled')}
              </Text>
              <Text color="muted" size="xs">
                {event.allDay ? t('allDay') : timeRange(event, i18n.language)}
              </Text>
            </Box>
          ))
        ) : (
          <Text color="muted" size="sm">
            {t(today ? 'noMoreEvents' : 'noEvents')}
          </Text>
        )}
      </Stack>
    </Flex>
  )
}

function EventDetails({ event }: { event: WidgetEvent }) {
  const { t, i18n } = useTranslation('common', { keyPrefix: 'widgetSettings' })

  const lastDay = event.allDay ? event.end.subtract(1, 'day') : event.end
  const date = new Intl.DateTimeFormat(i18n.language, {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  })

  return (
    <Stack
      className="workspace-calendar-details"
      data-kind={event.kind}
      gap="sm"
    >
      <Flex align="center" gap="sm">
        <Box className="workspace-calendar-swatch" />
        <Text color="muted" size="xs" weight="medium">
          {t(`eventKinds.${event.kind}`)}
        </Text>
        {event.done && (
          <Text className="workspace-calendar-done" size="xs">
            {t('done')}
          </Text>
        )}
      </Flex>
      <Text data-stagger size="base" weight="semibold">
        {event.title || t('untitled')}
      </Text>
      <Stack data-stagger gap="xs" style={{ '--stagger': 1 } as CSSProperties}>
        <Text size="sm">
          {lastDay.isAfter(event.start, 'day')
            ? formatRange(date, event.start.toDate(), lastDay.toDate())
            : date.format(event.start.toDate())}
        </Text>
        <Text color="muted" size="sm">
          {event.allDay ? t('allDay') : timeRange(event, i18n.language)}
        </Text>
      </Stack>
    </Stack>
  )
}
