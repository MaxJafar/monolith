import { useModuleTranslation } from '@monolith/localization'
import { Box, Button, ChoiceSelect, FloatingPopover, Stack } from '@monolith/ui'
import { useState } from 'react'

import { useDatabases } from '@/DatabaseProvider'
import { propertyIcons } from '@/utils/fieldPresentation'

import { numericKinds, textKinds } from '../../../computed'
import {
  type Field,
  type ViewConfig,
  relativeDateWindow
} from '../../../shared'

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
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const field = fields.find(field => field.id === filter.field_id)
  const kind = field?.kind || 'text'
  const isDate = ['date', 'created-time', 'last-edited-time'].includes(kind)
  const operators: Filter['operator'][] = [
    'equals',
    'not-equals',
    ...([...textKinds, 'select', 'status', 'multi-select'].includes(kind)
      ? ['contains' as const]
      : []),
    ...(numericKinds.has(kind) ? ['greater' as const, 'less' as const] : []),
    ...(isDate
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
      : []),
    'empty',
    'not-empty'
  ]
  const choices = ['person', 'created-by', 'last-edited-by'].includes(kind)
    ? people.map(person => ({ value: person.id, label: person.label }))
    : kind === 'relation'
      ? data.records
          .filter(record =>
            field?.id === 'project_id'
              ? record.item_type === 'project'
              : record.base_id === field?.target_base_id
          )
          .map(record => ({ value: record.id, label: record.title }))
      : (field?.config.options || []).map(value => ({
          value,
          label: field?.id === 'item_type' ? t('itemTypes.' + value) : value
        }))
  const multiple = ['includes-any', 'includes-all'].includes(filter.operator)
  const valueLabel = t('inputs.filterValue')
  return (
    <div className="database-filter-rule">
      <ChoiceSelect
        label={t('inputs.filterField')}
        value={filter.field_id}
        options={[
          {
            value: 'title',
            label: t('inputs.recordTitle'),
            icon: 'lucide:file-text'
          },
          ...fields.map(field => ({
            value: field.id,
            label: field.name,
            icon: propertyIcons[field.kind]
          }))
        ]}
        onChange={field_id =>
          onChange({
            field_id,
            operator: field_id === 'title' ? 'contains' : 'not-empty',
            ...(field_id === 'title' ? { value: '' } : {})
          })
        }
      />
      <ChoiceSelect
        label={t('inputs.operator')}
        value={filter.operator}
        options={operators.map(value => ({
          value,
          label: t('operators.' + value)
        }))}
        onChange={value => {
          const operator = value as Filter['operator']
          onChange({
            ...filter,
            operator,
            value: ['empty', 'not-empty'].includes(operator)
              ? undefined
              : operator === 'relative-date'
                ? 'today'
                : ['includes-any', 'includes-all'].includes(operator)
                  ? []
                  : kind === 'checkbox'
                    ? false
                    : numericKinds.has(kind)
                      ? 0
                      : ''
          })
        }}
      />
      {!['empty', 'not-empty'].includes(filter.operator) &&
        (multiple ? (
          <>
            <Button
              namespace={false}
              variant="plain"
              aria-label={valueLabel}
              className="database-filter-value"
              onClick={e => setAnchor(e.currentTarget)}
            >
              {Array.isArray(filter.value) && filter.value.length
                ? choices
                    .filter(
                      c =>
                        Array.isArray(filter.value) &&
                        filter.value.includes(c.value)
                    )
                    .map(c => c.label)
                    .join(', ')
                : t('chooseValues')}
            </Button>
            {anchor && (
              <FloatingPopover
                anchor={anchor}
                label={valueLabel}
                width={240}
                onClose={() => setAnchor(null)}
              >
                <Stack gap="xs">
                  {choices.map(choice => (
                    <label
                      className="database-filter-choice"
                      key={choice.value}
                    >
                      <input
                        type="checkbox"
                        checked={
                          Array.isArray(filter.value) &&
                          filter.value.includes(choice.value)
                        }
                        onChange={event => {
                          const values = Array.isArray(filter.value)
                            ? filter.value
                            : []
                          onChange({
                            ...filter,
                            value: event.target.checked
                              ? [...values, choice.value]
                              : values.filter(value => value !== choice.value)
                          })
                        }}
                      />
                      {choice.label}
                    </label>
                  ))}
                </Stack>
              </FloatingPopover>
            )}
          </>
        ) : filter.operator === 'relative-date' ? (
          <ChoiceSelect
            label={valueLabel}
            value={String(filter.value || 'today')}
            options={relativeDateWindow.options.map(value => ({
              value,
              label: t('dateWindows.' + value)
            }))}
            onChange={value => onChange({ ...filter, value })}
          />
        ) : kind === 'checkbox' ? (
          <ChoiceSelect
            label={valueLabel}
            value={String(filter.value ?? false)}
            options={['true', 'false'].map(value => ({
              value,
              label: t(value === 'true' ? 'checked' : 'unchecked')
            }))}
            onChange={value => onChange({ ...filter, value: value === 'true' })}
          />
        ) : choices.length ||
          [
            'select',
            'status',
            'multi-select',
            'relation',
            'person',
            'created-by',
            'last-edited-by'
          ].includes(kind) ? (
          <ChoiceSelect
            label={valueLabel}
            value={String(filter.value ?? '')}
            options={[{ value: '', label: t('chooseValues') }, ...choices]}
            onChange={value => onChange({ ...filter, value })}
          />
        ) : (
          <Box
            as="input"
            className="database-filter-value"
            aria-label={valueLabel}
            placeholder={t('filterValuePlaceholder')}
            type={isDate ? 'date' : numericKinds.has(kind) ? 'number' : 'text'}
            value={String(filter.value ?? '')}
            onChange={e =>
              onChange({
                ...filter,
                value:
                  numericKinds.has(kind) && e.target.value !== ''
                    ? Number(e.target.value)
                    : e.target.value
              })
            }
          />
        ))}
      <Button
        namespace={false}
        variant="plain"
        icon="lucide:x"
        aria-label={t('removeFilter')}
        onClick={onRemove}
      />
    </div>
  )
}
