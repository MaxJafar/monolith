import dayjs from 'dayjs'

import { useModuleTranslation } from '@lifeforge/localization'
import {
  Button,
  DateInput,
  Flex,
  Grid,
  ListboxInput,
  ListboxOption,
  Text,
  TextInput
} from '@lifeforge/ui'

import { useDatabases } from '@/DatabaseProvider'

import {
  type CellValue,
  type Field,
  type ViewConfig,
  relativeDateWindow
} from '../../../shared'
import { SelectInput } from './SelectInput'

type Filter = ViewConfig['filters'][number]

export function FilterEditor({
  fields,
  filter,
  onChange,
  onRemove
}: {
  fields: Field[]
  filter: Filter
  onChange: (filter: Filter) => void
  onRemove: () => void
}) {
  const { t } = useModuleTranslation()
  const { data, people } = useDatabases()

  const field = fields.find(field => field.id === filter.field_id)
  const kind = field?.kind ?? 'text'
  const operators: Filter['operator'][] = [
    'equals',
    'not-equals',
    'empty',
    'not-empty',
    ...(['text', 'select', 'multi-select'].includes(kind)
      ? ['contains' as const]
      : []),
    ...(kind === 'number' ? ['greater' as const, 'less' as const] : []),
    ...(kind === 'date'
      ? [
          'before' as const,
          'after' as const,
          'on-or-before' as const,
          'on-or-after' as const,
          'relative-date' as const
        ]
      : []),
    ...(['multi-select', 'relation'].includes(kind)
      ? [
          'includes' as const,
          'not-includes' as const,
          'includes-any' as const,
          'includes-all' as const
        ]
      : [])
  ]
  const choices =
    kind === 'person'
      ? people.map(person => ({ value: person.id, label: person.label }))
      : kind === 'relation'
        ? data.records
            .filter(record => record.base_id === field?.target_base_id)
            .map(record => ({ value: record.id, label: record.title }))
        : (field?.config.options.map(option => ({
            value: option,
            label: field.id === 'item_type' ? t(`itemTypes.${option}`) : option
          })) ?? [])
  const multiple =
    filter.operator === 'includes-any' || filter.operator === 'includes-all'

  function changeOperator(operator: Filter['operator']) {
    let value: CellValue =
      kind === 'checkbox'
        ? false
        : kind === 'number'
          ? 0
          : (choices[0]?.value ?? '')
    if (operator === 'relative-date') value = 'today'
    if (operator === 'includes-any' || operator === 'includes-all') value = []
    onChange({
      ...filter,
      operator,
      ...(['empty', 'not-empty'].includes(operator)
        ? { value: undefined }
        : { value })
    })
  }

  function parse(value: string): CellValue {
    return kind === 'number'
      ? Number(value)
      : kind === 'checkbox'
        ? value === 'true'
        : value
  }

  const inputValue = String(filter.value ?? '')

  return (
    <Flex align="center" gap="sm" wrap="wrap">
      <Grid flex="1" gap="sm" templateCols={{ base: 1, md: 3 }}>
        <SelectInput
          label={t('inputs.filterField')}
          options={[
            { value: 'title', label: t('inputs.recordTitle') },
            ...fields.map(field => ({ value: field.id, label: field.name }))
          ]}
          value={filter.field_id}
          onChange={value => onChange({ field_id: value, operator: 'empty' })}
        />
        <SelectInput
          label={t('inputs.operator')}
          options={operators.map(value => ({
            value,
            label: t(`operators.${value}`)
          }))}
          value={filter.operator}
          onChange={value => changeOperator(value as Filter['operator'])}
        />
        {!['empty', 'not-empty'].includes(filter.operator) &&
          (multiple ? (
            <ListboxInput
              customActive
              multiple
              icon="tabler:tags"
              label="inputs.filterValue"
              renderContent={() => (
                <Text>
                  {choices
                    .filter(
                      choice =>
                        Array.isArray(filter.value) &&
                        filter.value.includes(choice.value)
                    )
                    .map(choice => choice.label)
                    .join(', ') || t('chooseValues')}
                </Text>
              )}
              value={Array.isArray(filter.value) ? filter.value : []}
              onChange={value => onChange({ ...filter, value })}
            >
              {choices.map(choice => (
                <ListboxOption
                  key={choice.value}
                  label={choice.label}
                  value={choice.value}
                />
              ))}
            </ListboxInput>
          ) : filter.operator === 'relative-date' ? (
            <SelectInput
              label={t('inputs.filterValue')}
              options={relativeDateWindow.options.map(value => ({
                value,
                label: t(`dateWindows.${value}`)
              }))}
              value={inputValue}
              onChange={value => onChange({ ...filter, value })}
            />
          ) : kind === 'date' ? (
            <DateInput
              icon="tabler:calendar"
              label="inputs.filterValue"
              value={inputValue ? dayjs(inputValue).toDate() : null}
              onChange={date =>
                onChange({
                  ...filter,
                  value: date ? dayjs(date).format('YYYY-MM-DD') : ''
                })
              }
            />
          ) : kind === 'checkbox' ? (
            <SelectInput
              label={t('inputs.filterValue')}
              options={[
                { value: 'true', label: t('checked') },
                { value: 'false', label: t('unchecked') }
              ]}
              value={inputValue}
              onChange={value => onChange({ ...filter, value: parse(value) })}
            />
          ) : ['person', 'relation', 'select', 'multi-select'].includes(
              kind
            ) ? (
            <SelectInput
              label={t('inputs.filterValue')}
              options={choices}
              value={inputValue}
              onChange={value => onChange({ ...filter, value })}
            />
          ) : (
            <TextInput
              icon="tabler:filter"
              inputMode={kind === 'number' ? 'decimal' : 'text'}
              label="inputs.filterValue"
              placeholder=""
              value={inputValue}
              onChange={value => onChange({ ...filter, value: parse(value) })}
            />
          ))}
      </Grid>
      <Button
        dangerous
        aria-label={t('removeFilter')}
        icon="tabler:x"
        variant="plain"
        onClick={onRemove}
      />
    </Flex>
  )
}
