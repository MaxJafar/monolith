import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useEffect } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import {
  Box,
  Button,
  ContentWrapperWithSidebar,
  ContextMenuItem,
  FAB,
  Flex,
  LayoutWithSidebar,
  ModuleHeader,
  Scrollbar,
  Stack,
  Text,
  useModalStore
} from '@monolith/ui'

import { workspaceAPI } from '@/manifest'
import { civilDate, filterEvents, requestRange } from '@/utils/calendarModel'

import CalendarComponent from './components/Calendar'
import Sidebar from './components/Sidebar'
import SmartFilters from './components/SmartFilters'
import ModifyEventModal from './components/modals/ModifyEventModal'
import ScanImageModal from './components/modals/ScanImageModal'
import { useCalendarStore } from './hooks/useCalendarStore'
import useDatabaseCalendar from './hooks/useDatabaseCalendar'
import useFilter from './hooks/useFilter'
import { useInternalCategories } from './hooks/useInternalCategories'
import './index.css'

function CalendarModule() {
  const { open } = useModalStore()
  const { t } = useModuleTranslation()
  const filter = useFilter()

  const range = filter.invalidRangeLink
    ? null
    : requestRange(filter.start, filter.end)
  const fallback = requestRange(
    dayjs().startOf('month').format('YYYY-MM-DD'),
    dayjs().endOf('month').format('YYYY-MM-DD')
  )!
  const rawEventsQuery = useQuery({
    ...workspaceAPI.events.getByDateRange.input(range ?? fallback).queryOptions(),
    staleTime: 0,
    refetchOnWindowFocus: true,
    enabled: !!range
  })

  const calendars = useQuery(workspaceAPI.calendars.list.queryOptions())
  const categories = useQuery(workspaceAPI.categories.list.queryOptions())
  const { values: internalCategories } = useInternalCategories()
  const database = useDatabaseCalendar()

  const allEvents = [...(rawEventsQuery.data ?? []), ...database.events]
  const events = range
    ? filterEvents(allEvents, filter.smartFilters, new Date(), range)
    : []
  const total = range
    ? filterEvents(
        allEvents,
        {
          ...filter.smartFilters,
          calendars: null,
          categories: null,
          search: '',
          source: 'all',
          type: 'all',
          from: '',
          to: '',
          upcoming: false,
          tag: '',
          owner: ''
        },
        new Date(),
        range
      ).length
    : 0
  const sources = database.feed.data?.sources ?? []
  const calendarNames = Object.fromEntries([
    ['', t('filters.unassignedCalendar')],
    ...(calendars.data ?? []).map(calendar => [calendar.id, calendar.name]),
    ...sources.map(source => [
      `db:${source.source_id}`,
      `${source.base_name} · ${source.name}`
    ])
  ])
  const categoryNames = Object.fromEntries([
    ['', t('filters.unassignedCategory')],
    ...(categories.data ?? []).map(category => [category.id, category.name]),
    ...internalCategories.map(category => [category.id, category.name])
  ])
  const loading =
    rawEventsQuery.isFetching ||
    (database.available && database.feed.isFetching)
  useEffect(() => {
    useCalendarStore.getState().setIsEventLoading(loading)
  }, [loading])
  const initialData = {
    type: 'single' as const,
    calendar:
      filter.selectedCalendars?.length === 1 &&
      !filter.selectedCalendars[0]!.startsWith('db:')
        ? filter.selectedCalendars[0]
        : undefined,
    category:
      filter.selectedCategories?.length === 1 &&
      !filter.selectedCategories[0]!.startsWith('_')
        ? filter.selectedCategories[0]
        : undefined
  }
  const unscheduled = sources.reduce(
    (count, source) => count + source.unscheduled_count,
    0
  )

  return (
    <>
      <ModuleHeader />
      <LayoutWithSidebar>
        <Sidebar databaseEvents={database.events} databaseSources={sources} />
        <ContentWrapperWithSidebar>
          <Scrollbar>
            <Box height="100%" pb="xl" pr="md" width="100%">
              <SmartFilters
                calendarNames={calendarNames}
                categoryNames={categoryNames}
                events={allEvents}
                people={database.people.data ?? []}
                shown={events.length}
                total={total}
              />
              <Stack gap="sm" mb="md" role="status">
                {(!range || !civilDate(filter.date)) && (
                  <Flex align="center" gap="sm">
                    <Text color="dangerous">{t('filters.invalidRange')}</Text>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        void filter.updateFilter({
                          start: dayjs().startOf('month').format('YYYY-MM-DD'),
                          end: dayjs().endOf('month').format('YYYY-MM-DD'),
                          date: dayjs().format('YYYY-MM-DD')
                        })
                      }
                    >
                      Today
                    </Button>
                  </Flex>
                )}
                {rawEventsQuery.isError && (
                  <Flex align="center" gap="sm" role="alert">
                    <Text color="dangerous">
                      {t('filters.eventsError')} {rawEventsQuery.error.message}
                    </Text>
                    <Button
                      variant="secondary"
                      onClick={() => void rawEventsQuery.refetch()}
                    >
                      Retry
                    </Button>
                  </Flex>
                )}
                {database.federationError && (
                  <Text color="dangerous" role="alert">
                    {t('filters.databaseError')}{' '}
                    {database.federationError.message}
                  </Text>
                )}
                {!database.loading && !database.installed && (
                  <Text color="muted" size="sm">
                    {t('filters.databaseUnavailable')}
                  </Text>
                )}
                {database.manifestError && (
                  <Flex align="center" gap="sm" role="alert">
                    <Text color="dangerous">
                      {t('filters.databaseError')}{' '}
                      {database.manifestError.message}
                    </Text>
                    <Button
                      variant="secondary"
                      onClick={database.retryManifest}
                    >
                      Retry
                    </Button>
                  </Flex>
                )}
                {database.installed &&
                  !database.loading &&
                  !database.available &&
                  !database.manifestError && (
                    <Flex align="center" gap="sm" role="alert">
                      <Text color="dangerous">
                        {t('filters.databaseIncompatible')}
                      </Text>
                      <Button
                        variant="secondary"
                        onClick={database.retryManifest}
                      >
                        Retry
                      </Button>
                    </Flex>
                  )}
                {((database.installed && database.loading) ||
                  (database.available && database.feed.isPending)) && (
                  <Text color="muted" size="sm">
                    {t('filters.databaseLoading')}
                  </Text>
                )}
                {(database.feed.isError || database.modelError) && (
                  <Flex align="center" gap="sm" role="alert">
                    <Text color="dangerous">
                      {t('filters.databaseError')}{' '}
                      {database.modelError?.message ??
                        database.feed.error?.message}
                    </Text>
                    <Button
                      variant="secondary"
                      onClick={() => void database.feed.refetch()}
                    >
                      Retry
                    </Button>
                  </Flex>
                )}
                {database.people.isError && (
                  <Flex align="center" gap="sm" role="alert">
                    <Text color="dangerous">
                      {t('filters.peopleError')} {database.people.error.message}
                    </Text>
                    <Button
                      variant="secondary"
                      onClick={() => void database.people.refetch()}
                    >
                      Retry
                    </Button>
                  </Flex>
                )}
                {database.feed.isSuccess && sources.length === 0 && (
                  <Text color="muted" size="sm">
                    {t('filters.noDatabaseViews')}
                  </Text>
                )}
                {unscheduled > 0 && (
                  <Text color="muted" size="sm">
                    {t('filters.unscheduled', { count: unscheduled })}
                  </Text>
                )}
              </Stack>
              <CalendarComponent events={events} />
            </Box>
          </Scrollbar>
        </ContentWrapperWithSidebar>
      </LayoutWithSidebar>
      <FAB visibilityBreakpoint="md">
        <ContextMenuItem
          icon="tabler:photo"
          label="Scan from Image"
          onClick={() => open(ScanImageModal, {})}
        />
        <ContextMenuItem
          icon="tabler:plus"
          label="Input Manually"
          onClick={() =>
            open(ModifyEventModal, { type: 'create', initialData })
          }
        />
      </FAB>
    </>
  )
}

export default CalendarModule
