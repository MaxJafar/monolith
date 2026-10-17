export type Selection = string[] | null

export type EventSource = 'native' | 'ics' | 'module' | 'database'

export interface FilterableEvent {
  id: string
  title: string
  description: string
  location: string
  calendar: string
  category: string
  type: 'single' | 'recurring'
  start: string
  end: string
  source?: EventSource
  source_name?: string
  tags?: string[]
  owners?: string[]
  all_day?: boolean
  native_event_id?: string
  canonical_record_id?: string
}

export interface SmartFilters {
  calendars: Selection
  categories: Selection
  search: string
  source: EventSource | 'all'
  type: 'single' | 'recurring' | 'all'
  from: string
  to: string
  upcoming: boolean
  tag: string
  owner: string
}

export function readSelection(value: string | null, legacy = ''): Selection {
  if (value === null) return legacy ? [legacy] : null

  try {
    const parsed: unknown = JSON.parse(value)

    return Array.isArray(parsed) && parsed.every(id => typeof id === 'string')
      ? [...new Set(parsed)]
      : []
  } catch {
    return []
  }
}

export function writeSelection(value: Selection): string | null {
  return value === null ? null : JSON.stringify([...new Set(value)])
}

export function toggleSelection(
  value: Selection,
  id: string,
  available: string[]
) {
  const selected = value === null ? [...new Set(available)] : value

  return selected.includes(id)
    ? selected.filter(entry => entry !== id)
    : [...selected, id]
}

/** Civil dates are parsed in the browser's zone, never as UTC midnight. */
export function civilDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null

  const [year, month, day] = value.split('-').map(Number)
  const result = new Date(0)
  result.setFullYear(year!, month! - 1, day)
  result.setHours(0, 0, 0, 0)

  return result.getFullYear() === year &&
    result.getMonth() === month! - 1 &&
    result.getDate() === day
    ? result
    : null
}

export function localDay(value: Date) {
  return `${String(value.getFullYear()).padStart(4, '0')}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

export type CalendarView = 'month' | 'week' | 'work_week' | 'day' | 'agenda'

/** Match the visible react-big-calendar civil days, including month spillover. */
export function viewRange(value: string, view: CalendarView, firstWeekday = 0) {
  const date = civilDate(value)

  if (!date) return null

  const start = new Date(date)
  const end = new Date(date)
  const weekStart = (day: Date) =>
    day.setDate(day.getDate() - ((day.getDay() - firstWeekday + 7) % 7))

  if (view === 'month') {
    start.setDate(1)
    weekStart(start)
    end.setMonth(end.getMonth() + 1, 0)
    end.setDate(end.getDate() + ((firstWeekday + 6 - end.getDay() + 7) % 7))
  } else if (view === 'week' || view === 'work_week') {
    weekStart(start)
    end.setTime(start.getTime())
    end.setDate(end.getDate() + 6)

    if (view === 'work_week') {
      while (start.getDay() === 0 || start.getDay() === 6)
        start.setDate(start.getDate() + 1)
      while (end.getDay() === 0 || end.getDay() === 6)
        end.setDate(end.getDate() - 1)
    }
  } else if (view === 'agenda') end.setDate(end.getDate() + 30)

  return { start: localDay(start), end: localDay(end) }
}

export function requestRange(start: string, end: string) {
  const from = civilDate(start)
  const to = civilDate(end)

  if (!from || !to || to < from) return null
  to.setHours(23, 59, 59, 999)
  if (to.getTime() - from.getTime() > 366 * 86400000) return null

  return { start: from.toISOString(), end: to.toISOString() }
}

export function eventSource(event: FilterableEvent): EventSource {
  return (
    event.source ??
    (event.id.startsWith('ical-')
      ? 'ics'
      : event.category.startsWith('_')
        ? 'module'
        : 'native')
  )
}

export function canReschedule(event: FilterableEvent) {
  return event.type === 'single' && eventSource(event) === 'native'
}

export function filterEvents<T extends FilterableEvent>(
  events: T[],
  filters: SmartFilters,
  now = new Date(),
  visible?: { start: string; end: string }
): T[] {
  const lower = filters.from ? civilDate(filters.from) : null
  const upper = filters.to ? civilDate(filters.to) : null

  if (
    (filters.from && !lower) ||
    (filters.to && !upper) ||
    (lower && upper && upper < lower)
  )
    return []
  upper?.setHours(23, 59, 59, 999)
  const query = filters.search.trim().toLocaleLowerCase()

  const filtered = events.filter(event => {
    const start = new Date(event.start).getTime()
    const end = new Date(event.end).getTime()

    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start)
      return false

    const overlaps = (from: number, to: number) =>
      start <= to && (event.all_day ? end > from : end >= from)

    return (
      (filters.calendars === null ||
        filters.calendars.includes(event.calendar)) &&
      (filters.categories === null ||
        filters.categories.includes(event.category)) &&
      (filters.source === 'all' || eventSource(event) === filters.source) &&
      (filters.type === 'all' || event.type === filters.type) &&
      (!query ||
        [
          event.title,
          event.description,
          event.location,
          event.source_name,
          ...(event.tags ?? [])
        ]
          .join(' ')
          .toLocaleLowerCase()
          .includes(query)) &&
      (!lower || overlaps(lower.getTime(), Infinity)) &&
      (!upper || overlaps(-Infinity, upper.getTime())) &&
      (!filters.upcoming || end >= now.getTime()) &&
      (!filters.tag || event.tags?.includes(filters.tag)) &&
      (!filters.owner || event.owners?.includes(filters.owner)) &&
      (!visible ||
        overlaps(
          new Date(visible.start).getTime(),
          new Date(visible.end).getTime()
        ))
    )
  })
  const native = new Set(
    filtered
      .filter(event => eventSource(event) === 'native')
      .map(event => event.id)
  )
  const seen = new Set<string>()
  return filtered.filter(event => {
    if (eventSource(event) !== 'database') return true
    if (event.native_event_id && native.has(event.native_event_id)) return false
    const identity = event.canonical_record_id ?? event.id
    if (seen.has(identity)) return false
    seen.add(identity)
    return true
  })
}

export interface DatabaseFeed {
  sources: {
    source_id: string
    view_id: string
    base_id: string
    name: string
    base_name: string
    unscheduled_count: number
  }[]
  items: {
    id: string
    record_id: string
    title: string
    start: string
    end: string
    source_id: string
    tags: string[]
    owners: string[]
    href: string
    native_event_id?: string
  }[]
}

export function databaseEvents(feed: DatabaseFeed) {
  return feed.items.map(item => {
    const start = civilDate(item.start)
    const end = civilDate(item.end)

    if (!start || !end || end < start)
      throw new Error('Database calendar returned an invalid date range')
    end.setDate(end.getDate() + 1)
    const source = feed.sources.find(
      source => source.source_id === item.source_id
    )

    if (!source) throw new Error('Database calendar returned an unknown source')

    return {
      id: `db:${item.id}`,
      type: 'single' as const,
      title: item.title,
      start: start.toISOString(),
      end: end.toISOString(),
      calendar: `db:${item.source_id}`,
      category: '_databases',
      description: '',
      location: '',
      location_coords: { lat: 0, lon: 0 },
      reference_link: item.href,
      source: 'database' as const,
      source_name: `${source.base_name} · ${source.name}`,
      tags: item.tags,
      owners: item.owners,
      all_day: true,
      native_event_id: item.native_event_id,
      canonical_record_id: item.record_id
    }
  })
}
