export const sections = [
  'overview',
  'devices',
  'services',
  'health',
  'import'
] as const

export type Section = (typeof sections)[number]

export function getSection(value: string | null): Section {
  return sections.find(section => section === value) ?? 'overview'
}

export function sectionParams(
  section: Section,
  extras: Record<string, string> = {}
) {
  return new URLSearchParams({
    ...(section === 'overview' ? {} : { section }),
    ...extras
  })
}

export function safeWebUrl(value: string | null | undefined): string | null {
  if (!value) return null

  try {
    const url = new URL(value)

    return ['http:', 'https:'].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null
  } catch {
    return null
  }
}
