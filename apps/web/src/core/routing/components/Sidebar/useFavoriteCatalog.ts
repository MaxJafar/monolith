import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'

import { styledIcon } from '@monolith/blocks'
import { useCanvasWidgets } from '@monolith/ui'

import { useAppAppearance } from '@/core/appearance/AppearanceContext'
import { useWorkspace } from '@/core/workspaces/WorkspaceProvider'

import { useNavigation } from './NavigationProvider'
import { useSidebarPreferences } from './SidebarPreferences'
import { type Favorite, favoriteKey } from './favorites'
import { type SystemArea, systemAreas } from './systemAreas'

export type FavoriteEntry = {
  key: string
  favorite: Favorite
  label: string
  icon: string
  /** Icon color for links; widget icons keep the catalog's own color. */
  color?: string
  href?: string
  active?: boolean
}

export type FavoriteGroup = 'views' | 'pages' | 'addons' | 'widgets'

// The data-bound widget needs a page; the character HUD has its own slot.
const unlisted = new Set(['linkedDatabase', 'rpgProfile'])

/** Resolves saved favourites and the candidates the sidebar can still add. */
export function useFavoriteCatalog() {
  const { t } = useTranslation('common.navigation')

  const { active } = useWorkspace(),
    location = useLocation(),
    appearance = useAppAppearance()
  const nav = useNavigation(),
    catalog = useCanvasWidgets(),
    { preferences } = useSidebarPreferences()

  const rpg = !!active?.enabled_modules.includes('urpg')
  const items = new Map(nav.items.map(item => [item.key, item])),
    styles = new Map(nav.config.items.map(item => [item.key, item])),
    chosen = new Set(preferences.favorites.map(favoriteKey))
  const iconSet = (path: string) =>
    appearance.pages[path]?.iconSet ??
    appearance.workspace.iconSet ??
    appearance.global.iconSet

  function area(name: SystemArea): FavoriteEntry {
    const path = `/${name}`

    return {
      key: favoriteKey({ type: 'area', id: name }),
      favorite: { type: 'area', id: name },
      label: t(name),
      icon:
        appearance.pages[path]?.icon ??
        styledIcon(systemAreas[name], iconSet(path)),
      color: appearance.pages[path]?.icons,
      href: `${path}${active ? `?workspace=${active.id}` : ''}`,
      active: location.pathname === path
    }
  }

  function describe(favorite: Favorite): FavoriteEntry | null {
    // Only Rooms joins the uRPG navigation; other areas stay saved.
    if (favorite.type === 'area')
      return !rpg || favorite.id === 'rooms' ? area(favorite.id) : null

    if (favorite.type === 'widget') {
      const widget = catalog.widgets[favorite.id]

      return widget && favorite.id !== 'rpgProfile'
        ? {
            key: favoriteKey(favorite),
            favorite,
            label: widget.title,
            icon: widget.icon
          }
        : null
    }

    const key = favoriteKey(favorite),
      item = items.get(key)

    // Archived pages leave the sidebar until they are restored.
    if (!item || nav.isArchived(item)) return null

    const path = item.href.split('?')[0] ?? '/',
      saved = styles.get(key)

    return {
      key,
      favorite,
      label: item.title || t('untitled'),
      icon:
        saved?.icon ??
        appearance.pages[path]?.icon ??
        styledIcon(item.icon, iconSet(path)),
      color: saved?.color ?? appearance.pages[path]?.icons,
      href: item.href,
      active: location.pathname === path
    }
  }

  const entries = preferences.favorites.flatMap(favorite => {
    const entry = describe(favorite)

    return entry ? [entry] : []
  })

  const candidates: [FavoriteGroup, Favorite][] = [
    ...(Object.keys(systemAreas) as SystemArea[]).map(
      (id): [FavoriteGroup, Favorite] => ['views', { type: 'area', id }]
    ),
    ...nav.items.map((item): [FavoriteGroup, Favorite] => [
      item.kind === 'page' ? 'pages' : 'addons',
      { type: item.kind, id: item.id }
    ]),
    ...Object.keys(catalog.widgets)
      .filter(id => !unlisted.has(id))
      .map((id): [FavoriteGroup, Favorite] => [
        'widgets',
        { type: 'widget', id, collapsed: false, filter: '' }
      ])
  ]

  const options = candidates.flatMap(([group, favorite]) => {
    const entry = chosen.has(favoriteKey(favorite)) ? null : describe(favorite)

    return entry ? [{ ...entry, group }] : []
  })

  return { entries, options, rpg }
}
