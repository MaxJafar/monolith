import { type KeyboardEvent, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Box, Button, FloatingPopover, Icon, Stack, Text } from '@monolith/ui'

import { useSidebarPreferences } from './SidebarPreferences'
import { canAddFavorite, favoriteLimit, widgetLimit } from './favorites'
import {
  type FavoriteEntry,
  type FavoriteGroup,
  useFavoriteCatalog
} from './useFavoriteCatalog'

const groups: FavoriteGroup[] = ['views', 'pages', 'addons', 'widgets']

/** Lists views, pages, addons and widgets that are not favourites yet. */
export default function FavoritePicker({
  anchor,
  onClose,
  onPick
}: {
  anchor: HTMLElement
  onClose: () => void
  onPick: (entry: FavoriteEntry) => void
}) {
  const { t } = useTranslation('common.navigation')
  const { preferences } = useSidebarPreferences()
  const { options } = useFavoriteCatalog()
  const [query, setQuery] = useState('')

  const list = useRef<HTMLDivElement>(null),
    search = useRef<HTMLInputElement>(null)

  const id = useId()

  const full = preferences.favorites.length >= favoriteLimit
  const matches = options.filter(option =>
    option.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  )
  const enabled = (option: FavoriteEntry) =>
    canAddFavorite(preferences.favorites, option.favorite.type)

  function focusOption(from: Element | null, offset: -1 | 1) {
    const buttons = Array.from(
      list.current?.querySelectorAll<HTMLButtonElement>(
        '.monolith-favorite-option:not(:disabled)'
      ) ?? []
    )
    const index = from instanceof HTMLButtonElement ? buttons.indexOf(from) : -1
    // From the search field only ↓ enters the list; ↑ on the first option returns.
    const next =
      index < 0
        ? offset > 0
          ? buttons[0]
          : undefined
        : buttons[index + offset]

    if (next) next.focus()
    else if (index === 0) search.current?.focus()
  }

  function navigate(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    focusOption(
      event.target instanceof Element ? event.target : null,
      event.key === 'ArrowUp' ? -1 : 1
    )
  }

  return (
    <FloatingPopover
      anchor={anchor}
      className="monolith-favorite-picker"
      label={t('favorites.add')}
      width={280}
      onClose={onClose}
    >
      <Stack gap="sm">
        <Box
          ref={search}
          aria-controls={id}
          aria-label={t('favorites.search')}
          as="input"
          className="monolith-nav-input"
          placeholder={t('favorites.search')}
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              const first = matches.find(enabled)

              event.preventDefault()
              if (first) onPick(first)
            } else navigate(event)
          }}
        />
        {full && (
          <Text color="muted" role="status" size="xs">
            {t('favorites.full', { count: favoriteLimit })}
          </Text>
        )}
        <Stack
          ref={list}
          className="monolith-favorite-options"
          gap="sm"
          id={id}
          onKeyDown={navigate}
        >
          {groups.map(group => {
            const items = matches.filter(option => option.group === group)

            if (!items.length) return null

            return (
              <Stack
                key={group}
                aria-label={t(`favorites.groups.${group}`)}
                gap="none"
                role="group"
              >
                <Text color="muted" px="sm" py="xs" size="xs" weight="medium">
                  {t(`favorites.groups.${group}`)}
                </Text>
                {group === 'widgets' &&
                  !full &&
                  !canAddFavorite(preferences.favorites, 'widget') && (
                    <Text color="muted" px="sm" size="xs">
                      {t('favorites.widgetLimit', { count: widgetLimit })}
                    </Text>
                  )}
                {items.map(option => (
                  <Button
                    key={option.key}
                    className="monolith-favorite-option"
                    disabled={!enabled(option)}
                    gap="sm"
                    justify="start"
                    namespace={false}
                    variant="plain"
                    onClick={() => onPick(option)}
                  >
                    <Icon
                      preserveStyle
                      icon={option.icon}
                      style={{
                        color:
                          option.color ??
                          'var(--appearance-icon-color, inherit)'
                      }}
                    />
                    <Text truncate size="sm">
                      {option.label}
                    </Text>
                  </Button>
                ))}
              </Stack>
            )
          })}
          {!matches.length && (
            <Text color="muted" px="sm" py="xs" role="status" size="sm">
              {t(options.length ? 'favorites.noMatches' : 'favorites.allAdded')}
            </Text>
          )}
        </Stack>
      </Stack>
    </FloatingPopover>
  )
}
