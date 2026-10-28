import dayjs from 'dayjs'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { Box, HoverCard, Icon, Stack, Text, useHoverCard } from '@monolith/ui'

import { belongsToSystem } from '../../../../../../modules/monolith--databases/client/src/utils/systemViews'
import type {
  Field,
  RecordPage
} from '../../../../../../modules/monolith--databases/shared'
import { CalendarPreviewCard } from './CalendarPreviewCard'
import './calendarWidget.css'
import {
  type CalendarPreview,
  type WidgetEvent,
  recordEvents,
  sortEvents,
  useWidgetSchedules
} from './calendarWidgetModel'

// The agenda preview covers the same days the list draws from.
const horizon = 30

export function UpcomingEventsWidget({
  records,
  fields,
  workspaceId
}: {
  records: RecordPage[]
  fields: Field[]
  workspaceId: string
}) {
  const { t, i18n } = useTranslation('common', { keyPrefix: 'widgetSettings' })
  const { t: ui } = useTranslation('common.workspaceUI')

  const schedules = useWidgetSchedules(workspaceId),
    card = useHoverCard<CalendarPreview>()

  const today = dayjs().startOf('day').valueOf()

  const events = useMemo(
    () =>
      sortEvents(
        recordEvents(
          records.filter(item => belongsToSystem(item, 'calendar')),
          fields,
          schedules,
          dayjs(today),
          dayjs(today).add(horizon, 'day'),
          workspaceId
        )
      ),
    [records, fields, schedules, today, workspaceId]
  )
  const now = dayjs()
  const upcoming = events
    .filter(event => event.end.isAfter(now))
    .sort((a, b) => a.start.valueOf() - b.start.valueOf())
    .slice(0, 4)

  function when(event: WidgetEvent) {
    const start = event.start.isBefore(now) ? now : event.start
    const soon = start.diff(now.startOf('day'), 'day') < 7
    const options: Intl.DateTimeFormatOptions = soon
      ? { weekday: 'short' }
      : { month: 'short', day: 'numeric' }

    if (start.isSame(now, 'day'))
      return event.allDay || event.start.isBefore(now)
        ? t('today')
        : new Intl.DateTimeFormat(i18n.language, {
            hour: 'numeric',
            minute: '2-digit'
          }).format(event.start.toDate())

    return new Intl.DateTimeFormat(i18n.language, {
      ...options,
      ...(event.allDay ? {} : { hour: 'numeric', minute: '2-digit' })
    }).format(start.toDate())
  }

  return (
    <Stack className="workspace-upcoming" gap="none">
      {upcoming.map(event => (
        <Box
          key={event.id}
          as={Link}
          className="workspace-upcoming-row"
          data-done={event.done || undefined}
          data-kind={event.kind}
          to={event.href}
          {...card.trigger({ type: 'event', event })}
        >
          <Box aria-hidden className="workspace-calendar-swatch" />
          <Text truncate size="sm">
            {event.title || t('untitled')}
          </Text>
          <Text className="workspace-upcoming-when" size="xs">
            {when(event)}
          </Text>
        </Box>
      ))}
      {!upcoming.length && (
        <Text className="workspace-upcoming-empty" color="muted" size="sm">
          {ui('noEvents')}
        </Text>
      )}
      <Box
        as={Link}
        className="workspace-upcoming-row workspace-upcoming-all"
        to={`/calendar?${new URLSearchParams({ workspace: workspaceId })}`}
        {...card.trigger({ type: 'agenda' })}
      >
        <Icon aria-hidden icon="lucide:ellipsis" size="15px" />
        <Text size="sm">{ui('viewCalendar')}</Text>
      </Box>
      <HoverCard
        card={card}
        contentKey={
          card.preview?.type === 'event' ? card.preview.event.id : 'agenda'
        }
        label={t('calendarPreview')}
        width={card.preview?.type === 'agenda' ? 300 : 260}
      >
        {card.preview && (
          <CalendarPreviewCard events={events} preview={card.preview} />
        )}
      </HoverCard>
    </Stack>
  )
}
