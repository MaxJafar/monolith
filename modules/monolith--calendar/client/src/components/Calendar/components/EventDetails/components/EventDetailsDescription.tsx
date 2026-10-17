import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import Markdown from 'react-markdown'
import { Link } from 'react-router'

import { useModuleTranslation } from '@monolith/localization'
import { Box, Button, Flex, Icon, Prose, Stack, Text } from '@monolith/ui'

import { workspaceAPI } from '@/manifest'

import type { CalendarEvent } from '../../..'

function EventDetailsDescription({ event }: { event: CalendarEvent }) {
  const { t } = useModuleTranslation()
  const calendarsQuery = useQuery(workspaceAPI.calendars.list.queryOptions())

  const eventIsWholeDay = useMemo(() => {
    return (
      event.all_day ||
      (dayjs(event.start).format('HH:mm') === '00:00' &&
        dayjs(event.end).format('HH:mm') === '00:00' &&
        dayjs(event.end).diff(dayjs(event.start), 'day') === 1)
    )
  }, [event.start, event.end, event.all_day])

  const eventTime = useMemo(() => {
    if (eventIsWholeDay) {
      return event.all_day
        ? `${dayjs(event.start).format('YYYY-MM-DD')} – ${dayjs(event.end).subtract(1, 'day').format('YYYY-MM-DD')} · ${t('filters.allDay')}`
        : t('filters.allDay')
    }

    return dayjs(event.end).diff(dayjs(event.start), 'day') > 1
      ? `${dayjs(event.start).format('YYYY-MM-DD h:mm A')} - ${dayjs(event.end).format('YYYY-MM-DD h:mm A')}`
      : `${dayjs(event.start).format('h:mm A')} - ${dayjs(event.end).format('h:mm A')}`
  }, [event.start, event.end, eventIsWholeDay, event.all_day, t])

  const eventCalendar = useMemo(() => {
    return calendarsQuery.data?.find(calendar => calendar.id === event.calendar)
  }, [calendarsQuery.data, event.calendar])

  return (
    <>
      <Stack gap="xs" mt="md">
        <Flex align="center" gap="sm">
          <Icon color="muted" icon="tabler:clock-hour-3" />
          <Text color="muted">{eventTime}</Text>
        </Flex>
        {event.location && (
          <Flex align="center" gap="sm">
            <Icon color="muted" icon="tabler:map-pin" />
            <Text color="muted">{event.location}</Text>
          </Flex>
        )}
        {event.source_name && (
          <Text color="muted" size="sm">
            {event.source_name}
          </Text>
        )}
        {eventCalendar && (
          <Flex align="center" gap="sm">
            <Icon color="muted" icon="tabler:calendar" />
            <Flex align="center" gap="sm">
              <Box
                height="0.4rem"
                r="md"
                style={{
                  backgroundColor: eventCalendar.color
                }}
                width="0.4rem"
              />
              <Text color="muted">{eventCalendar.name}</Text>
            </Flex>
          </Flex>
        )}
        {event.description && (
          <Prose className="calendar-prose" mt="lg" width="100%">
            <Markdown>{event.description}</Markdown>
          </Prose>
        )}
      </Stack>
      {event.reference_link && (
        <Button
          as={Link}
          icon="tabler:link"
          mt="lg"
          rel="noopener noreferrer"
          target={
            event.reference_link.startsWith('http') ? '_blank' : undefined
          }
          to={event.reference_link}
          variant="secondary"
          width="100%"
        >
          {event.source === 'database' ? 'Open Record' : 'View Reference'}
        </Button>
      )}
    </>
  )
}

export default EventDetailsDescription
