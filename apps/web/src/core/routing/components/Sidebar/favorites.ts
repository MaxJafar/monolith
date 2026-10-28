import { type SystemArea, systemAreas, systemOrder } from './systemAreas'

export type FavoriteWidget = {
  type: 'widget'
  id: string
  collapsed: boolean
  filter: string
}

export type Favorite =
  | { type: 'area'; id: SystemArea }
  | { type: 'page'; id: string }
  | { type: 'addon'; id: string }
  | FavoriteWidget

export type FavoriteType = Favorite['type']

/** Identifies a favourite; page and addon keys match navigation item keys. */
export type FavoriteRef = { type: FavoriteType; id: string }

export const favoriteLimit = 40

export const widgetLimit = 8

export const favoriteKey = (item: FavoriteRef) => `${item.type}:${item.id}`

const isArea = (id: unknown): id is SystemArea =>
  typeof id === 'string' &&
  Object.prototype.hasOwnProperty.call(systemAreas, id)

const isId = (id: unknown): id is string =>
  typeof id === 'string' && id.length > 0 && id.length < 100

function favorite(value: unknown): Favorite | null {
  if (!value || typeof value !== 'object') return null

  const { type, id, collapsed, filter } = value as Record<string, unknown>

  if (type === 'area') return isArea(id) ? { type, id } : null
  if (!isId(id)) return null
  if (type === 'page' || type === 'addon') return { type, id }
  if (type === 'widget')
    return {
      type,
      id,
      collapsed: collapsed === true,
      filter: typeof filter === 'string' ? filter.slice(0, 2000) : ''
    }

  return null
}

/** Validates stored favourites, discarding duplicates and anything over the caps. */
export function parseFavorites(value: unknown): Favorite[] {
  const result: Favorite[] = [],
    seen = new Set<string>()

  let widgets = 0

  for (const entry of Array.isArray(value) ? value : []) {
    const item = favorite(entry)

    if (!item || seen.has(favoriteKey(item))) continue
    if (item.type === 'widget' && widgets >= widgetLimit) continue
    seen.add(favoriteKey(item))
    if (item.type === 'widget') widgets++
    result.push(item)
    if (result.length >= favoriteLimit) break
  }

  return result
}

/**
 * Favourites replaced the fixed area list and the separate widget list. Stored
 * preferences without favourites keep their visible areas, in their saved
 * order, followed by their pinned widgets.
 */
export function migrateFavorites(data: Record<string, unknown>): Favorite[] {
  if (Array.isArray(data.favorites)) return parseFavorites(data.favorites)

  const hidden = new Set(
    Array.isArray(data.hiddenAreas) ? data.hiddenAreas : []
  )

  return parseFavorites([
    ...systemOrder(data.areaOrder)
      .filter(id => !hidden.has(id))
      .map(id => ({ type: 'area', id })),
    ...(Array.isArray(data.widgets) ? data.widgets : []).map(widget =>
      widget && typeof widget === 'object'
        ? { ...widget, type: 'widget' }
        : widget
    )
  ])
}

export const hasFavorite = (list: Favorite[], item: FavoriteRef) =>
  list.some(value => favoriteKey(value) === favoriteKey(item))

export const widgetCount = (list: Favorite[]) =>
  list.filter(item => item.type === 'widget').length

export const canAddFavorite = (list: Favorite[], type: FavoriteType) =>
  list.length < favoriteLimit &&
  (type !== 'widget' || widgetCount(list) < widgetLimit)

/** Adds an item before `before`, or at the end. Existing items stay in place. */
export function addFavorite(
  list: Favorite[],
  item: Favorite,
  before: string | null = null
): Favorite[] {
  if (hasFavorite(list, item) || !canAddFavorite(list, item.type)) return list

  const index = before
    ? list.findIndex(value => favoriteKey(value) === before)
    : -1

  return index < 0
    ? [...list, item]
    : [...list.slice(0, index), item, ...list.slice(index)]
}

export function removeFavorite(list: Favorite[], key: string): Favorite[] {
  return list.some(item => favoriteKey(item) === key)
    ? list.filter(item => favoriteKey(item) !== key)
    : list
}

export function toggleFavorite(list: Favorite[], item: Favorite): Favorite[] {
  return hasFavorite(list, item)
    ? removeFavorite(list, favoriteKey(item))
    : addFavorite(list, item)
}

/**
 * Moves `from` into the position held by `to`: it lands before an item above
 * it and after an item below it, matching drag and arrow-key reordering. A
 * null target moves it to the end.
 */
export function moveFavorite(
  list: Favorite[],
  from: string,
  to: string | null
): Favorite[] {
  const source = list.findIndex(item => favoriteKey(item) === from),
    target = to ? list.findIndex(item => favoriteKey(item) === to) : -1

  if (source < 0 || from === to || (to && target < 0)) return list

  const result = list.filter((_, index) => index !== source)

  result.splice(to ? target : result.length, 0, list[source]!)

  return result.every((item, index) => item === list[index]) ? list : result
}

/** Moves `from` directly before `before`, or to the end. */
export function moveFavoriteBefore(
  list: Favorite[],
  from: string,
  before: string | null
): Favorite[] {
  const item = list.find(value => favoriteKey(value) === from)

  if (!item || from === before) return list

  const result = addFavorite(removeFavorite(list, from), item, before)

  return result.every((value, index) => value === list[index]) ? list : result
}

export function updateWidgetFavorite(
  list: Favorite[],
  id: string,
  patch: Partial<Pick<FavoriteWidget, 'collapsed' | 'filter'>>
): Favorite[] {
  return list.map(item =>
    item.type === 'widget' && item.id === id ? { ...item, ...patch } : item
  )
}

export const findWidgetFavorite = (list: Favorite[], id: string) =>
  list.find(
    (item): item is FavoriteWidget => item.type === 'widget' && item.id === id
  )
