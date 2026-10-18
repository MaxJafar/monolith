import { useModuleTranslation } from '@monolith/localization'
import { Box, Button, ChoiceSelect, Icon, Stack, Text } from '@monolith/ui'
import { useState } from 'react'

import { useDatabases } from '@/DatabaseProvider'
import { propertyIcons } from '@/utils/fieldPresentation'

import {
  type Field,
  type SavedView,
  type ViewConfig,
  viewConfigSchema,
  viewProperties
} from '../../../shared'
import { FilterEditor } from './FilterEditor'
import { filtersReady, useViewAutosave } from './useViewAutosave'

export function AdvancedFilters({
  config,
  fields,
  onChange
}: {
  config: ViewConfig
  fields: Field[]
  onChange: (config: ViewConfig) => void
}) {
  const { t } = useModuleTranslation()
  const count =
    config.filters.length +
    (config.filter_groups ?? []).reduce((n, g) => n + g.filters.length, 0)
  const [picking, setPicking] = useState(count === 0)
  const [query, setQuery] = useState('')
  const logic = (
    value: 'and' | 'or',
    change: (value: 'and' | 'or') => void
  ) => (
    <ChoiceSelect
      label={t('inputs.filterLogic')}
      value={value}
      options={['and', 'or'].map(value => ({
        value,
        label: t(`filterJoin.${value}`)
      }))}
      onChange={value => change(value as 'and' | 'or')}
    />
  )
  const add = (id = 'title') => {
    if (count >= 50 || config.filters.length >= 20) return
    onChange({
      ...config,
      filters: [
        ...config.filters,
        {
          field_id: id,
          operator: id === 'title' ? 'contains' : 'not-empty',
          ...(id === 'title' ? { value: '' } : {})
        }
      ]
    })
    setPicking(false)
    setQuery('')
  }
  if (picking)
    return (
      <Stack gap="xs" className="database-filter-picker">
        <Box
          as="input"
          autoFocus
          className="database-filter-search"
          aria-label={t('filterBy')}
          placeholder={t('filterBy')}
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <div className="database-filter-properties">
          {[
            {
              id: 'title',
              name: t('inputs.recordTitle'),
              kind: 'text' as const
            },
            ...fields
          ]
            .filter(field =>
              field.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())
            )
            .map(field => (
              <button
                key={field.id}
                type="button"
                onClick={() => add(field.id)}
              >
                <Icon icon={propertyIcons[field.kind]} size="16px" />
                {field.name}
              </button>
            ))}
        </div>
        <Button
          namespace={false}
          variant="plain"
          icon="lucide:plus"
          justify="start"
          onClick={() => (count ? setPicking(false) : add())}
        >
          {t('advancedFilter')}
        </Button>
      </Stack>
    )
  return (
    <Stack gap="sm" className="database-filter-builder">
      {config.filters.map((filter, index) => (
        <div className="database-filter-line" key={index}>
          <div className="database-filter-join">
            {index === 0 ? (
              <Text size="sm">{t('filterWhere')}</Text>
            ) : index === 1 ? (
              logic(config.filter_logic ?? 'and', filter_logic =>
                onChange({ ...config, filter_logic })
              )
            ) : (
              <Text size="sm">
                {t(`filterJoin.${config.filter_logic ?? 'and'}`)}
              </Text>
            )}
          </div>
          <FilterEditor
            fields={fields}
            filter={filter}
            onChange={filter =>
              onChange({
                ...config,
                filters: config.filters.map((value, i) =>
                  i === index ? filter : value
                )
              })
            }
            onRemove={() =>
              onChange({
                ...config,
                filters: config.filters.filter((_, i) => i !== index)
              })
            }
          />
        </div>
      ))}
      {(config.filter_groups ?? []).map((group, index) => (
        <div className="database-filter-group" key={index}>
          <div className="database-filter-group-heading">
            {logic(group.filter_logic, filter_logic =>
              onChange({
                ...config,
                filter_groups: config.filter_groups!.map((value, i) =>
                  i === index ? { ...group, filter_logic } : value
                )
              })
            )}
            <Text size="xs" color="muted">
              {t('filterGroup', { index: index + 1 })}
            </Text>
            <Button
              namespace={false}
              variant="plain"
              icon="lucide:x"
              aria-label={t('removeFilterGroup')}
              onClick={() =>
                onChange({
                  ...config,
                  filter_groups: config.filter_groups!.filter(
                    (_, i) => i !== index
                  )
                })
              }
            />
          </div>
          {group.filters.map((filter, i) => (
            <FilterEditor
              key={i}
              fields={fields}
              filter={filter}
              onChange={filter =>
                onChange({
                  ...config,
                  filter_groups: config.filter_groups!.map((value, n) =>
                    n === index
                      ? {
                          ...group,
                          filters: group.filters.map((rule, k) =>
                            k === i ? filter : rule
                          )
                        }
                      : value
                  )
                })
              }
              onRemove={() =>
                onChange({
                  ...config,
                  filter_groups: config.filter_groups!.map((value, n) =>
                    n === index
                      ? {
                          ...group,
                          filters: group.filters.filter((_, k) => k !== i)
                        }
                      : value
                  )
                })
              }
            />
          ))}
          <Button
            namespace={false}
            variant="plain"
            icon="lucide:plus"
            justify="start"
            disabled={count >= 50 || group.filters.length >= 20}
            onClick={() =>
              onChange({
                ...config,
                filter_groups: config.filter_groups!.map((value, n) =>
                  n === index
                    ? {
                        ...group,
                        filters: [
                          ...group.filters,
                          { field_id: 'title', operator: 'contains', value: '' }
                        ]
                      }
                    : value
                )
              })
            }
          >
            {t('addFilter')}
          </Button>
        </div>
      ))}
      {!!config.filter_groups?.length && (
        <div className="database-filter-group-heading">
          <Text size="xs" color="muted">
            {t('combineGroups')}
          </Text>
          {logic(config.filter_logic ?? 'and', filter_logic =>
            onChange({ ...config, filter_logic })
          )}
        </div>
      )}
      <div className="database-filter-actions">
        <Button
          namespace={false}
          variant="plain"
          icon="lucide:plus"
          disabled={count >= 50 || config.filters.length >= 20}
          onClick={() => setPicking(true)}
        >
          {t('addFilter')}
        </Button>
        <Button
          namespace={false}
          variant="plain"
          icon="lucide:brackets"
          disabled={(config.filter_groups?.length ?? 0) >= 5 || count >= 50}
          onClick={() =>
            onChange({
              ...config,
              filter_groups: [
                ...(config.filter_groups ?? []),
                {
                  filter_logic: 'or',
                  filters: [
                    { field_id: 'title', operator: 'contains', value: '' }
                  ]
                }
              ]
            })
          }
        >
          {t('addFilterGroup')}
        </Button>
      </div>
      <Button
        namespace={false}
        variant="plain"
        icon="lucide:trash-2"
        justify="start"
        className="database-filter-delete"
        onClick={() => {
          onChange({
            ...config,
            filters: [],
            filter_groups: [],
            filter_logic: 'and'
          })
          setPicking(true)
        }}
      >
        {t('deleteFilter')}
      </Button>
    </Stack>
  )
}

export function SavedViewFilters({ view }: { view: SavedView }) {
  const { t } = useModuleTranslation()
  const { base, data } = useDatabases()
  const [config, setConfig] = useState<ViewConfig>(
    viewConfigSchema.parse(view.config)
  )
  const save = useViewAutosave(
    view,
    {
      name: view.name,
      mode: view.mode,
      group_field_id: view.group_field_id,
      config
    },
    filtersReady(config, [...viewProperties(base?.id ?? '', t), ...data.fields])
  )
  return (
    <>
      <AdvancedFilters
        config={config}
        fields={[
          ...viewProperties(base?.id ?? '', t),
          ...data.fields.filter(f => f.base_id === base?.id)
        ]}
        onChange={setConfig}
      />
      {save.failed && (
        <Button namespace={false} variant="plain" onClick={save.retry}>
          {t('retrySave')}
        </Button>
      )}
    </>
  )
}
