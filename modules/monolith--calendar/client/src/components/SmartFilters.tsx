import { useModuleTranslation } from '@monolith/localization'
import {
  Box,
  Button,
  Checkbox,
  DateInput,
  Flex,
  ListboxInput,
  ListboxOption,
  SearchInput,
  Stack,
  Text
} from '@monolith/ui'

import useFilter from '@/hooks/useFilter'
import {
  type FilterableEvent,
  civilDate,
  localDay
} from '@/utils/calendarModel'

export default function SmartFilters({
  events,
  people,
  shown,
  total,
  calendarNames,
  categoryNames
}: {
  events: FilterableEvent[]
  people: { id: string; label: string }[]
  shown: number
  total: number
  calendarNames: Record<string, string>
  categoryNames: Record<string, string>
}) {
  const { t } = useModuleTranslation()
  const filter = useFilter()

  const tags = [...new Set(events.flatMap(event => event.tags ?? []))].sort()
  const owners = [...new Set(events.flatMap(event => event.owners ?? []))]
  const ownerName = (id: string) =>
    people.find(person => person.id === id)?.label ?? id
  const active: { label: string; clear: () => void }[] = []
  const selectionLabel = (ids: string[], names: Record<string, string>) =>
    ids.length ? ids.map(id => names[id] ?? id).join(', ') : t('filters.none')

  if (filter.searchQuery)
    active.push({
      label: `${t('filters.search')}: ${filter.searchQuery}`,
      clear: () => void filter.setSearchQuery(null)
    })
  if (filter.selectedCalendars !== null)
    active.push({
      label: `${t('sidebar.calendars')}: ${selectionLabel(filter.selectedCalendars, calendarNames)}`,
      clear: () => void filter.setCalendars(null)
    })
  if (filter.selectedCategories !== null)
    active.push({
      label: `${t('sidebar.categories')}: ${selectionLabel(filter.selectedCategories, categoryNames)}`,
      clear: () => void filter.setCategories(null)
    })
  if (filter.source !== 'all')
    active.push({
      label: t(`filters.sources.${filter.source}`),
      clear: () => void filter.updateFilter('source', 'all')
    })
  if (filter.type !== 'all')
    active.push({
      label: t(`eventTypes.${filter.type}`),
      clear: () => void filter.updateFilter('type', 'all')
    })
  if (filter.from)
    active.push({
      label: `${t('filters.from')}: ${filter.from}`,
      clear: () => void filter.updateFilter('from', '')
    })
  if (filter.to)
    active.push({
      label: `${t('filters.to')}: ${filter.to}`,
      clear: () => void filter.updateFilter('to', '')
    })
  if (filter.upcoming)
    active.push({
      label: t('filters.upcoming'),
      clear: () => void filter.updateFilter('upcoming', false)
    })
  if (filter.tag)
    active.push({
      label: `${t('filters.tag')}: ${filter.tag}`,
      clear: () => void filter.updateFilter('tag', '')
    })
  if (filter.owner)
    active.push({
      label: `${t('filters.owner')}: ${ownerName(filter.owner)}`,
      clear: () => void filter.updateFilter('owner', '')
    })

  const invalidDate =
    (filter.from && !civilDate(filter.from)) ||
    (filter.to && !civilDate(filter.to)) ||
    (filter.from && filter.to && filter.from > filter.to)

  return (
    <Stack gap="sm" mb="lg">
      <Flex align="center" gap="sm" wrap="wrap">
        <Box flex="1" minWidth="14rem">
          <SearchInput
            searchTarget="calendarItems"
            value={filter.searchQuery}
            onChange={value => void filter.setSearchQuery(value)}
          />
        </Box>
        <Text color="muted" size="sm">
          {t('filters.count', { shown, total })}
        </Text>
        <Button
          icon="tabler:filter-off"
          variant="tertiary"
          onClick={filter.resetFilters}
        >
          Reset Filters
        </Button>
      </Flex>
      <Flex gap="sm" wrap="wrap">
        <Box flex="1" minWidth="11rem">
          <ListboxInput
            icon="tabler:layers-intersect"
            label="Source"
            renderContent={value => (
              <Text truncate>{t(`filters.sources.${value}`)}</Text>
            )}
            value={filter.source}
            onChange={value => void filter.updateFilter('source', value)}
          >
            {(['all', 'native', 'ics', 'module', 'database'] as const).map(
              value => (
                <ListboxOption
                  key={value}
                  label={t(`filters.sources.${value}`)}
                  value={value}
                />
              )
            )}
          </ListboxInput>
        </Box>
        <Box flex="1" minWidth="11rem">
          <ListboxInput
            icon="tabler:repeat"
            label="Event Type"
            renderContent={value => (
              <Text truncate>
                {value === 'all' ? t('filters.all') : t(`eventTypes.${value}`)}
              </Text>
            )}
            value={filter.type}
            onChange={value => void filter.updateFilter('type', value)}
          >
            {(['all', 'single', 'recurring'] as const).map(value => (
              <ListboxOption
                key={value}
                label={
                  value === 'all' ? t('filters.all') : t(`eventTypes.${value}`)
                }
                value={value}
              />
            ))}
          </ListboxInput>
        </Box>
        <Box flex="1" minWidth="11rem">
          <DateInput
            icon="tabler:calendar"
            label="From"
            value={civilDate(filter.from)}
            onChange={value =>
              void filter.updateFilter('from', value ? localDay(value) : '')
            }
          />
        </Box>
        <Box flex="1" minWidth="11rem">
          <DateInput
            icon="tabler:calendar"
            label="To"
            value={civilDate(filter.to)}
            onChange={value =>
              void filter.updateFilter('to', value ? localDay(value) : '')
            }
          />
        </Box>
        {tags.length > 0 && (
          <Box flex="1" minWidth="11rem">
            <ListboxInput
              icon="tabler:tag"
              label="Tag"
              renderContent={value => (
                <Text truncate>{value || t('filters.all')}</Text>
              )}
              value={filter.tag}
              onChange={value => void filter.updateFilter('tag', value)}
            >
              <ListboxOption label={t('filters.all')} value="" />
              {tags.map(tag => (
                <ListboxOption key={tag} label={tag} value={tag} />
              ))}
            </ListboxInput>
          </Box>
        )}
        {owners.length > 0 && (
          <Box flex="1" minWidth="11rem">
            <ListboxInput
              icon="tabler:user"
              label="Owner"
              renderContent={value => (
                <Text truncate>
                  {value ? ownerName(value) : t('filters.all')}
                </Text>
              )}
              value={filter.owner}
              onChange={value => void filter.updateFilter('owner', value)}
            >
              <ListboxOption label={t('filters.all')} value="" />
              {owners.map(owner => (
                <ListboxOption
                  key={owner}
                  label={ownerName(owner)}
                  value={owner}
                />
              ))}
            </ListboxInput>
          </Box>
        )}
      </Flex>
      <Checkbox
        checked={filter.upcoming}
        label={t('filters.upcoming')}
        onCheckedChange={value => void filter.updateFilter('upcoming', value)}
      />
      {(tags.length > 0 || owners.length > 0) && (
        <Text color="muted" size="xs">
          {t('filters.smartPropertiesHint')}
        </Text>
      )}
      {invalidDate && (
        <Text color="dangerous" role="alert">
          {t('filters.invalidDates')}
        </Text>
      )}
      {active.length > 0 && (
        <Flex
          align="center"
          aria-label={t('filters.active')}
          gap="xs"
          wrap="wrap"
        >
          <Text color="muted" size="sm">
            {t('filters.activeCount', { count: active.length })}
          </Text>
          {active.map((entry, index) => (
            <Button
              key={index}
              icon="tabler:x"
              namespace={false}
              px="sm"
              py="xs"
              textProps={{ size: 'sm' }}
              variant="secondary"
              onClick={entry.clear}
            >
              {entry.label}
            </Button>
          ))}
        </Flex>
      )}
    </Stack>
  )
}
