import { type DragEvent, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Box,
  Button,
  Flex,
  Stack,
  Text,
  getInternalDragData,
  hasInternalDragData
} from '@monolith/ui'

import { RpgNavigation } from '@/addons/urpg/RpgPage'

import FavoriteItem, { favoriteDragType } from './FavoriteItem'
import FavoritePicker from './FavoritePicker'
import { useNavigation } from './NavigationProvider'
import { useSidebarPreferences } from './SidebarPreferences'
import {
  type Favorite,
  addFavorite,
  canAddFavorite,
  hasFavorite,
  moveFavorite,
  moveFavoriteBefore,
  removeFavorite
} from './favorites'
import { type FavoriteEntry, useFavoriteCatalog } from './useFavoriteCatalog'

const navigationDragType = 'application/x-monolith-navigation'

type Drop =
  { key: string; place: 'before' | 'after' } | { key: null; place: 'end' }

const selector = (key: string, control: string) =>
  `[data-favorite="${CSS.escape(key)}"] ${control}`

export default function SidebarFavorites() {
  const { t } = useTranslation('common.navigation'),
    { t: shop } = useTranslation('common.module-manager')

  const nav = useNavigation()
  const { preferences, update } = useSidebarPreferences()
  const { entries, rpg } = useFavoriteCatalog()

  const [picker, setPicker] = useState<HTMLElement | null>(null),
    [drop, setDrop] = useState<Drop | null>(null),
    [announcement, setAnnouncement] = useState('')
  const list = useRef<HTMLUListElement>(null),
    add = useRef<HTMLButtonElement>(null)

  const heading = useId()

  const keys = entries.map(entry => entry.key)

  /** The page or addon carried by a navigation drag from this workspace. */
  function navigationItem(event: DragEvent) {
    if (!hasInternalDragData(event.nativeEvent, navigationDragType)) return

    try {
      const data: unknown = JSON.parse(
        getInternalDragData(event.nativeEvent, navigationDragType)
      )

      if (!data || typeof data !== 'object') return

      const { key, workspace } = data as Record<string, unknown>

      return workspace === nav.scope
        ? nav.items.find(item => item.key === key)
        : undefined
    } catch {
      /* Unrelated drops do not change favourites. */
    }
  }

  function placement(event: DragEvent, key: string | null): Drop | null {
    if (hasInternalDragData(event.nativeEvent, favoriteDragType)) {
      const source = getInternalDragData(event.nativeEvent, favoriteDragType)
      const from = keys.indexOf(source)

      if (from < 0 || source === key) return null

      // A moved item takes the target's position, as arrow keys do.
      return key
        ? { key, place: from < keys.indexOf(key) ? 'after' : 'before' }
        : { key: null, place: 'end' }
    }

    const item = navigationItem(event)

    if (
      !item ||
      item.key === key ||
      (!hasFavorite(preferences.favorites, { type: item.kind, id: item.id }) &&
        !canAddFavorite(preferences.favorites, item.kind))
    )
      return null

    return key ? { key, place: 'before' } : { key: null, place: 'end' }
  }

  function dragOver(event: DragEvent, key: string | null) {
    if (
      !hasInternalDragData(event.nativeEvent, favoriteDragType) &&
      !hasInternalDragData(event.nativeEvent, navigationDragType)
    )
      return
    event.stopPropagation()
    const next = placement(event, key)

    if (next) event.preventDefault()
    setDrop(old =>
      old?.key === next?.key && old?.place === next?.place ? old : next
    )
  }

  function dropOn(event: DragEvent, key: string | null) {
    const target = placement(event, key)

    setDrop(null)
    if (!target) return
    event.preventDefault()
    event.stopPropagation()

    if (hasInternalDragData(event.nativeEvent, favoriteDragType)) {
      const source = getInternalDragData(event.nativeEvent, favoriteDragType)

      update(current => ({
        favorites: moveFavorite(current.favorites, source, target.key)
      }))
      setAnnouncement(
        shop('shop.moved', {
          name: entries.find(entry => entry.key === source)?.label
        })
      )

      return
    }

    const item = navigationItem(event)

    if (!item) return

    const favorite: Favorite = { type: item.kind, id: item.id }

    update(current => ({
      favorites: hasFavorite(current.favorites, favorite)
        ? moveFavoriteBefore(current.favorites, item.key, target.key)
        : addFavorite(current.favorites, favorite, target.key)
    }))
    setAnnouncement(t('favorites.added', { name: item.title || t('untitled') }))
  }

  function shift(entry: FavoriteEntry, offset: -1 | 1) {
    const target = keys[keys.indexOf(entry.key) + offset]

    if (!target) return
    update(current => ({
      favorites: moveFavorite(current.favorites, entry.key, target)
    }))
    setAnnouncement(shop('shop.moved', { name: entry.label }))
    // Reordering can detach the focused grip; keep keyboard users on it.
    requestAnimationFrame(() =>
      list.current
        ?.querySelector<HTMLElement>(
          selector(entry.key, '.monolith-system-grip')
        )
        ?.focus({ preventScroll: true })
    )
  }

  function remove(entry: FavoriteEntry) {
    const index = keys.indexOf(entry.key),
      next = keys[index + 1] ?? keys[index - 1]
    const focused = !!list.current
      ?.querySelector(`[data-favorite="${CSS.escape(entry.key)}"]`)
      ?.contains(document.activeElement)

    update(current => ({
      favorites: removeFavorite(current.favorites, entry.key)
    }))
    setAnnouncement(t('favorites.removed', { name: entry.label }))
    if (focused)
      requestAnimationFrame(() =>
        (
          (next &&
            list.current?.querySelector<HTMLElement>(
              selector(next, '.monolith-favorite-remove')
            )) ||
          add.current
        )?.focus({ preventScroll: true })
      )
  }

  function pick(entry: FavoriteEntry) {
    update(current => ({
      favorites: addFavorite(current.favorites, entry.favorite)
    }))
    setAnnouncement(t('favorites.added', { name: entry.label }))
    setPicker(null)
    // The empty-state opener disappears once the first favourite is added.
    requestAnimationFrame(() => {
      if (!document.activeElement || document.activeElement === document.body)
        add.current?.focus({ preventScroll: true })
    })
  }

  return (
    <>
      {rpg && <RpgNavigation />}
      <Stack
        aria-labelledby={heading}
        as="nav"
        className="monolith-favorites"
        data-drop={drop?.place === 'end'}
        gap="none"
        px="sm"
        py="sm"
        onDragLeave={event => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null))
            setDrop(null)
        }}
        onDragOver={event => dragOver(event, null)}
        onDrop={event => dropOn(event, null)}
      >
        <Flex
          align="center"
          className="monolith-favorites-heading"
          justify="between"
        >
          <Text color="muted" id={heading} pl="sm" size="xs">
            {t('favorites.title')}
          </Text>
          <Button
            ref={add}
            aria-expanded={!!picker}
            aria-haspopup="dialog"
            aria-label={t('favorites.add')}
            className="monolith-nav-control"
            icon="lucide:plus"
            namespace={false}
            variant="plain"
            onClick={event => setPicker(picker ? null : event.currentTarget)}
          />
        </Flex>
        {entries.length ? (
          <Stack
            ref={list}
            as="ul"
            className="monolith-favorites-list"
            gap="none"
          >
            {entries.map(entry => (
              <FavoriteItem
                key={entry.key}
                drop={drop?.key === entry.key ? drop.place : null}
                entry={entry}
                onDragLeave={() => setDrop(null)}
                onDragOver={event => dragOver(event, entry.key)}
                onDrop={event => dropOn(event, entry.key)}
                onMove={offset => shift(entry, offset)}
                onRemove={() => remove(entry)}
              />
            ))}
          </Stack>
        ) : (
          <Stack align="start" gap="xs" px="sm" py="xs">
            <Text color="muted" size="xs">
              {t('favorites.empty')}
            </Text>
            <Button
              icon="lucide:plus"
              namespace={false}
              p="xs"
              variant="plain"
              onClick={event => setPicker(event.currentTarget)}
            >
              {t('favorites.add')}
            </Button>
          </Stack>
        )}
      </Stack>
      {picker && (
        <FavoritePicker
          anchor={picker}
          onClose={() => setPicker(null)}
          onPick={pick}
        />
      )}
      <Box className="monolith-sr-only" role="status">
        {announcement}
      </Box>
    </>
  )
}
