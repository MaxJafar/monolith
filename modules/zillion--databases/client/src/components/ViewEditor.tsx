import { useState } from 'react'

import { useModuleTranslation } from '@lifeforge/localization'
import {
  Button,
  Checkbox,
  Flex,
  Grid,
  Stack,
  Text,
  TextInput
} from '@lifeforge/ui'

import { useDatabases } from '@/DatabaseProvider'

import {
  type SavedView,
  type ViewConfig,
  viewConfigSchema,
  viewMode,
  viewProperties
} from '../../../shared'
import { FilterEditor } from './FilterEditor'
import { FilterGroupEditor } from './FilterGroupEditor'
import { SelectInput } from './SelectInput'

export function ViewEditor({
  view,
  onDone
}: {
  view?: SavedView
  onDone: () => void
}) {
  const { api: forgeAPI, data, base, run, busy, selectView } = useDatabases()
  const { t } = useModuleTranslation()
  const [name, setName] = useState(view?.name ?? '')
  const [mode, setMode] = useState<SavedView['mode']>(view?.mode ?? 'table')
  
const [group, setGroup] = useState(
    view?.config.group_property ?? view?.group_field_id ?? 'done'
  )

  const [config, setConfig] = useState<ViewConfig>(
    viewConfigSchema.parse(view?.config ?? {})
  )
  const customFields = data.fields.filter(field => field.base_id === base?.id)
  const fields = [...viewProperties(base?.id ?? '', t), ...customFields]
  const groupFields = fields.filter(field =>
    ['select', 'checkbox'].includes(field.kind)
  )
  const dateFields = fields.filter(field => field.kind === 'date')
  const filterCount =
    config.filters.length +
    (config.filter_groups ?? []).reduce(
      (count, group) => count + group.filters.length,
      0
    )

  async function save() {
    if (!base) return

    const input = {
      name,
      mode,
      group_field_id:
        mode === 'kanban' && !['item_type', 'done'].includes(group)
          ? group
          : null,
      config: viewConfigSchema.parse({
        ...config,
        group_property:
          mode === 'kanban' && ['item_type', 'done'].includes(group)
            ? group
            : null
      })
    }
    const result = await run(() =>
      view
        ? forgeAPI.updateView.input({ id: view.id }).mutate(input)
        : forgeAPI.createView.mutate({ base_id: base.id, ...input })
    )

    if (result) {
      selectView(result.id)
      onDone()
    }
  }

  return (
    <Stack bg={{ base: 'bg-100', dark: 'bg-900' }} gap="md" p="lg" r="lg">
      <Text as="h3" size="lg" weight="semibold">
        {t(view ? 'editView' : 'newView')}
      </Text>
      <Grid gap="md" templateCols={{ base: 1, md: 3 }}>
        <TextInput
          required
          icon="tabler:layout"
          label="inputs.viewName"
          placeholder=""
          value={name}
          onChange={setName}
        />
        <SelectInput
          label={t('inputs.viewMode')}
          options={viewMode.options.map(value => ({
            value,
            label: t(value)
          }))}
          value={mode}
          onChange={value => {
            setMode(value as SavedView['mode'])
            if (
              value === 'calendar' &&
              !dateFields.some(field => field.id === config.date_field_id)
            )
              setConfig(config => ({
                ...config,
                date_field_id: dateFields[0]?.id ?? null,
                end_date_field_id: null
              }))
          }}
        />
        {mode === 'kanban' && (
          <SelectInput
            label={t('inputs.groupBy')}
            options={groupFields.map(field => ({
              value: field.id,
              label: field.name
            }))}
            value={group}
            onChange={setGroup}
          />
        )}
        {mode === 'calendar' && (
          <>
            <SelectInput
              label={t('inputs.dateField')}
              options={dateFields.map(field => ({
                value: field.id,
                label: field.name
              }))}
              value={config.date_field_id ?? ''}
              onChange={value =>
                setConfig(config => ({
                  ...config,
                  date_field_id: value,
                  end_date_field_id:
                    config.end_date_field_id === value
                      ? null
                      : config.end_date_field_id
                }))
              }
            />
            <SelectInput
              label={t('inputs.endDateField')}
              options={[
                { value: '', label: t('calendarView.singleDay') },
                ...dateFields
                  .filter(field => field.id !== config.date_field_id)
                  .map(field => ({ value: field.id, label: field.name }))
              ]}
              value={config.end_date_field_id ?? ''}
              onChange={value =>
                setConfig(config => ({
                  ...config,
                  end_date_field_id: value || null
                }))
              }
            />
          </>
        )}
      </Grid>
      {mode === 'kanban' && !groupFields.length && (
        <Text color="muted">{t('kanbanHelp')}</Text>
      )}
      {mode === 'calendar' && (
        <Text color="muted">
          {t(
            dateFields.length
              ? 'calendarView.setupHelp'
              : 'calendarView.noDateFields'
          )}
        </Text>
      )}
      <Text weight="semibold">{t('filters')}</Text>
      <Text color="muted">{t('filterHelp')}</Text>
      <SelectInput
        label={t('inputs.filterLogic')}
        options={['and', 'or'].map(value => ({
          value,
          label: t(`filterLogic.${value}`)
        }))}
        value={config.filter_logic ?? 'and'}
        onChange={value =>
          setConfig(config => ({
            ...config,
            filter_logic: value as 'and' | 'or'
          }))
        }
      />
      {config.filters.map((filter, index) => (
        <FilterEditor
          key={index}
          fields={fields}
          filter={filter}
          onChange={filter =>
            setConfig(config => ({
              ...config,
              filters: config.filters.map((current, i) =>
                i === index ? filter : current
              )
            }))
          }
          onRemove={() =>
            setConfig(config => ({
              ...config,
              filters: config.filters.filter((_, i) => i !== index)
            }))
          }
        />
      ))}
      <Button
        disabled={config.filters.length >= 20 || filterCount >= 50}
        icon="tabler:plus"
        justify="start"
        variant="plain"
        onClick={() =>
          setConfig(config => ({
            ...config,
            filters: [
              ...config.filters,
              { field_id: 'title', operator: 'contains', value: '' }
            ]
          }))
        }
      >
        addFilter
      </Button>
      {(config.filter_groups ?? []).map((group, index) => (
        <FilterGroupEditor
          key={index}
          canAdd={filterCount < 50}
          fields={fields}
          group={group}
          index={index}
          onChange={group =>
            setConfig(config => ({
              ...config,
              filter_groups: (config.filter_groups ?? []).map((current, i) =>
                i === index ? group : current
              )
            }))
          }
          onRemove={() =>
            setConfig(config => ({
              ...config,
              filter_groups: (config.filter_groups ?? []).filter(
                (_, i) => i !== index
              )
            }))
          }
        />
      ))}
      <Flex gap="sm" wrap="wrap">
        <Button
          disabled={(config.filter_groups?.length ?? 0) >= 5}
          icon="tabler:brackets"
          variant="plain"
          onClick={() =>
            setConfig(config => ({
              ...config,
              filter_groups: [
                ...(config.filter_groups ?? []),
                { filter_logic: 'or', filters: [] }
              ]
            }))
          }
        >
          addFilterGroup
        </Button>
        <Button
          disabled={filterCount === 0 && !config.filter_groups?.length}
          icon="tabler:filter-off"
          variant="plain"
          onClick={() =>
            setConfig(config => ({
              ...config,
              filters: [],
              filter_groups: [],
              filter_logic: 'and'
            }))
          }
        >
          clearFilters
        </Button>
      </Flex>
      <Text weight="semibold">{t('sort')}</Text>
      {config.sorts.map((sort, index) => (
        <Flex key={index} gap="sm" wrap="wrap">
          <SelectInput
            label={t('inputs.sortField')}
            options={[
              { value: 'title', label: t('inputs.recordTitle') },
              ...fields.map(field => ({ value: field.id, label: field.name }))
            ]}
            value={sort.field_id}
            onChange={value =>
              setConfig(config => ({
                ...config,
                sorts: config.sorts.map((sort, i) =>
                  i === index ? { ...sort, field_id: value } : sort
                )
              }))
            }
          />
          <SelectInput
            label={t('inputs.direction')}
            options={['asc', 'desc'].map(value => ({ value, label: t(value) }))}
            value={sort.direction}
            onChange={value =>
              setConfig(config => ({
                ...config,
                sorts: config.sorts.map((sort, i) =>
                  i === index
                    ? { ...sort, direction: value as 'asc' | 'desc' }
                    : sort
                )
              }))
            }
          />
          <Button
            dangerous
            aria-label={t('removeSort')}
            icon="tabler:x"
            variant="plain"
            onClick={() =>
              setConfig(config => ({
                ...config,
                sorts: config.sorts.filter((_, i) => i !== index)
              }))
            }
          />
        </Flex>
      ))}
      <Button
        disabled={config.sorts.length >= 10}
        icon="tabler:plus"
        justify="start"
        variant="plain"
        onClick={() =>
          setConfig(config => ({
            ...config,
            sorts: [...config.sorts, { field_id: 'title', direction: 'asc' }]
          }))
        }
      >
        addSort
      </Button>
      <Text weight="semibold">{t('visibleFields')}</Text>
      <Flex gap="md" wrap="wrap">
        {customFields.map(field => (
          <Flex
            key={field.id}
            align="center"
            as="label"
            gap="sm"
            minHeight="44px"
          >
            <Checkbox
              checked={!config.hidden_fields.includes(field.id)}
              onCheckedChange={checked =>
                setConfig(config => ({
                  ...config,
                  hidden_fields: checked
                    ? config.hidden_fields.filter(id => id !== field.id)
                    : [...config.hidden_fields, field.id]
                }))
              }
            />
            <Text>{field.name}</Text>
          </Flex>
        ))}
      </Flex>
      <Flex gap="sm" wrap="wrap">
        <Button
          disabled={
            !name.trim() ||
            (mode === 'kanban' && !group) ||
            (mode === 'calendar' &&
              !dateFields.some(field => field.id === config.date_field_id))
          }
          icon="tabler:check"
          loading={busy}
          onClick={() => {
            void save()
          }}
        >
          saveView
        </Button>
        <Button variant="secondary" onClick={onDone}>
          cancel
        </Button>
        {view && (
          <Button
            dangerous
            icon="tabler:trash"
            variant="secondary"
            onClick={() => {
              if (window.confirm(t('confirmDeleteView')))
                void run(async () => {
                  await forgeAPI.removeView
                    .input({ id: view.id })
                    .mutate(undefined)
                  onDone()
                })
            }}
          >
            delete
          </Button>
        )}
      </Flex>
    </Stack>
  )
}
