import { styledIcon } from '@monolith/blocks'
import {
  AnimatedCollapse,
  Box,
  Button,
  ChoiceSelect,
  ContextMenu,
  ContextMenuItem,
  Flex,
  Icon,
  Stack,
  Text,
  elasticDragPreview,
  getInternalDragData,
  hasInternalDragData,
  setInternalDragData
} from '@monolith/ui'
import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAppAppearance } from '@/core/appearance/AppearanceContext'

import NavigationEditor from './NavigationEditor'
import { type NavigationItem, useNavigation } from './NavigationProvider'
import { useSidebarPreferences } from './SidebarPreferences'
import { canAddFavorite, hasFavorite, toggleFavorite } from './favorites'

const dragType = 'application/x-monolith-navigation'

function MoveItem({
  item,
  onClose
}: {
  item: NavigationItem
  onClose: () => void
}) {
  const nav = useNavigation(),
    { t } = useTranslation('common.navigation')

  const [target, setTarget] = useState(`group:${nav.groupFor(item)}`)

  const descendants = new Set([item.id])

  for (let changed = true; changed;) {
    changed = false

    for (const page of nav.items)
      if (
        page.parent &&
        descendants.has(page.parent) &&
        !descendants.has(page.id)
      ) {
        descendants.add(page.id)
        changed = true
      }
  }

  return (
    <Stack
      as="form"
      gap="xs"
      p="sm"
      onSubmit={event => {
        event.preventDefault()
        const parent = nav.items.find(page => page.key === target)
        void nav
          .move(
            item.key,
            parent ? nav.groupFor(parent) : target.slice(6),
            undefined,
            parent?.id ?? null
          )
          .then(saved => {
            if (saved) onClose()
          })
      }}
    >
      <ChoiceSelect
        label={t('moveTo')}
        value={target}
        onChange={setTarget}
        options={[
          ...nav.groups.map(group => ({
            value: `group:${group.id}`,
            label: group.name
          })),
          ...(item.kind === 'page'
            ? nav.items
                .filter(
                  page => page.kind === 'page' && !descendants.has(page.id)
                )
                .map(page => ({
                  value: page.key,
                  label: t('subpageOf', { name: page.title })
                }))
            : [])
        ]}
      />
      <Flex gap="xs">
        <Button disabled={!nav.canEdit} namespace={false} p="xs" type="submit">
          {t('move')}
        </Button>
        <Button
          namespace={false}
          p="xs"
          type="button"
          variant="plain"
          onClick={onClose}
        >
          {t('cancel')}
        </Button>
      </Flex>
    </Stack>
  )
}

function NavigationRow({
  item,
  group,
  depth = 0,
  ancestors = new Set<string>()
}: {
  item: NavigationItem
  group: string
  depth?: number
  ancestors?: Set<string>
}) {
  const nav = useNavigation(),
    { t } = useTranslation('common.navigation'),
    location = useLocation()

  const appearance = useAppAppearance()
  const { t: ui } = useTranslation('common.workspaceUI')
  const { preferences, update } = useSidebarPreferences()
  const childrenId = useId()
  const rowAnchor = useRef<HTMLDivElement>(null)

  const favorite = { type: item.kind, id: item.id }
  const favorited = hasFavorite(preferences.favorites, favorite)
  const pageAppearance = appearance.pages[item.href.split('?')[0] ?? '/']
  const itemStyle = nav.config.items.find(value => value.key === item.key)
  const [editing, setEditing] = useState(false),
    [moving, setMoving] = useState(false),
    [deleting, setDeleting] = useState(false),
    [over, setOver] = useState<'before' | 'inside' | ''>('')

  if (depth > 20 || ancestors.has(item.id)) return null

  const children =
    item.kind === 'page'
      ? nav.children(item.id).filter(child => nav.matches(child))
      : []
  const active = location.pathname === item.href.split('?')[0]
  const open = !!nav.query || !nav.collapsed.has(item.key)
  const draggable = nav.canEdit && nav.sort === 'manual' && !nav.query

  return (
    <Box as="li" minWidth="0">
      <Flex
        ref={rowAnchor}
        align="center"
        className="monolith-nav-row"
        data-active={active}
        data-drop={over}
        data-hidden={nav.isHidden(item)}
        draggable={draggable}
        gap="none"
        minWidth="0"
        onDragLeave={() => setOver('')}
        onDragOver={event => {
          if (!draggable || !hasInternalDragData(event.nativeEvent, dragType))
            return
          event.preventDefault()
          event.stopPropagation()
          const rect = event.currentTarget.getBoundingClientRect()
          setOver(
            item.kind === 'page' && event.clientY > rect.top + rect.height * 0.4
              ? 'inside'
              : 'before'
          )
        }}
        onDragStart={event => {
          event.stopPropagation()
          event.dataTransfer.effectAllowed = 'move'
          setInternalDragData(
            event.nativeEvent,
            dragType,
            JSON.stringify({ key: item.key, workspace: nav.scope })
          )
          elasticDragPreview(event.nativeEvent, item.title, event.currentTarget)
        }}
        onDrop={event => {
          event.preventDefault()
          event.stopPropagation()
          setOver('')

          try {
            const data = JSON.parse(
              getInternalDragData(event.nativeEvent, dragType)
            )

            if (data.workspace !== nav.scope || data.key === item.key) return
            void nav.move(
              data.key,
              group,
              over === 'inside' ? undefined : item.key,
              over === 'inside' ? item.id : item.parent
            )
          } catch {
            /* Ignore unrelated drops. */
          }
        }}
      >
        {item.kind === 'page' ? (
          <Button
            aria-controls={childrenId}
            aria-expanded={open}
            aria-label={t(open ? 'collapse' : 'expand', { name: item.title })}
            className="monolith-nav-disclosure monolith-disclosure"
            disabled={!children.length}
            icon="lucide:chevron-right"
            namespace={false}
            variant="plain"
            onClick={() => nav.toggle(item.key)}
          />
        ) : (
          <Box className="monolith-nav-disclosure" />
        )}
        <Button
          aria-current={active ? 'page' : undefined}
          as={Link}
          className="monolith-nav-link"
          draggable={false}
          flex="1"
          gap="sm"
          icon={
            itemStyle?.icon ??
            pageAppearance?.icon ??
            styledIcon(
              item.icon,
              pageAppearance?.iconSet ??
                appearance.workspace.iconSet ??
                appearance.global.iconSet
            )
          }
          iconProps={{
            preserveStyle: true,
            style: {
              color:
                itemStyle?.color ??
                pageAppearance?.icons ??
                'var(--appearance-icon-color, inherit)'
            }
          }}
          justify="start"
          minWidth="0"
          namespace={false}
          to={item.href}
          variant="plain"
        >
          <Text truncate size="sm">
            {item.title || t('untitled')}
          </Text>
        </Button>
        <ContextMenu
          contextTarget={rowAnchor}
          className="monolith-nav-more"
          componentProps={{
            button: {
              'aria-label': t('options', { name: item.title }),
              className: 'monolith-nav-control',
              disabled: !nav.canEdit,
              icon: 'lucide:ellipsis'
            }
          }}
        >
          <ContextMenuItem
            disabled={
              !favorited && !canAddFavorite(preferences.favorites, item.kind)
            }
            icon={favorited ? 'lucide:x' : 'lucide:star'}
            label={t(favorited ? 'favorites.removeItem' : 'favorites.addItem')}
            namespace={false}
            onClick={() =>
              update(current => ({
                favorites: toggleFavorite(current.favorites, favorite)
              }))
            }
          />
          {item.kind === 'page' && (
            <ContextMenuItem
              icon="lucide:file-plus"
              label={t('newSubpage')}
              namespace={false}
              onClick={() => void nav.createPage(item.id, group)}
            />
          )}
          {
            <ContextMenuItem
              icon="lucide:pencil"
              label={t('rename')}
              namespace={false}
              onClick={() => setEditing(true)}
            />
          }
          <ContextMenuItem
            icon="lucide:palette"
            label={ui('iconAndColor')}
            namespace={false}
            onClick={() => setEditing(true)}
          />
          <ContextMenuItem
            icon="lucide:folder-input"
            label={t('moveTo')}
            namespace={false}
            onClick={() => setMoving(true)}
          />
          <ContextMenuItem
            icon="lucide:arrow-up"
            label={t('moveUp')}
            namespace={false}
            onClick={() => {
              const siblings = nav.children(item.parent, group)
              const previous =
                siblings[
                  siblings.findIndex(value => value.key === item.key) - 1
                ]

              if (previous)
                void nav.move(item.key, group, previous.key, item.parent)
            }}
          />
          <ContextMenuItem
            icon="lucide:arrow-down"
            label={t('moveDown')}
            namespace={false}
            onClick={() => {
              const siblings = nav.children(item.parent, group),
                index = siblings.findIndex(value => value.key === item.key)

              if (index < siblings.length - 1)
                void nav.move(
                  item.key,
                  group,
                  siblings[index + 2]?.key,
                  item.parent
                )
            }}
          />
          <ContextMenuItem
            icon={nav.isHidden(item) ? 'lucide:eye' : 'lucide:eye-off'}
            label={t(nav.isHidden(item) ? 'show' : 'hide')}
            namespace={false}
            onClick={() => void nav.hide(item)}
          />
          <ContextMenuItem
            disabled={item.kind !== 'page'}
            icon="lucide:archive"
            label={ui('archivePage')}
            namespace={false}
            onClick={() => void nav.archive(item)}
          />
          <ContextMenuItem
            dangerous
            icon="lucide:trash-2"
            label={t(item.kind === 'page' ? 'deletePage' : 'removeAddon')}
            namespace={false}
            onClick={() => setDeleting(true)}
          />
        </ContextMenu>
      </Flex>
      {editing && (
        <NavigationEditor
          anchor={rowAnchor.current}
          initial={item.title}
          initialIcon={itemStyle?.icon ?? pageAppearance?.icon ?? item.icon}
          initialColor={itemStyle?.color ?? pageAppearance?.icons}
          label={t('rename')}
          onClose={() => setEditing(false)}
          onSave={(name, icon, color) => nav.rename(item, name, icon, color)}
        />
      )}
      {moving && <MoveItem item={item} onClose={() => setMoving(false)} />}
      {deleting && (
        <Stack gap="xs" p="sm">
          <Text size="sm">
            {t(item.kind === 'page' ? 'deleteHelp' : 'removeHelp')}
          </Text>
          <Flex gap="xs">
            <Button
              dangerous
              disabled={nav.pending}
              namespace={false}
              p="xs"
              onClick={() =>
                void nav.remove(item).then(() => setDeleting(false))
              }
            >
              {t('confirm')}
            </Button>
            <Button
              namespace={false}
              p="xs"
              variant="plain"
              onClick={() => setDeleting(false)}
            >
              {t('cancel')}
            </Button>
          </Flex>
        </Stack>
      )}
      {children.length > 0 && (
        <Box
          aria-hidden={!open}
          className="monolith-nav-reveal"
          data-open={open}
          id={childrenId}
          inert={!open}
        >
          <Stack
            as="ul"
            className="monolith-nav-tree monolith-nav-children"
            gap="none"
          >
            {children.map(child => (
              <NavigationRow
                key={child.key}
                ancestors={new Set([...ancestors, item.id])}
                depth={depth + 1}
                group={group}
                item={child}
              />
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  )
}

function NavigationGroup({
  group
}: {
  group: { id: string; name: string; icon?: string; color?: string }
}) {
  const childrenId = useId()
  const groupAnchor = useRef<HTMLDivElement>(null)

  const nav = useNavigation(),
    { t } = useTranslation('common.navigation'),
    navigate = useNavigate()

  const { t: ui } = useTranslation('common.workspaceUI')

  const [editing, setEditing] = useState(false),
    [over, setOver] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const location = useLocation()
  const items = nav.children(null, group.id).filter(item => nav.matches(item))
  const activeItem = items.find(
    item => item.href.split('?')[0] === location.pathname
  )
  const visibleItems = nav.query ? items : items.slice(0, 6)
  if (activeItem && !visibleItems.includes(activeItem))
    visibleItems.push(activeItem)
  const extraItems = items.filter(item => !visibleItems.includes(item))
  const open = !!nav.query || !nav.collapsed.has(group.id)

  if (nav.query && !items.length) return null

  return (
    <Stack
      aria-label={group.name}
      as="section"
      className="monolith-nav-group"
      data-drop={over}
      gap="xs"
      onDragLeave={() => setOver(false)}
      onDragOver={event => {
        if (!nav.canEdit || !hasInternalDragData(event.nativeEvent, dragType))
          return
        event.preventDefault()
        setOver(true)
      }}
      onDrop={event => {
        event.preventDefault()
        setOver(false)

        try {
          const data = JSON.parse(
            getInternalDragData(event.nativeEvent, dragType)
          )

          if (data.workspace === nav.scope) void nav.move(data.key, group.id)
        } catch {
          /* Ignore unrelated drops. */
        }
      }}
    >
      <Flex
        ref={groupAnchor}
        align="center"
        className="monolith-nav-group-heading"
        draggable={
          nav.canEdit &&
          !['pages', 'addons'].includes(group.id) &&
          nav.sort === 'manual'
        }
        gap="xs"
        justify="between"
        onDragOver={event => {
          if (
            nav.canEdit &&
            hasInternalDragData(
              event.nativeEvent,
              'application/x-monolith-group'
            )
          ) {
            event.preventDefault()
            event.stopPropagation()
          }
        }}
        onDragStart={event => {
          setInternalDragData(
            event.nativeEvent,
            'application/x-monolith-group',
            JSON.stringify({ id: group.id, workspace: nav.scope })
          )
          event.dataTransfer.effectAllowed = 'move'
          elasticDragPreview(event.nativeEvent, group.name, event.currentTarget)
        }}
        onDrop={event => {
          if (
            !hasInternalDragData(
              event.nativeEvent,
              'application/x-monolith-group'
            )
          )
            return
          event.preventDefault()
          event.stopPropagation()

          try {
            const source = JSON.parse(
              getInternalDragData(
                event.nativeEvent,
                'application/x-monolith-group'
              )
            )
            const from = nav.config.groups.findIndex(g => g.id === source.id),
              to = nav.config.groups.findIndex(g => g.id === group.id)

            if (source.workspace === nav.scope && from >= 0 && to >= 0)
              void nav.reorderGroup(source.id, to - from)
          } catch {
            /* Unrelated drops do not change navigation. */
          }
        }}
      >
        <Button
          aria-controls={childrenId}
          aria-expanded={open}
          icon="lucide:chevron-right"
          className="monolith-disclosure"
          namespace={false}
          p="xs"
          variant="plain"
          onClick={() => nav.toggle(group.id)}
        >
          {group.icon && (
            <Icon
              className="monolith-folder-icon"
              icon={group.icon}
              preserveStyle
              size="20px"
              style={{ color: group.color || 'var(--text-muted)' }}
            />
          )}
          <Text color="muted" size="sm" weight="medium">
            {group.name}
          </Text>
        </Button>
        <Flex gap="none">
          <ContextMenu
            contextTarget={groupAnchor}
            componentProps={{
              button: {
                'aria-label': t('options', { name: group.name }),
                className: 'monolith-nav-control',
                disabled: !nav.canEdit,
                icon: 'lucide:ellipsis'
              }
            }}
          >
            <ContextMenuItem
              icon="lucide:file-plus"
              label={t('newPage')}
              namespace={false}
              onClick={() => void nav.createPage(null, group.id)}
            />
            {group.id === 'addons' && (
              <ContextMenuItem
                icon="lucide:puzzle"
                label={t('manageAddons')}
                namespace={false}
                onClick={() => navigate(`/addons?workspace=${nav.scope}`)}
              />
            )}
            {!['pages', 'addons'].includes(group.id) && (
              <>
                <ContextMenuItem
                  icon="lucide:pencil"
                  label={ui('editGroup')}
                  namespace={false}
                  onClick={() => setEditing(true)}
                />
                <ContextMenuItem
                  icon="lucide:arrow-up"
                  label={t('moveUp')}
                  namespace={false}
                  onClick={() => void nav.reorderGroup(group.id, -1)}
                />
                <ContextMenuItem
                  icon="lucide:arrow-down"
                  label={t('moveDown')}
                  namespace={false}
                  onClick={() => void nav.reorderGroup(group.id, 1)}
                />
                <ContextMenuItem
                  icon="lucide:folder-minus"
                  label={t('removeGroup')}
                  namespace={false}
                  onClick={() => void nav.removeGroup(group.id)}
                />
              </>
            )}
          </ContextMenu>
          <Button
            aria-label={t('newPageIn', { name: group.name })}
            className="monolith-nav-control"
            disabled={!nav.canEdit}
            icon="lucide:plus"
            namespace={false}
            variant="plain"
            onClick={() => void nav.createPage(null, group.id)}
          />
        </Flex>
      </Flex>
      {editing && (
        <NavigationEditor
          anchor={groupAnchor.current}
          initial={group.name}
          initialIcon={group.icon ?? 'lucide:folder'}
          initialColor={group.color}
          label={t('groupName')}
          onClose={() => setEditing(false)}
          onSave={(name, icon, color) =>
            nav.renameGroup(group.id, name, icon, color)
          }
        />
      )}
      <Box
        aria-hidden={!open}
        className="monolith-nav-reveal"
        data-open={open}
        id={childrenId}
        inert={!open}
      >
        <Stack as="ul" className="monolith-nav-tree" gap="none">
          {visibleItems.map(item => (
            <NavigationRow key={item.key} group={group.id} item={item} />
          ))}
          {!!extraItems.length && (
            <Box as="li">
              <AnimatedCollapse open={expanded}>
                <Stack as="ul" className="monolith-nav-tree" gap="none">
                  {extraItems.map(item => (
                    <NavigationRow
                      key={item.key}
                      group={group.id}
                      item={item}
                    />
                  ))}
                </Stack>
              </AnimatedCollapse>
            </Box>
          )}
          {items.length > 6 && !nav.query && (
            <Box as="li">
              <Button
                aria-expanded={expanded}
                icon={expanded ? 'lucide:chevrons-up' : 'lucide:ellipsis'}
                className="monolith-nav-link"
                namespace={false}
                variant="plain"
                onClick={() => setExpanded(!expanded)}
              >
                {ui(expanded ? 'showLess' : 'showMore', {
                  count: items.length - visibleItems.length
                })}
              </Button>
            </Box>
          )}
          {!items.length && (
            <Text color="muted" px="sm" py="xs" size="xs">
              {t(group.id === 'addons' ? 'noAddons' : 'emptyGroup')}
            </Text>
          )}
        </Stack>
      </Box>
    </Stack>
  )
}

export default function NavigationTree() {
  const createAnchor = useRef<HTMLButtonElement>(null)
  const nav = useNavigation(),
    { t } = useTranslation('common.navigation'),
    [creating, setCreating] = useState(false),
    [filter, setFilter] = useState(false)

  return (
    <Stack gap="sm" pb="lg" px="sm">
      <Flex align="center" className="monolith-nav-tools" justify="between">
        <Text color="muted" pl="sm" size="xs">
          {t('yourWorkspace')}
        </Text>
        <Flex gap="none">
          <Button
            aria-expanded={filter}
            aria-label={t('filter')}
            className="monolith-nav-control"
            icon="lucide:list-filter"
            namespace={false}
            variant="plain"
            onClick={() => setFilter(!filter)}
          />
          <ContextMenu
            componentProps={{
              button: {
                'aria-label': t('sort'),
                className: 'monolith-nav-control',
                icon: 'lucide:arrow-down-wide-narrow'
              }
            }}
          >
            <ContextMenuItem
              checked={nav.sort === 'manual'}
              label={t('manual')}
              namespace={false}
              onClick={() => nav.setSort('manual')}
            />
            <ContextMenuItem
              checked={nav.sort === 'name'}
              label={t('alphabetical')}
              namespace={false}
              onClick={() => nav.setSort('name')}
            />
            <ContextMenuItem
              checked={nav.showHidden}
              label={t('showHidden')}
              namespace={false}
              onClick={() => nav.setShowHidden(!nav.showHidden)}
            />
          </ContextMenu>
          <Button
            ref={createAnchor}
            aria-label={t('newGroup')}
            className="monolith-nav-control"
            disabled={!nav.canEdit}
            icon="lucide:folder-plus"
            namespace={false}
            variant="plain"
            onClick={() => setCreating(!creating)}
          />
        </Flex>
      </Flex>
      {filter && (
        <Box
          autoFocus
          aria-label={t('filterPlaceholder')}
          as="input"
          className="monolith-nav-input"
          placeholder={t('filterPlaceholder')}
          value={nav.query}
          onChange={event => nav.setQuery(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Escape') {
              event.stopPropagation()
              nav.setQuery('')
              setFilter(false)
            }
          }}
        />
      )}
      {creating && (
        <NavigationEditor
          anchor={createAnchor.current}
          initial=""
          initialIcon="lucide:folder"
          label={t('groupName')}
          onClose={() => setCreating(false)}
          onSave={nav.addGroup}
        />
      )}
      {nav.loading ? (
        <Text color="muted" px="sm" role="status" size="sm">
          {t('loading')}
        </Text>
      ) : (
        nav.groups.map(group => (
          <NavigationGroup key={group.id} group={group} />
        ))
      )}
      {nav.error && (
        <Text color="dangerous" role="alert" size="sm">
          {nav.error}
        </Text>
      )}
      <Text
        aria-live="polite"
        className="monolith-nav-announcement"
        role="status"
      >
        {nav.announcement}
      </Text>
      <Button
        as={Link}
        icon="lucide:puzzle"
        justify="start"
        namespace={false}
        p="sm"
        to={`/addons?workspace=${nav.scope}`}
        variant="plain"
      >
        <Text color="muted" size="sm">
          {t('manageAddons')}
        </Text>
      </Button>
    </Stack>
  )
}
