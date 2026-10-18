import { useModuleTranslation } from '@monolith/localization'
import {
  Box,
  Button,
  ChoiceSelect,
  DatabaseLayoutPicker,
  Flex,
  Icon,
  Stack,
  Text
} from '@monolith/ui'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useDatabases } from '@/DatabaseProvider'
import { propertyIcons } from '@/utils/fieldPresentation'
import { viewIcons } from '@/utils/viewLayouts'

import { numericKinds } from '../../../computed'
import {
  type SavedView,
  type ViewConfig,
  viewConfigSchema,
  viewProperties
} from '../../../shared'
import { AdvancedFilters } from './AdvancedFilters'
import { ViewAppearanceFields } from './ViewAppearanceEditor'
import { ViewColorsEditor } from './ViewColorsEditor'
import { filtersReady, useViewAutosave } from './useViewAutosave'

const builtinGroups = [
  'item_type',
  'done',
  'status',
  'priority',
  'tags',
  'project_id'
]

export function ViewEditor({
  view,
  onDone,
  initialSection = 'overview',
  onCreateSource
}: {
  view?: SavedView
  onDone: () => void
  initialSection?: string
  onCreateSource?: () => void
}) {
  const { api, data, base, run, busy, selectView } = useDatabases()
  const { t } = useModuleTranslation()
  const { t: layoutName } = useTranslation('common', {
    keyPrefix: 'inlineDatabase.modes'
  })
  const [section, setSection] = useState(initialSection)
  const [name, setName] = useState(view?.name ?? t('table'))
  const [mode, setMode] = useState<SavedView['mode']>(view?.mode ?? 'table')
  const [group, setGroup] = useState(
    view?.config.group_property ?? view?.group_field_id ?? 'done'
  )
  const [config, setConfig] = useState<ViewConfig>(
    viewConfigSchema.parse(view?.config ?? {})
  )
  const [search, setSearch] = useState('')
  const customFields = data.fields.filter(field => field.base_id === base?.id)
  const fields = [...viewProperties(base?.id ?? '', t), ...customFields]
  const groupFields = fields.filter(field =>
    [
      'select',
      'status',
      'checkbox',
      'multi-select',
      'relation',
      'person'
    ].includes(field.kind)
  )
  const dateFields = fields.filter(field => field.kind === 'date')
  const numberFields = fields.filter(field => numericKinds.has(field.kind))
  const order = new Map((config.property_order ?? []).map((id, i) => [id, i]))
  const ordered = [...customFields].sort(
    (a, b) => (order.get(a.id) ?? 1000) - (order.get(b.id) ?? 1000)
  )
  const input = {
    name,
    mode,
    group_field_id:
      mode === 'kanban' && !builtinGroups.includes(group) ? group : null,
    config: {
      ...config,
      group_property:
        mode === 'kanban' && builtinGroups.includes(group)
          ? (group as ViewConfig['group_property'])
          : null
    }
  }
  const valid =
    filtersReady(config, fields) &&
    !!name.trim() &&
    (mode !== 'kanban' || !!group) &&
    (!['calendar', 'timeline'].includes(mode) ||
      dateFields.some(f => f.id === config.date_field_id))
  const save = useViewAutosave(view, input, valid)
  const changeMode = (value: SavedView['mode']) => {
    setMode(value)
    if (
      ['calendar', 'timeline'].includes(value) &&
      !dateFields.some(f => f.id === config.date_field_id)
    )
      setConfig(c => ({
        ...c,
        date_field_id: dateFields[0]?.id ?? null,
        end_date_field_id: null
      }))
  }
  async function create(value: SavedView['mode']) {
    if (!base || busy) return
    const next = viewConfigSchema.parse({
      show_item_type: false,
      ...(['calendar', 'timeline'].includes(value)
        ? { date_field_id: dateFields[0]?.id ?? 'date' }
        : {}),
      ...(value === 'kanban' ? { group_property: 'status' } : {})
    })
    const result = await run(() =>
      api.createView.mutate({
        base_id: base.id,
        name: layoutName(value),
        mode: value,
        group_field_id: null,
        config: next
      })
    )
    if (result) {
      selectView(result.id)
      onDone()
    }
  }
  const layouts = (
    <DatabaseLayoutPicker
      selected={view ? mode : undefined}
      focusMode={mode}
      disabled={busy && !view}
      onSelect={value => (view ? changeMode(value) : void create(value))}
    />
  )
  const choose = (
    label: string,
    value: string,
    options: { value: string; label: string }[],
    onChange: (value: string) => void
  ) => (
    <div className="database-compact-setting">
      <Text size="sm">{label}</Text>
      <ChoiceSelect
        label={label}
        value={value}
        options={options}
        onChange={onChange}
      />
    </div>
  )
  const toggle = (
    label: string,
    checked: boolean,
    onChange: (checked: boolean) => void
  ) => (
    <label className="database-compact-toggle">
      <span>{label}</span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
      />
    </label>
  )

  if (!view)
    return (
      <Stack gap="sm" className="database-view-settings">
        {layouts}
        {onCreateSource && (
          <Button
            namespace={false}
            variant="plain"
            icon="lucide:copy-plus"
            justify="start"
            onClick={onCreateSource}
          >
            {t('newDataSource')}
          </Button>
        )}
      </Stack>
    )
  if (view.config.locked)
    return (
      <Stack gap="sm">
        <Text size="sm">{t('viewLockedHelp')}</Text>
        <Button
          namespace={false}
          variant="plain"
          icon="lucide:lock-open"
          onClick={() =>
            void run(async () => {
              await api.updateView.input({ id: view.id }).mutate({
                ...view,
                config: viewConfigSchema.parse({
                  ...view.config,
                  locked: false
                })
              })
              onDone()
              return true
            })
          }
        >
          {t('unlockView')}
        </Button>
      </Stack>
    )
  return (
    <Stack gap="xs" className="database-view-settings">
      <div key={section} className="database-settings-content">
        {section === 'overview' ? (
          <>
            <button
              type="button"
              className="database-settings-identity"
              aria-label={t('viewAppearance')}
              onClick={() => setSection('appearance')}
            >
              <Icon
                icon={config.tab?.icon || viewIcons[mode]}
                preserveStyle
                size="18px"
                style={{ color: config.tab?.icon_color || 'var(--text-muted)' }}
              />
              <span style={{ color: config.tab?.text_color }}>{name}</span>
              <Icon icon="lucide:pencil" size="14px" />
            </button>
            <div className="database-settings-divider" />
            {[
              ['layout', 'lucide:layout-template', 'viewLayout', t(mode)],
              [
                'properties',
                'lucide:eye',
                'propertyVisibility',
                String(
                  customFields.filter(f => !config.hidden_fields.includes(f.id))
                    .length
                )
              ],
              [
                'filters',
                'lucide:filter',
                'filters',
                String(
                  config.filters.length +
                    (config.filter_groups ?? []).reduce(
                      (n, g) => n + g.filters.length,
                      0
                    )
                )
              ],
              [
                'sort',
                'lucide:arrow-up-down',
                'sort',
                config.sorts.length ? String(config.sorts.length) : ''
              ],
              [
                'groups',
                'lucide:group',
                'inputs.groupBy',
                fields.find(
                  f =>
                    f.id ===
                    (mode === 'kanban' ? group : config.collection_group_by)
                )?.name ?? ''
              ],
              ['colors', 'lucide:paint-roller', 'conditionalColor', '']
            ].map(([id, icon, label, detail]) => (
              <button
                key={id}
                type="button"
                className="database-settings-row"
                onClick={() => setSection(id!)}
              >
                <Icon icon={icon!} size="16px" />
                <Flex justify="between" align="center" width="100%" gap="sm">
                  <Text size="sm">{t(label!)}</Text>
                  <Flex gap="xs" align="center">
                    <Text size="xs" color="muted">
                      {detail}
                    </Text>
                    <Icon icon="lucide:chevron-right" size="14px" />
                  </Flex>
                </Flex>
              </button>
            ))}
            <div className="database-settings-divider" />
            <Text size="xs" color="muted" px="sm" py="xs">
              {t('dataSource')}
            </Text>
            <Flex px="sm" py="xs" gap="sm" align="center">
              <Icon icon="lucide:database" size="16px" />
              <Text size="sm">{base?.name}</Text>
            </Flex>
            {toggle(t('lockView'), config.locked ?? false, locked =>
              setConfig(c => ({ ...c, locked }))
            )}
            <Button
              namespace={false}
              variant="plain"
              icon="lucide:trash-2"
              justify="start"
              className="database-settings-row"
              onClick={() => {
                if (window.confirm(t('confirmDeleteView')))
                  void run(async () => {
                    await api.removeView
                      .input({ id: view.id })
                      .mutate(undefined)
                    onDone()
                  })
              }}
            >
              {t('buttons.delete')}
            </Button>
          </>
        ) : (
          <Button
            namespace={false}
            variant="plain"
            icon="lucide:arrow-left"
            justify="start"
            className="database-settings-back"
            onClick={() => setSection('overview')}
          >
            {t(
              (
                {
                  layout: 'viewLayout',
                  appearance: 'viewAppearance',
                  properties: 'propertyVisibility',
                  filters: 'filters',
                  sort: 'sort',
                  groups: 'inputs.groupBy',
                  colors: 'conditionalColor'
                } as Record<string, string>
              )[section] ?? 'viewSettings'
            )}
          </Button>
        )}
        {section === 'appearance' && (
          <ViewAppearanceFields
            name={name}
            mode={mode}
            tab={config.tab}
            onNameChange={setName}
            onChange={tab => setConfig(c => ({ ...c, tab }))}
          />
        )}
        {section === 'layout' && (
          <Stack gap="sm">
            {layouts}
            {mode === 'table' &&
              toggle(t('wrapCells'), config.wrap_cells !== false, wrap_cells =>
                setConfig(c => ({ ...c, wrap_cells }))
              )}
            {mode === 'kanban' &&
              choose(
                t('inputs.groupBy'),
                group,
                groupFields.map(f => ({ value: f.id, label: f.name })),
                setGroup
              )}
            {['calendar', 'timeline'].includes(mode) && (
              <>
                {choose(
                  t('inputs.dateField'),
                  config.date_field_id ?? '',
                  dateFields.map(f => ({ value: f.id, label: f.name })),
                  value =>
                    setConfig(c => ({
                      ...c,
                      date_field_id: value,
                      end_date_field_id:
                        c.end_date_field_id === value
                          ? null
                          : c.end_date_field_id
                    }))
                )}
                {choose(
                  t('inputs.endDateField'),
                  config.end_date_field_id ?? '',
                  [
                    { value: '', label: t('calendarView.singleDay') },
                    ...dateFields
                      .filter(f => f.id !== config.date_field_id)
                      .map(f => ({ value: f.id, label: f.name }))
                  ],
                  value =>
                    setConfig(c => ({ ...c, end_date_field_id: value || null }))
                )}
              </>
            )}
            {['chart', 'dashboard'].includes(mode) && (
              <>
                {choose(
                  t('chartGroupBy'),
                  config.chart?.group_by ?? '',
                  [
                    { value: '', label: t('allRecords') },
                    ...groupFields.map(f => ({ value: f.id, label: f.name }))
                  ],
                  value =>
                    setConfig(c => ({
                      ...c,
                      chart: {
                        aggregation: 'count',
                        value_field: null,
                        ...c.chart,
                        group_by: value || null
                      }
                    }))
                )}
                {choose(
                  t('chartAggregation'),
                  config.chart?.aggregation ?? 'count',
                  (numberFields.length
                    ? ['count', 'sum', 'average']
                    : ['count']
                  ).map(value => ({
                    value,
                    label: t('aggregations.' + value)
                  })),
                  value =>
                    setConfig(c => ({
                      ...c,
                      chart: {
                        group_by: null,
                        ...c.chart,
                        value_field:
                          c.chart?.value_field ?? numberFields[0]?.id ?? null,
                        aggregation: value as 'count' | 'sum' | 'average'
                      }
                    }))
                )}
                {config.chart?.aggregation !== 'count' &&
                  config.chart?.aggregation &&
                  choose(
                    t('chartValue'),
                    config.chart.value_field ?? '',
                    numberFields.map(f => ({ value: f.id, label: f.name })),
                    value =>
                      setConfig(c => ({
                        ...c,
                        chart: {
                          aggregation: 'count',
                          group_by: null,
                          ...c.chart,
                          value_field: value || null
                        }
                      }))
                  )}
              </>
            )}
          </Stack>
        )}
        {section === 'filters' && (
          <AdvancedFilters
            fields={fields}
            config={config}
            onChange={setConfig}
          />
        )}
        {section === 'colors' && (
          <ViewColorsEditor
            config={config}
            fields={fields}
            records={data.records.filter(r => r.base_id === base?.id)}
            onChange={setConfig}
          />
        )}
        {section === 'groups' && (
          <Stack gap="xs">
            {choose(
              t('inputs.groupBy'),
              mode === 'kanban' ? group : (config.collection_group_by ?? ''),
              [
                ...(mode === 'kanban'
                  ? []
                  : [{ value: '', label: t('noGrouping') }]),
                ...groupFields.map(f => ({ value: f.id, label: f.name }))
              ],
              value =>
                mode === 'kanban'
                  ? setGroup(value)
                  : setConfig(c => ({
                      ...c,
                      collection_group_by: value || null,
                      sub_group_by:
                        c.sub_group_by === value ? null : c.sub_group_by
                    }))
            )}
            {choose(
              t('subGroup'),
              config.sub_group_by ?? '',
              [
                { value: '', label: t('noGrouping') },
                ...groupFields
                  .filter(
                    f =>
                      f.id !==
                      (mode === 'kanban' ? group : config.collection_group_by)
                  )
                  .map(f => ({ value: f.id, label: f.name }))
              ],
              value => setConfig(c => ({ ...c, sub_group_by: value || null }))
            )}
          </Stack>
        )}
        {section === 'properties' && (
          <Stack gap="xs">
            {toggle(
              t('showCardProperties'),
              config.show_card_properties !== false,
              show_card_properties =>
                setConfig(c => ({ ...c, show_card_properties }))
            )}
            {toggle(
              t('showPageProperties'),
              config.show_page_properties !== false,
              show_page_properties =>
                setConfig(c => ({ ...c, show_page_properties }))
            )}
            <Box
              as="input"
              className="database-filter-search"
              aria-label={t('searchProperties')}
              placeholder={t('searchProperties')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {toggle(
              t('itemType'),
              config.show_item_type !== false,
              show_item_type => setConfig(c => ({ ...c, show_item_type }))
            )}
            {[false, true].map(hidden => (
              <div key={String(hidden)}>
                <div className="database-visibility-heading">
                  <Text size="xs" color="muted">
                    {t(hidden ? 'hiddenProperties' : 'shownProperties')}
                  </Text>
                  <button
                    type="button"
                    onClick={() =>
                      setConfig(c => ({
                        ...c,
                        hidden_fields: hidden ? [] : customFields.map(f => f.id)
                      }))
                    }
                  >
                    {t(hidden ? 'showAll' : 'hideAll')}
                  </button>
                </div>
                {ordered
                  .filter(
                    f =>
                      config.hidden_fields.includes(f.id) === hidden &&
                      f.name.toLowerCase().includes(search.toLowerCase())
                  )
                  .map(field => (
                    <div className="database-visibility-row" key={field.id}>
                      <Icon icon={propertyIcons[field.kind]} size="16px" />
                      <Text size="sm" style={{ flex: 1 }}>
                        {field.name}
                      </Text>
                      <Button
                        namespace={false}
                        variant="plain"
                        icon="lucide:arrow-up"
                        aria-label={t('movePropertyUp', { name: field.name })}
                        disabled={ordered.indexOf(field) === 0}
                        onClick={() => {
                          const ids = ordered.map(f => f.id)
                          const index = ids.indexOf(field.id)
                          ;[ids[index - 1], ids[index]] = [
                            ids[index]!,
                            ids[index - 1]!
                          ]
                          setConfig(c => ({ ...c, property_order: ids }))
                        }}
                      />
                      <Button
                        namespace={false}
                        variant="plain"
                        icon={hidden ? 'lucide:eye-off' : 'lucide:eye'}
                        aria-label={t(
                          hidden ? 'showProperty' : 'hideProperty',
                          {
                            name: field.name
                          }
                        )}
                        onClick={() =>
                          setConfig(c => ({
                            ...c,
                            hidden_fields: hidden
                              ? c.hidden_fields.filter(id => id !== field.id)
                              : [...c.hidden_fields, field.id]
                          }))
                        }
                      />
                    </div>
                  ))}
              </div>
            ))}
          </Stack>
        )}
        {section === 'sort' && (
          <Stack gap="xs">
            {config.sorts.map((sort, i) => (
              <div className="database-sort-row" key={i}>
                <ChoiceSelect
                  label={t('inputs.sortField')}
                  value={sort.field_id}
                  options={[
                    { value: 'title', label: t('inputs.recordTitle') },
                    ...fields.map(f => ({ value: f.id, label: f.name }))
                  ]}
                  onChange={field_id =>
                    setConfig(c => ({
                      ...c,
                      sorts: c.sorts.map((s, n) =>
                        n === i ? { ...s, field_id } : s
                      )
                    }))
                  }
                />
                <ChoiceSelect
                  label={t('inputs.direction')}
                  value={sort.direction}
                  options={['asc', 'desc'].map(value => ({
                    value,
                    label: t(value)
                  }))}
                  onChange={direction =>
                    setConfig(c => ({
                      ...c,
                      sorts: c.sorts.map((s, n) =>
                        n === i
                          ? { ...s, direction: direction as 'asc' | 'desc' }
                          : s
                      )
                    }))
                  }
                />
                <Button
                  namespace={false}
                  variant="plain"
                  icon="lucide:x"
                  aria-label={t('removeSort')}
                  onClick={() =>
                    setConfig(c => ({
                      ...c,
                      sorts: c.sorts.filter((_, n) => n !== i)
                    }))
                  }
                />
              </div>
            ))}
            <Button
              namespace={false}
              variant="plain"
              icon="lucide:plus"
              justify="start"
              disabled={config.sorts.length >= 10}
              onClick={() =>
                setConfig(c => ({
                  ...c,
                  sorts: [...c.sorts, { field_id: 'title', direction: 'asc' }]
                }))
              }
            >
              {t('buttons.addSort')}
            </Button>
          </Stack>
        )}
      </div>
      {save.failed && (
        <Button namespace={false} variant="plain" onClick={save.retry}>
          {t('retrySave')}
        </Button>
      )}
      {save.pending && (
        <Text size="xs" color="muted" role="status">
          {t('savingPage')}
        </Text>
      )}
    </Stack>
  )
}
