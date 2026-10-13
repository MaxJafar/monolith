import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useModuleTranslation } from '@lifeforge/localization'
import {
  Box,
  Button,
  ContextMenu,
  ContextMenuItem,
  Flex,
  Stack,
  TagChip,
  Text
} from '@lifeforge/ui'

import { useDatabases } from '@/DatabaseProvider'

import {
  type CellValue,
  type Field,
  type RecordPage,
  type SavedView,
  applyView,
  viewProperties
} from '../../../shared'
import { BaseEditor } from './BaseEditor'
import { DatabaseCalendar } from './DatabaseCalendar'
import { DatabaseKanban } from './DatabaseKanban'
import { DatabaseSearch } from './DatabaseSearch'
import { DatabaseTable } from './DatabaseTable'
import { FieldEditor } from './FieldEditor'
import { RecordEditor } from './RecordEditor'
import { ViewEditor } from './ViewEditor'
import { ViewSummary } from './ViewSummary'

const emptyFields: Field[] = []
const emptyViews: SavedView[] = []
const emptyRecords: RecordPage[] = []

export function BaseBrowser() {
  const { data, index, base, selectedViewId, viewHref, busy, readOnly } =
    useDatabases()

  const { t } = useModuleTranslation()

  const [editor, setEditor] = useState<
    'base' | 'field' | 'view' | 'record' | null
  >(null)

  const [editingField, setEditingField] = useState<Field | undefined>()
  const [editingView, setEditingView] = useState<SavedView | undefined>()
  const [search, setSearch] = useState({ baseId: base?.id, query: '' })

  const searchQuery = search.baseId === base?.id ? search.query : ''

  const [initialValues, setInitialValues] = useState<Record<string, CellValue>>(
    {}
  )

  const fields = index.fieldsByBase.get(base?.id ?? '') ?? emptyFields
  const views = index.viewsByBase.get(base?.id ?? '') ?? emptyViews
  const view = views.find(view => view.id === selectedViewId) ?? views[0]
  const visibleFields = useMemo(
    () =>
      fields.filter(field => !view?.config.hidden_fields.includes(field.id)),
    [fields, view]
  )
  const baseRecords = index.recordsByBase.get(base?.id ?? '') ?? emptyRecords
  const today = dayjs().format('YYYY-MM-DD')
  const viewRecords = useMemo(
    () => applyView(baseRecords, view, data.links, { today }),
    [baseRecords, view, data.links, today]
  )
  const records = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase()

    return query
      ? viewRecords.filter(record =>
          record.title.toLocaleLowerCase().includes(query)
        )
      : viewRecords
  }, [viewRecords, searchQuery])
  const filterCount =
    (view?.config.filters.length ?? 0) +
    (view?.config.filter_groups ?? []).reduce(
      (count, group) => count + group.filters.length,
      0
    )

  if (!base)
    return (
      <Stack gap="sm" p="lg">
        <Text as="h2" size="2xl" weight="semibold">
          {t('emptyTitle')}
        </Text>
        <Text color="muted">{t('baseHelp')}</Text>
      </Stack>
    )

  if (editor === 'record')
    return (
      <RecordEditor
        initialValues={initialValues}
        onDone={() => setEditor(null)}
      />
    )

  return (
    <Stack className="zillion-workspace-enter" flex="1" gap="md" minWidth="0">
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
            <Text as="h2" size="2xl" tracking="tight" weight="semibold">
              {base.name}
            </Text>
            <Text color="muted" role="status">
              {t('recordCount', { count: records.length })}
            </Text>
          </Flex>
          {base.description && (
            <Text as="p" color="muted">
              {base.description}
            </Text>
          )}
        </Stack>
        <Flex gap="sm" width={{ base: '100%', md: 'auto' }} wrap="wrap">
          <Button
            disabled={busy || readOnly}
            icon="tabler:plus"
            minHeight={{ base: '44px', md: '36px' }}
            px="md"
            py="sm"
            onClick={() => {
              setInitialValues({})
              setEditor('record')
            }}
          >
            newRecord
          </Button>
        </Flex>
      </Flex>
      <Stack gap="xs" minWidth="0">
        <Flex align="center" gap="sm" justify="between" wrap="wrap">
          <Flex
            aria-label={t('inputs.viewName')}
            className="monolith-view-tabs"
            as="nav"
            flex="1"
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
                icon={
                  item.mode === 'kanban'
                    ? 'tabler:layout-kanban'
                    : item.mode === 'calendar'
                      ? 'tabler:calendar'
                      : 'tabler:table'
                }
                iconProps={{
                  color: view?.id === item.id ? 'primary' : 'muted'
                }}
                minHeight={{ base: '44px', md: '32px' }}
                namespace={false}
                px="sm"
                py="sm"
                r="sm"
                textProps={{
                  color: view?.id === item.id ? 'primary' : 'muted'
                }}
                to={viewHref(item.id)}
                variant={view?.id === item.id ? 'secondary' : 'plain'}
              >
                {item.name}
              </Button>
            ))}
          </Flex>
          <Flex align="center" gap="xs">
            <Button
              disabled={busy || readOnly || !view}
              icon="tabler:adjustments"
              minHeight={{ base: '44px', md: '32px' }}
              p="sm"
              variant="plain"
              onClick={() => {
                setEditingView(view)
                setEditor('view')
              }}
            >
              editView
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
                icon="tabler:plus"
                label="newView"
                onClick={() => {
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
                onClick={() => setEditor(editor === 'base' ? null : 'base')}
              />
            </ContextMenu>
          </Flex>
        </Flex>
        <Flex align="center" gap="sm" justify="between" wrap="wrap">
          <Box minWidth="0" width={{ base: '100%', md: '17rem' }}>
            <DatabaseSearch
              value={searchQuery}
              onChange={query => setSearch({ baseId: base.id, query })}
            />
          </Box>
          <Flex align="center" gap="sm" wrap="wrap">
            <Text color="muted">
              {t('visibleFields')} · {visibleFields.length}
            </Text>
            {!!view?.config.sorts.length && (
              <TagChip
                as="span"
                icon="tabler:arrows-sort"
                label={`${t('sort')} · ${view.config.sorts.length}`}
                variant="filled"
              />
            )}
            {view && filterCount > 0 && (
              <TagChip
                as="span"
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
      </Stack>
      {editor === 'base' && (
        <BaseEditor base={base} onDone={() => setEditor(null)} />
      )}
      {editor === 'field' && (
        <FieldEditor
          key={editingField?.id ?? 'new'}
          field={editingField}
          onDone={() => setEditor(null)}
        />
      )}
      {editor === 'view' && (
        <ViewEditor
          key={editingView?.id ?? 'new'}
          view={editingView}
          onDone={() => setEditor(null)}
        />
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
        <>
          {view?.mode !== 'calendar' && (
            <ViewSummary fields={visibleFields} records={records} view={view} />
          )}
          {view?.mode === 'calendar' ? (
            <DatabaseCalendar
              key={view.id}
              fields={fields}
              records={records}
              view={view}
              onCreate={values => {
                if (busy || readOnly) return
                setInitialValues(values)
                setEditor('record')
              }}
            />
          ) : view?.mode === 'kanban' ? (
            <DatabaseKanban
              fields={visibleFields}
              groupField={[...viewProperties(base.id, t), ...fields].find(
                field =>
                  field.id ===
                  (view.config.group_property ?? view.group_field_id)
              )}
              records={records}
              onCreate={values => {
                if (busy || readOnly) return
                setInitialValues(values)
                setEditor('record')
              }}
            />
          ) : (
            <DatabaseTable
              fields={visibleFields}
              records={records}
              onEditField={field => {
                setEditingField(field)
                setEditor('field')
              }}
            />
          )}
        </>
      )}
    </Stack>
  )
}
