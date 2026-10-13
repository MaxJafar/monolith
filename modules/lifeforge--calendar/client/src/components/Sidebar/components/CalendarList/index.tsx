import { useQuery } from '@tanstack/react-query'

import { useModuleTranslation } from '@lifeforge/localization'
import {
  Button,
  Flex,
  SidebarItem,
  SidebarTitle,
  Stack,
  WithQuery,
  useModalStore
} from '@lifeforge/ui'

import ModifyCalendarModal from '@/components/modals/ModifyCalendarModal'
import useFilter from '@/hooks/useFilter'
import { forgeAPI } from '@/manifest'
import { type DatabaseFeed, toggleSelection } from '@/utils/calendarModel'

import CalendarListItem from './components/CalendarListItem'

export default function CalendarList({
  databaseSources
}: {
  databaseSources: DatabaseFeed['sources']
}) {
  const query = useQuery(forgeAPI.calendars.list.queryOptions())
  const { open } = useModalStore()
  const { t } = useModuleTranslation()
  const { selectedCalendars, setCalendars } = useFilter()

  const calendars = query.data ?? []
  const ids = [
    '',
    ...calendars.map(item => item.id),
    ...databaseSources.map(source => `db:${source.source_id}`)
  ]
  const toggle = (id: string) =>
    void setCalendars(toggleSelection(selectedCalendars, id, ids))
  const remove = (id: string) => {
    if (selectedCalendars !== null)
      void setCalendars(selectedCalendars.filter(entry => entry !== id))
  }

  return (
    <Stack as="section">
      <SidebarTitle
        actionButton={{
          icon: 'tabler:plus',
          onClick: () => open(ModifyCalendarModal, { type: 'create' })
        }}
        label="Calendars"
      />
      <Flex gap="xs" px="lg">
        <Button
          px="sm"
          py="xs"
          textProps={{ size: 'sm' }}
          variant="plain"
          onClick={() => void setCalendars(null)}
        >
          Select All
        </Button>
        <Button
          px="sm"
          py="xs"
          textProps={{ size: 'sm' }}
          variant="plain"
          onClick={() => void setCalendars([])}
        >
          Select None
        </Button>
      </Flex>
      <WithQuery query={query}>
        {entries => (
          <>
            {entries.map(item => (
              <CalendarListItem
                key={item.id}
                isSelected={
                  selectedCalendars === null ||
                  selectedCalendars.includes(item.id)
                }
                item={item}
                onCancelSelect={() => remove(item.id)}
                onSelect={() => toggle(item.id)}
              />
            ))}
          </>
        )}
      </WithQuery>
      <SidebarItem
        active={selectedCalendars === null || selectedCalendars.includes('')}
        icon="tabler:calendar-question"
        label={t('filters.unassignedCalendar')}
        namespace={false}
        onClick={() => toggle('')}
      />
      {databaseSources.length > 0 && (
        <SidebarTitle label={t('filters.databaseViews')} namespace={false} />
      )}
      {databaseSources.map(source => (
        <SidebarItem
          key={source.source_id}
          active={
            selectedCalendars === null ||
            selectedCalendars.includes(`db:${source.source_id}`)
          }
          icon="tabler:database"
          label={`${source.base_name} · ${source.name}`}
          namespace={false}
          onClick={() => toggle(`db:${source.source_id}`)}
        />
      ))}
    </Stack>
  )
}
