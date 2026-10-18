export function modulePath(name: string) {
  const stripped = name.replace(/^@[^/]+\//, '')
  const separator = stripped.indexOf('--')

  return '/' + (separator < 0 ? stripped : stripped.slice(separator + 2))
}

export function pathIsActive(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(path + '/')
}

function hasUnsafeRouteCharacters(value: string) {
  return (
    value.includes('\\') ||
    [...value].some(character => character.charCodeAt(0) < 32)
  )
}

/** Return to a local workspace route after sign-in, without redirect loops. */
export function workspaceRedirect(value: string | null) {
  if (
    !value ||
    !value.startsWith('/') ||
    /^\/[/\\]/.test(value) ||
    hasUnsafeRouteCharacters(value)
  )
    return '/dashboard'

  try {
    const target = new URL(value, 'https://monolith.invalid')
    const pathname = decodeURIComponent(target.pathname)

    if (
      target.origin !== 'https://monolith.invalid' ||
      pathname === '/' ||
      /^\/auth(?:\/|$)/i.test(pathname) ||
      hasUnsafeRouteCharacters(pathname)
    )
      return '/dashboard'

    return target.pathname + target.search + target.hash
  } catch {
    return '/dashboard'
  }
}

export function navigationMatches(query: string, ...labels: string[]) {
  const normalized = query.trim().toLocaleLowerCase()

  return (
    !normalized ||
    labels.some(label => label.toLocaleLowerCase().includes(normalized))
  )
}

export function sidebarShouldCloseOnEscape(
  event: Pick<KeyboardEvent, 'key' | 'defaultPrevented' | 'isComposing'>,
  expanded: boolean,
  viewportWidth: number
) {
  return (
    expanded &&
    viewportWidth <= 1000 &&
    event.key === 'Escape' &&
    !event.defaultPrevented &&
    !event.isComposing
  )
}
