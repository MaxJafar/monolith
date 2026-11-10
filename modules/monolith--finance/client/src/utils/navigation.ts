import type { Granularity } from '../../../core/periods'

export const sections = [
  ['overview', 'tabler:layout-dashboard'],
  ['activity', 'tabler:list-details'],
  ['accounts', 'tabler:building-bank'],
  ['categories', 'tabler:category'],
  ['wishlist', 'tabler:gift'],
  ['plan', 'tabler:calendar-repeat'],
  ['taxes', 'tabler:receipt-tax'],
  ['settings', 'tabler:arrows-exchange']
] as const

export type Section = (typeof sections)[number][0]

const ids = new Set<string>(sections.map(([id]) => id))

export function getSection(value: string | null): Section {
  return value && ids.has(value) ? (value as Section) : 'overview'
}

export const granularities = ['week', 'month', 'year', 'all'] as const

export function getGranularity(value: string | null): Granularity {
  return (granularities as readonly string[]).includes(value ?? '')
    ? (value as Granularity)
    : 'month'
}

export function sectionParams(
  section: Section,
  extra: Record<string, string> = {},
  current?: URLSearchParams
) {
  const params = new URLSearchParams()

  // The workspace and period travel between sections; filters stay per section.
  for (const key of ['workspace', 'period', 'at'])
    if (current?.get(key)) params.set(key, current.get(key)!)
  if (section !== 'overview') params.set('section', section)
  for (const [key, value] of Object.entries(extra)) params.set(key, value)

  return params
}
