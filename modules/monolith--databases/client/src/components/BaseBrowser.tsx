import { useModuleTranslation } from '@monolith/localization'
import {
  Box,
  Button,
  ContextMenu,
  ContextMenuItem,
  Flex,
  Stack,
  TagChip,
  Text
} from '@monolith/ui'
import dayjs from 'dayjs'
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'

import { useDatabases } from '@/DatabaseProvider'
import { viewIcons } from '@/utils/viewLayouts'

import {
  type CellValue,
  type Field,
  type RecordPage,
  type SavedView,
  applyView,
  viewProperties
} from '../../../shared'
import { SavedViewFilters } from './AdvancedFilters'
import { BaseEditor } from './BaseEditor'
import { DatabaseCalendar } from './DatabaseCalendar'
import { DatabaseCollection } from './DatabaseCollection'
import { DatabaseGroups } from './DatabaseGroups'
import {
  DatabaseChart,
  DatabaseDashboard,
  DatabaseTimeline
} from './DatabaseInsights'
import { DatabaseKanban } from './DatabaseKanban'
import { DatabaseName } from './DatabaseName'
import { DatabasePanel } from './DatabasePanel'
import { DatabaseSearch } from './DatabaseSearch'
import { DatabaseTable } from './DatabaseTable'
import { FieldEditor } from './FieldEditor'
import { RecordEditor } from './RecordEditor'
import { ViewAppearanceEditor } from './ViewAppearanceEditor'
import { ViewEditor } from './ViewEditor'
import { ViewSummary } from './ViewSummary'

const emptyFields: Field[] = []
const emptyViews: SavedView[] = []
const emptyRecords: RecordPage[] = []

export function BaseBrowser() {
  const {
    data,
    index,
    base,
    selectedViewId,
    selectView,
    embedded,
    viewHref,
    busy,
    readOnly,
    api,
    run,
    openRecord
  } = useDatabases()

  const { t } = useModuleTranslation()
  const panelAnchor = useRef<HTMLElement | null>(null)
  const [viewSection, setViewSection] = useState('layout')

  const [editor, setEditor] = useState<
    'base' | 'field' | 'view' | 'record' | 'appearance' | 'filters' | null
  >(null)

  const [editingField, setEditingField] = useState<Field | undefined>()
  const [editingView, setEditingView] = useState<SavedView | undefined>()
  const [search, setSearch] = useState({ baseId: base?.id, query: '' })
  const [searchOpen, setSearchOpen] = useState(false)
  const [newSource, setNewSource] = useState(false)
  const [newBoardCard, setNewBoardCard] = useState<string>()
  const [boardDrafts, setBoardDrafts] = useState<{
    viewId: string
    ids: string[]
  }>({ viewId: '', ids: [] })

  const searchQuery = search.baseId === base?.id ? search.query : ''

  const [initialValues, setInitialValues] = useState<Record<string, CellValue>>(
    {}
  )

  const fields = index.fieldsByBase.get(base?.id ?? '') ?? emptyFields
  const views = index.viewsByBase.get(base?.id ?? '') ?? emptyViews
  const view = views.find(view => view.id === selectedViewId) ?? views[0]
  const visibleFields = useMemo(() => {
    const order = new Map(
      (view?.config.property_order ?? []).map((id, index) => [id, index])
    )
    return fields
      .filter(field => !view?.config.hidden_fields.includes(field.id))
      .sort((a, b) => (order.get(a.id) ?? 1000) - (order.get(b.id) ?? 1000))
  }, [fields, view])
  const baseRecords = index.recordsByBase.get(base?.id ?? '') ?? emptyRecords
  const today = dayjs().format('YYYY-MM-DD')
  const viewRecords = useMemo(
    () => applyView(baseRecords, view, data.links, { today }),
    [baseRecords, view, data.links, today]
  )
  const records = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase()

    const matching = query
      ? viewRecords.filter(record =>
          record.title.toLocaleLowerCase().includes(query)
        )
      : viewRecords
    // Keep newly created cards available while their properties are filled in,
    // even when they do not match the current view's filters yet.
    if (view?.mode !== 'kanban' || boardDrafts.viewId !== view.id)
      return matching
    const visible = new Set(matching.map(record => record.id))
    const drafts = new Set(boardDrafts.ids)
    return [
      ...matching,
      ...baseRecords.filter(
        record => drafts.has(record.id) && !visible.has(record.id)
      )
    ]
  }, [viewRecords, searchQuery, view, boardDrafts, baseRecords])
  const filterCount =
    (view?.config.filters.length ?? 0) +
    (view?.config.filter_groups ?? []).reduce(
      (count, group) => count + group.filters.length,
      0
    )

  async function createPage(initial: Record<string, CellValue> = {}) {
    if (!base || busy || readOnly) return
    const {
      done,
      item_type,
      status,
      priority,
      tags,
      project_id,
      date,
      end_date,
      ...custom
    } = initial
    const relations = fields.filter(
      field => field.kind === 'relation' && custom[field.id] != null
    )
    const values = Object.fromEntries(
      Object.entries(custom).filter(
        ([id]) => !relations.some(field => field.id === id)
      )
    )
    const result = await run(() =>
      api.createRecord.mutate({
        base_id: base.id,
        title: t('untitledPage'),
        content: '',
        values,
        ...(typeof done === 'boolean' ? { done } : {}),
        ...(item_type
          ? {
              item_type: item_type as
                'page' | 'task' | 'note' | 'project' | 'event' | 'post'
            }
          : {}),
        ...(status ? { status: status as 'planned' | 'active' | 'done' } : {}),
        ...(priority
          ? { priority: priority as 'low' | 'normal' | 'high' | 'urgent' }
          : {}),
        ...(Array.isArray(tags) ? { tags } : {}),
        ...(project_id ? { project_id: String(project_id) } : {}),
        ...(date
          ? { date: dayjs(String(date) + 'T12:00:00').toISOString() }
          : {}),
        ...(end_date
          ? { end_date: dayjs(String(end_date) + 'T12:00:00').toISOString() }
          : {})
      })
    )
    if (result) {
      if (relations.length)
        await run(async () => {
          for (const field of relations) {
            const value = custom[field.id]
            await api.setLinks.mutate({
              field_id: field.id,
              record_id: result.id,
              target_ids: Array.isArray(value)
                ? value
                : value == null
                  ? []
                  : [String(value)],
              expected_ids: []
            })
          }
          return true
        })
      if (view?.mode === 'kanban') {
        setBoardDrafts(current => ({
          viewId: view.id,
          ids: [...(current.viewId === view.id ? current.ids : []), result.id]
        }))
        setNewBoardCard(result.id)
      } else openRecord(result)
    }
  }
  if (!base)
    return (
      <Stack gap="sm" p="lg">
        <Text as="h2" size="2xl" weight="semibold">
          {t('emptyTitle')}
        </Text>
        <Text color="muted">{t('baseHelp')}</Text>
      </Stack>
    )

  const newRecord = editor === 'record' && (
    <RecordEditor
      initialValues={initialValues}
      onDone={() => setEditor(null)}
    />
  )

  return (
    <Stack
      className="zillion-workspace-enter database-browser"
      flex="1"
      gap="md"
      minWidth="0"
      onClickCapture={event => {
        if (
          event.target instanceof Element &&
          !event.target.closest(
            '[data-radix-popper-content-wrapper],.database-floating-panel'
          )
        )
          panelAnchor.current =
            event.target.closest<HTMLElement>('button') ?? panelAnchor.current
      }}
    >
      {newRecord}
      <Flex
        align={{ base: 'stretch', md: 'center' }}
        direction={{ base: 'column', md: 'row' }}
        gap="sm"
        justify="between"
        wrap="wrap"
      >
        <Stack
          flex={{ base: 'none', md: '1' }}
          gap="xs"
          width={{ base: '100%', md: 'auto' }}
        >
          <Flex align="baseline" gap="sm" wrap="wrap">
            <DatabaseName key={base.id} base={base} />
          </Flex>
          {base.description && (
            <Text as="p" color="muted">
              {base.description}
            </Text>
          )}
        </Stack>
      </Flex>
      <Stack gap="xs" minWidth="0">
        <Flex align="center" gap="sm" justify="between" wrap="wrap">
          <Flex
            aria-label={t('inputs.viewName')}
            className="monolith-view-tabs"
            as="nav"
            flex="1 1 220px"
            gap="xs"
            minWidth="0"
            overflowX="auto"
            pb="xs"
          >
            {views.map(item => (
              <Button
                key={item.id}
                aria-current={view?.id === item.id ? 'page' : undefined}
                as={Link}
                to={viewHref(item.id)}
                aria-haspopup={!readOnly ? 'dialog' : undefined}
                onContextMenu={event => {
                  if (readOnly) return
                  event.preventDefault()
                  panelAnchor.current = event.currentTarget
                  setViewSection('overview')
                  setEditingView(item)
                  setEditor('appearance')
                }}
                onClick={event => {
                  if (
                    !readOnly &&
                    view?.id === item.id &&
                    !event.ctrlKey &&
                    !event.metaKey &&
                    !event.shiftKey &&
                    !event.altKey
                  ) {
                    event.preventDefault()
                    panelAnchor.current = event.currentTarget
                    setViewSection('overview')
                    setEditingView(item)
                    setEditor('appearance')
                    return
                  }
                  if (
                    embedded &&
                    !event.ctrlKey &&
                    !event.metaKey &&
                    !event.shiftKey &&
                    !event.altKey
                  ) {
                    event.preventDefault()
                    selectView(item.id)
                  }
                }}
                icon={
                  item.config.tab?.display === 'text'
                    ? undefined
                    : (item.config.tab?.icon ?? viewIcons[item.mode])
                }
                aria-label={item.name}
                iconProps={{
                  color: 'inherit',
                  preserveStyle: !!item.config.tab?.icon,
                  style: {
                    color: item.config.tab?.icon_color || 'var(--text-muted)'
                  }
                }}
                minHeight={{ base: '44px', md: '32px' }}
                namespace={false}
                px="sm"
                py="sm"
                r="sm"
                textProps={{
                  style: {
                    color:
                      item.config.tab?.text_color ||
                      (view?.id === item.id
                        ? 'var(--text-primary)'
                        : 'var(--text-muted)')
                  }
                }}
                variant={view?.id === item.id ? 'secondary' : 'plain'}
              >
                {item.config.tab?.display === 'icon' ? null : item.name}
              </Button>
            ))}
            <Button
              aria-label={t('newView')}
              disabled={busy || readOnly}
              icon="tabler:plus"
              variant="plain"
              onClick={() => {
                setViewSection('layout')
                setEditingView(undefined)
                setEditor('view')
              }}
            />
          </Flex>
          <Flex align="center" gap="xs" className="database-toolbar-actions">
            <Button
              namespace={false}
              variant="plain"
              aria-label={t('filters')}
              icon="lucide:filter"
              disabled={!view || readOnly}
              onClick={() => {
                setViewSection('filters')
                setEditingView(view)
                setEditor('filters')
              }}
            />
            <Button
              namespace={false}
              variant="plain"
              aria-label={t('sort')}
              icon="lucide:arrow-up-down"
              disabled={!view || readOnly}
              onClick={() => {
                setViewSection('sort')
                setEditingView(view)
                setEditor('view')
              }}
            />
            <Button
              namespace={false}
              variant="plain"
              aria-label={t('search')}
              icon="lucide:search"
              aria-pressed={searchOpen}
              onClick={() => setSearchOpen(!searchOpen)}
            />
            {embedded && (
              <Button
                as={Link}
                to={viewHref(view?.id ?? '')}
                namespace={false}
                variant="plain"
                aria-label={t('openPage')}
                icon="lucide:maximize-2"
              />
            )}
            <Button
              aria-label={t('viewSettings')}
              disabled={busy || readOnly || !view}
              icon="tabler:adjustments"
              minHeight={{ base: '44px', md: '32px' }}
              p="sm"
              variant="plain"
              onClick={() => {
                setViewSection('overview')
                setEditingView(view)
                setEditor('view')
              }}
            />
            <Button
              className="database-new-button"
              disabled={busy || readOnly}
              namespace={false}
              onClick={() => void createPage()}
            >
              {t('newRecord')}
            </Button>
            <ContextMenu
              componentProps={{
                button: {
                  'aria-label': t('databaseActions'),
                  minHeight: { base: '44px', md: '32px' },
                  p: 'sm'
                }
              }}
              customIcon="tabler:dots"
            >
              <ContextMenuItem
                disabled={busy || readOnly}
                icon="lucide:file-plus-2"
                label="newRecord"
                onClick={() => {
                  setInitialValues({})
                  setEditor('record')
                }}
              />
              <ContextMenuItem
                disabled={busy || readOnly}
                icon="tabler:plus"
                label="newView"
                onClick={() => {
                  setViewSection('layout')
                  setEditingView(undefined)
                  setEditor('view')
                }}
              />
              <ContextMenuItem
                disabled={busy || readOnly}
                icon="tabler:forms"
                label="addField"
                onClick={() => {
                  setEditingField(undefined)
                  setEditor('field')
                }}
              />
              <ContextMenuItem
                disabled={busy || readOnly}
                icon="tabler:pencil"
                label="editBase"
                onClick={() => {
                  setNewSource(false)
                  setEditor(editor === 'base' ? null : 'base')
                }}
              />
            </ContextMenu>
          </Flex>
        </Flex>
        {(searchOpen || !!view?.config.sorts.length || filterCount > 0) && (
          <Flex align="center" gap="sm" justify="between" wrap="wrap">
            {searchOpen && (
              <Box minWidth="0" width={{ base: '100%', md: '17rem' }}>
                <DatabaseSearch
                  value={searchQuery}
                  onChange={query => setSearch({ baseId: base.id, query })}
                />
              </Box>
            )}
            <Flex align="center" gap="sm" wrap="wrap">
              {!!view?.config.sorts.length && (
                <TagChip
                  as="button"
                  onClick={() => {
                    setViewSection('sort')
                    setEditingView(view)
                    setEditor('view')
                  }}
                  icon="tabler:arrows-sort"
                  label={`${t('sort')} · ${view.config.sorts.length}`}
                  variant="filled"
                />
              )}
              {view && filterCount > 0 && (
                <TagChip
                  as="button"
                  onClick={() => {
                    setViewSection('filters')
                    setEditingView(view)
                    setEditor('filters')
                  }}
                  icon="tabler:filter"
                  label={t('filterSummary', {
                    count: filterCount,
                    logic: t(`filterLogic.${view.config.filter_logic ?? 'and'}`)
                  })}
                  variant="filled"
                />
              )}
            </Flex>
          </Flex>
        )}
      </Stack>
      {editor === 'base' && (
        <DatabasePanel
          anchor={panelAnchor.current}
          title={t(newSource ? 'newDataSource' : 'buttons.editBase')}
          onClose={() => setEditor(null)}
        >
          <BaseEditor
            base={newSource ? undefined : base}
            onDone={() => setEditor(null)}
          />
        </DatabasePanel>
      )}
      {editor === 'field' && (
        <DatabasePanel
          anchor={panelAnchor.current}
          width={300}
          title={t(editingField ? 'editField' : 'addField')}
          onClose={() => setEditor(null)}
        >
          <FieldEditor
            key={editingField?.id ?? 'new'}
            field={editingField}
            onDone={() => setEditor(null)}
          />
        </DatabasePanel>
      )}
      {editor === 'view' && (
        <DatabasePanel
          anchor={panelAnchor.current}
          title={t(editingView ? 'viewSettings' : 'newView')}
          width={editingView ? 320 : 480}
          onClose={() => setEditor(null)}
        >
          <ViewEditor
            key={editingView?.id ?? 'new'}
            initialSection={viewSection}
            view={editingView}
            onCreateSource={() => {
              setNewSource(true)
              setEditor('base')
            }}
            onDone={() => setEditor(null)}
          />
        </DatabasePanel>
      )}
      {editor === 'appearance' && editingView && (
        <DatabasePanel
          anchor={panelAnchor.current}
          title={t('viewAppearance')}
          width={300}
          onClose={() => setEditor(null)}
        >
          <ViewAppearanceEditor view={editingView} />
        </DatabasePanel>
      )}
      {editor === 'filters' && editingView && (
        <DatabasePanel
          anchor={panelAnchor.current}
          title={t('filters')}
          width={620}
          onClose={() => setEditor(null)}
        >
          <SavedViewFilters view={editingView} />
        </DatabasePanel>
      )}
      {searchQuery.trim() && !records.length ? (
        <Stack
          align="start"
          bg={{ base: 'bg-50', dark: 'bg-900' }}
          gap="sm"
          p="lg"
          r="sm"
        >
          <Text role="status">{t('noSearchResults')}</Text>
          <Button
            icon="tabler:x"
            minHeight={{ base: '44px', md: '32px' }}
            variant="plain"
            onClick={() => setSearch({ baseId: base.id, query: '' })}
          >
            clearSearch
          </Button>
        </Stack>
      ) : (
        <Box
          key={`${view?.id}:${view?.mode}`}
          className="monolith-database-view-enter"
          minWidth="0"
        >
          {!embedded && view?.mode !== 'calendar' && (
            <ViewSummary fields={visibleFields} records={records} view={view} />
          )}
          <DatabaseGroups
            records={records}
            fields={
              view?.mode === 'calendar' ||
              view?.mode === 'kanban' ||
              view?.mode === 'timeline' ||
              view?.mode === 'chart' ||
              view?.mode === 'dashboard'
                ? []
                : [view?.config.collection_group_by, view?.config.sub_group_by]
                    .filter((id, i, ids) => id && ids.indexOf(id) === i)
                    .map(id =>
                      [...viewProperties(base.id, t), ...fields].find(
                        field => field.id === id
                      )
                    )
                    .filter((field): field is Field => !!field)
            }
          >
            {groupRecords =>
              view?.mode === 'chart' ? (
                <DatabaseChart
                  fields={fields}
                  records={groupRecords}
                  view={view}
                />
              ) : view?.mode === 'dashboard' ? (
                <DatabaseDashboard
                  fields={fields}
                  records={groupRecords}
                  view={view}
                />
              ) : view?.mode === 'timeline' ? (
                <DatabaseTimeline
                  fields={fields}
                  records={groupRecords}
                  view={view}
                />
              ) : view?.mode === 'calendar' ? (
                <DatabaseCalendar
                  key={view.id}
                  fields={fields}
                  records={groupRecords}
                  view={view}
                  onCreate={values => {
                    if (busy || readOnly) return
                    void createPage(values)
                  }}
                />
              ) : view?.mode === 'kanban' ? (
                <DatabaseKanban
                  key={view.id}
                  view={view}
                  editingRecordId={newBoardCard}
                  onFinishName={() => setNewBoardCard(undefined)}
                  subgroupField={[
                    ...viewProperties(base.id, t),
                    ...fields
                  ].find(field => field.id === view.config.sub_group_by)}
                  fields={
                    view.config.show_card_properties === false
                      ? []
                      : visibleFields
                  }
                  groupField={[...viewProperties(base.id, t), ...fields].find(
                    field =>
                      field.id ===
                      (view.config.group_property ?? view.group_field_id)
                  )}
                  records={groupRecords}
                  onCreate={values => {
                    if (busy || readOnly) return
                    void createPage(values)
                  }}
                />
              ) : view?.mode === 'gallery' || view?.mode === 'list' ? (
                <DatabaseCollection
                  mode={view.mode}
                  fields={
                    view.config.show_card_properties === false
                      ? []
                      : visibleFields
                  }
                  records={groupRecords}
                />
              ) : (
                <DatabaseTable
                  fields={visibleFields}
                  records={groupRecords}
                  config={view?.config}
                  onAddField={() => {
                    setEditingField(undefined)
                    setEditor('field')
                  }}
                  onEditField={field => {
                    setEditingField(field)
                    setEditor('field')
                  }}
                />
              )
            }
          </DatabaseGroups>
        </Box>
      )}
    </Stack>
  )
}
