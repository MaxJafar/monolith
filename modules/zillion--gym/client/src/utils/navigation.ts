export const GYM_SECTIONS = [
  'dashboard',
  'plan',
  'workout',
  'library',
  'history',
  'stats',
  'settings',
  'coach'
] as const

export type GymSection = (typeof GYM_SECTIONS)[number]

export function gymSection(value: string | null): GymSection {
  return GYM_SECTIONS.find(section => section === value) ?? 'dashboard'
}

export function gymSectionParams(
  section: string,
  extras: Record<string, string> = {}
) {
  const selected = gymSection(section)

  return new URLSearchParams({
    ...(selected === 'dashboard' ? {} : { section: selected }),
    ...extras
  })
}
