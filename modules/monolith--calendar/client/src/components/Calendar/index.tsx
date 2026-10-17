import { useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useCallback, useMemo, useState } from 'react'
import {
  Calendar,
  type Components,
  type View,
  dayjsLocalizer
} from 'react-big-calendar'
import type withDragAndDropType from 'react-big-calendar/lib/addons/dragAndDrop'
import dragAndDropModule, {
  type EventInteractionArgs
} from 'react-big-calendar/lib/addons/dragAndDrop'

import type { InferOutput } from '@monolith/api'
import { useModuleTranslation } from '@monolith/localization'
import { Box, Text, useModalStore } from '@monolith/ui'

import useFilter from '@/hooks/useFilter'
import { workspaceAPI } from '@/manifest'
import {
  type EventSource,
  canReschedule,
  civilDate,
  requestRange
} from '@/utils/calendarModel'

import ModifyEventModal from '../modals/ModifyEventModal'
import AgendaDate from './components/AgendaView/AgendaDate'
import AgendaEventItem from './components/AgendaView/AgendaEventItem'
import EventItem from './components/EventItem'
import CalendarHeader from './components/Headers/CalendarHeader'
import WeekHeader from './components/Headers/WeekHeader'

export type CalendarEvent = InferOutput<
  typeof workspaceAPI.events.getByDateRange
>[number] & {
  source?: EventSource
  source_name?: string
  tags?: string[]
  owners?: string[]
  all_day?: boolean
}

export type CalendarCategory = InferOutput<
  typeof workspaceAPI.categories.list
>[number]

export type CalendarCalendar = InferOutput<
  typeof workspaceAPI.calendars.list
>[number]

const localizer = dayjsLocalizer(dayjs)

const dragAndDropModuleUnknown = dragAndDropModule as unknown as {
  default?: {
    default?: unknown
  }
}

const withDragAndDrop = (dragAndDropModuleUnknown.default?.default ||
  dragAndDropModuleUnknown.default ||
  dragAndDropModule) as typeof withDragAndDropType

const DnDCalendar = withDragAndDrop<CalendarEvent>(Calendar<CalendarEvent>)

function CalendarComponent({ events }: { events: CalendarEvent[] }) {
  const { open } = useModalStore()
  const { t } = useModuleTranslation()
  const [mutationError, setMutationError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const {
    start,
    end,
    view,
    date,
    updateFilter,
    selectedCalendars,
    selectedCategories
  } = useFilter()

  const calendarDate = useMemo(() => civilDate(date) ?? new Date(), [date])

  const handleNavigate = useCallback(
    (newDate: Date) => {
      updateFilter('date', dayjs(newDate).format('YYYY-MM-DD'))
    },
    [updateFilter]
  )
  const handleView = useCallback(
    (newView: View) => {
      updateFilter('view', newView)
    },
    [updateFilter]
  )

  const handleDateRangeChange = useCallback(
    (
      range:
        | Date[]
        | {
            start: Date
            end: Date
          }
    ) => {
      if (Array.isArray(range)) {
        if (!range.length) return

        const startVal = dayjs(range[0]).format('YYYY-MM-DD')
        const endVal = dayjs(range[range.length - 1]).format('YYYY-MM-DD')
        updateFilter({ start: startVal, end: endVal })

        return
      }

      {
        const startVal = dayjs(range.start).format('YYYY-MM-DD')
        const endVal = dayjs(range.end).format('YYYY-MM-DD')
        updateFilter({ start: startVal, end: endVal })
      }
    },
    [updateFilter]
  )

  const calendarComponents = useMemo(
    (): Components<CalendarEvent> => ({
      toolbar: CalendarHeader,
      event: ({ event }) => {
        return <EventItem event={event} />
      },
      week: {
        header: WeekHeader
      },
      agenda: {
        date: AgendaDate,
        event: ({ event }) => <AgendaEventItem event={event} />
      }
    }),
    []
  )

  const updateEvent = useCallback(
    async ({
      event,
      start: nextStart,
      end: nextEnd
    }: EventInteractionArgs<CalendarEvent>) => {
      if (!canReschedule(event)) return
      setMutationError(null)

      const range = requestRange(start, end)

      if (!range) return

      const key = workspaceAPI.events.getByDateRange.input(range).key
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<CalendarEvent[]>(key)
      const updates = {
        start: dayjs(nextStart).toISOString(),
        end: dayjs(nextEnd).toISOString()
      }
      queryClient.setQueryData<CalendarEvent[]>(key, entries =>
        entries?.map(entry =>
          entry.id === event.id ? { ...entry, ...updates } : entry
        )
      )

      try {
        await workspaceAPI.events.reschedule.input({ id: event.id }).mutate(updates)
      } catch (failure) {
        if (previous) queryClient.setQueryData(key, previous)
        setMutationError(
          failure instanceof Error
            ? failure.message
            : t('filters.rescheduleError')
        )
      } finally {
        await queryClient.invalidateQueries({
          queryKey: workspaceAPI.events.getByDateRange.key
        })
      }
    },
    [queryClient, start, end, t]
  )

  const handleSelectSlot = useCallback(
    ({ start, end }: { start: Date; end: Date }) => {
      open(ModifyEventModal, {
        type: 'create',
        initialData: {
          type: 'single',
          start: start.toISOString(),
          end: end.toISOString(),
          calendar:
            selectedCalendars?.length === 1 &&
            !selectedCalendars[0]!.startsWith('db:')
              ? selectedCalendars[0]
              : undefined,
          category:
            selectedCategories?.length === 1 &&
            !selectedCategories[0]!.startsWith('_')
              ? selectedCategories[0]
              : undefined
        }
      })
    },
    [open, selectedCalendars, selectedCategories]
  )

  const handleEventChange = useCallback(
    (e: EventInteractionArgs<CalendarEvent>) => {
      updateEvent(e).catch(console.error)
    },
    [updateEvent]
  )

  const draggableAccessor = useCallback((event: CalendarEvent) => {
    return canReschedule(event)
  }, [])

  return (
    <Box height="70vh" minHeight="40rem">
      {mutationError && (
        <Text color="dangerous" mb="md" role="alert">
          {t('filters.rescheduleError')} {mutationError}
        </Text>
      )}
      <DnDCalendar
        selectable
        allDayAccessor={event => event.all_day ?? false}
        components={calendarComponents}
        date={calendarDate}
        draggableAccessor={draggableAccessor}
        endAccessor={event => dayjs(event.end).toDate()}
        events={events}
        localizer={localizer}
        startAccessor={event => dayjs(event.start).toDate()}
        view={view}
        views={['month', 'week', 'work_week', 'day', 'agenda']}
        onEventDrop={handleEventChange}
        onEventResize={handleEventChange}
        onNavigate={handleNavigate}
        onRangeChange={handleDateRangeChange}
        onSelectSlot={handleSelectSlot}
        onView={handleView}
      />
    </Box>
  )
}

export default CalendarComponent
