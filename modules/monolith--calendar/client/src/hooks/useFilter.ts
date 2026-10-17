import dayjs from 'dayjs'
import {
  parseAsBoolean,
  parseAsString,
  parseAsStringEnum,
  useQueryState,
  useQueryStates
} from 'nuqs'

import {
  type Selection,
  type SmartFilters,
  readSelection,
  requestRange,
  viewRange,
  writeSelection
} from '@/utils/calendarModel'

export default function useFilter() {
  const [searchQuery, setSearchQuery] = useQueryState(
    'q',
    parseAsString.withDefault('')
  )
  const [filter, setFilter] = useQueryStates({
    category: parseAsString.withDefault(''),
    calendar: parseAsString.withDefault(''),
    categories: parseAsString,
    calendars: parseAsString,
    source: parseAsStringEnum([
      'all',
      'native',
      'ics',
      'module',
      'database'
    ] as const).withDefault('all'),
    type: parseAsStringEnum([
      'all',
      'single',
      'recurring'
    ] as const).withDefault('all'),
    from: parseAsString.withDefault(''),
    to: parseAsString.withDefault(''),
    upcoming: parseAsBoolean.withDefault(false),
    tag: parseAsString.withDefault(''),
    owner: parseAsString.withDefault(''),
    start: parseAsString,
    end: parseAsString,
    view: parseAsStringEnum([
      'month',
      'week',
      'work_week',
      'day',
      'agenda'
    ] as const).withDefault('month'),
    date: parseAsString.withDefault(dayjs().format('YYYY-MM-DD'))
  })

  function updateFilter<K extends keyof typeof filter>(
    keyOrUpdates: K | Partial<typeof filter>,
    value?: (typeof filter)[K]
  ) {
    return typeof keyOrUpdates === 'string'
      ? setFilter({ [keyOrUpdates]: value })
      : setFilter(keyOrUpdates)
  }

  const range = viewRange(
    filter.date,
    filter.view,
    dayjs().startOf('week').day()
  )
  const invalidRangeLink =
    (filter.start !== null || filter.end !== null) &&
    (!filter.start || !filter.end || !requestRange(filter.start, filter.end))

  const selectedCalendars = readSelection(filter.calendars, filter.calendar)
  const selectedCategories = readSelection(filter.categories, filter.category)
  const smartFilters: SmartFilters = {
    calendars: selectedCalendars,
    categories: selectedCategories,
    search: searchQuery,
    source: filter.source,
    type: filter.type,
    from: filter.from,
    to: filter.to,
    upcoming: filter.upcoming,
    tag: filter.tag,
    owner: filter.owner
  }
  const setCalendars = (value: Selection) =>
    setFilter({ calendars: writeSelection(value), calendar: null })
  const setCategories = (value: Selection) =>
    setFilter({ categories: writeSelection(value), category: null })
  const resetFilters = () => {
    void setSearchQuery(null)
    void setFilter({
      calendars: null,
      categories: null,
      calendar: null,
      category: null,
      source: null,
      type: null,
      from: null,
      to: null,
      upcoming: null,
      tag: null,
      owner: null
    })
  }

  return {
    searchQuery,
    setSearchQuery,
    ...filter,
    start: range?.start ?? '',
    end: range?.end ?? '',
    invalidRangeLink,
    updateFilter,
    selectedCalendars,
    selectedCategories,
    setCalendars,
    setCategories,
    smartFilters,
    resetFilters
  }
}
