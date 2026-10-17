import { useModuleTranslation } from '@monolith/localization'
import { Button, Flex, Icon, Stack, Text } from '@monolith/ui'
import { useState } from 'react'

import { useDatabases } from '@/DatabaseProvider'
import { propertyIcons } from '@/utils/fieldPresentation'

import { computedKinds } from '../../../computed'
import { validProgressSources } from '../../../progress'
import {
  type Field,
  type FieldConfig,
  type FieldKind,
  fieldKind
} from '../../../shared'
import { ProgressSettings } from './ProgressSettings'
import { SelectInput } from './SelectInput'

const configuredKinds = new Set([
  'relation',
  'formula',
  'rollup',
  'button',
  'progress'
])

export function FieldEditor({
  field,
  onDone
}: {
  field?: Field
  onDone: () => void
}) {
  const { api, data, base, run, busy, readOnly } = useDatabases()
  const { t } = useModuleTranslation()
  const [name, setName] = useState(field?.name ?? '')
  const [kind, setKind] = useState<FieldKind>(field?.kind ?? 'text')
  const [selectType, setSelectType] = useState(!field)
  const [typeQuery, setTypeQuery] = useState('')
  const [formula, setFormula] = useState(field?.config.formula ?? '')
  const [buttonUrl, setButtonUrl] = useState(field?.config.button_url ?? '')
  const [rollup, setRollup] = useState<FieldConfig['rollup']>(
    field?.config.rollup
  )
  const [progress, setProgress] = useState<
    NonNullable<FieldConfig['progress']>
  >(field?.config.progress ?? { checkbox_ids: [], show_number: true })
  const [optionColors, setOptionColors] = useState(
    field?.config.option_colors ?? {}
  )
  const [options, setOptions] = useState(field?.config.options ?? [])
  const [newOption, setNewOption] = useState('')
  const [target, setTarget] = useState(
    data.bases.find(item => item.id !== base?.id)?.id ?? base?.id ?? ''
  )
  const [reverseName, setReverseName] = useState('')
  const [cardinality, setCardinality] = useState<'one' | 'many'>('many')
  const [reverseCardinality, setReverseCardinality] = useState<'one' | 'many'>(
    'many'
  )
  const relationFields = data.fields.filter(
    f => f.base_id === base?.id && f.kind === 'relation'
  )
  const relationTarget = relationFields.find(
    f => f.id === rollup?.relation_id
  )?.target_base_id
  const canSave =
    !busy &&
    !readOnly &&
    (kind !== 'progress' ||
      validProgressSources(progress, base?.id ?? '', data.fields)) &&
    (kind !== 'formula' || !!formula.trim()) &&
    (kind !== 'rollup' || !!rollup) &&
    (kind !== 'relation' || !!field || !!target)

  async function save(nextKind = kind) {
    if (!base || busy || readOnly) return
    if (
      nextKind === 'progress' &&
      !validProgressSources(progress, base.id, data.fields)
    )
      return
    const draft = {
      name: name.trim() || t(`fieldTypes.${nextKind}`),
      kind: nextKind,
      options:
        !field && nextKind === 'status' && !options.length
          ? t('statusOptions')
              .split(',')
              .map(s => s.trim())
              .filter(Boolean)
          : options,
      option_colors: optionColors,
      formula: nextKind === 'formula' ? formula : undefined,
      rollup: nextKind === 'rollup' ? rollup : undefined,
      progress: nextKind === 'progress' ? progress : undefined,
      button_url: nextKind === 'button' ? buttonUrl : undefined
    }
    const result = await run(() =>
      field
        ? api.updateField.input({ id: field.id }).mutate(draft)
        : api.createField.mutate({
            ...draft,
            base_id: base.id,
            target_base_id: nextKind === 'relation' ? target : null,
            reverse_name: reverseName.trim() || undefined,
            cardinality,
            reverse_cardinality: reverseCardinality
          })
    )
    if (result) onDone()
  }
  const cardinalities = ['one', 'many'].map(value => ({
    value,
    label: t(`cardinality.${value}`)
  }))

  return (
    <Stack className="database-property-picker" gap="xs">
      <Flex align="center" gap="sm" className="database-property-name">
        <Icon icon={propertyIcons[kind]} size="16px" color="muted" />
        <input
          autoFocus
          data-autofocus
          aria-label={t('inputs.fieldName')}
          placeholder={t('inputs.fieldName')}
          maxLength={255}
          value={name}
          disabled={busy || readOnly}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => {
            if (!selectType && canSave && e.key === 'Enter') void save()
          }}
        />
      </Flex>
      {selectType ? (
        <>
          <input
            className="database-property-type-search"
            type="search"
            aria-label={t('findPropertyType')}
            placeholder={t('findPropertyType')}
            value={typeQuery}
            onChange={e => setTypeQuery(e.target.value)}
          />
          <Stack gap="xs" className="database-property-type-list">
            {fieldKind.options
              .filter(value =>
                t(`fieldTypes.${value}`)
                  .toLowerCase()
                  .includes(typeQuery.toLowerCase())
              )
              .map(value => (
                <Button
                  key={value}
                  namespace={false}
                  variant="plain"
                  justify="start"
                  icon={propertyIcons[value]}
                  disabled={busy || readOnly}
                  onClick={() => {
                    setKind(value)
                    if (configuredKinds.has(value)) {
                      setSelectType(false)
                      return
                    }
                    void save(value)
                  }}
                >
                  {t(`fieldTypes.${value}`)}
                </Button>
              ))}
          </Stack>
        </>
      ) : (
        <div className="database-settings-content" key={kind}>
          {!field && (
            <Button
              namespace={false}
              variant="plain"
              icon="lucide:arrow-left"
              justify="start"
              className="database-settings-back"
              onClick={() => setSelectType(true)}
            >
              {t(`fieldTypes.${kind}`)}
            </Button>
          )}
          {field && (
            <SelectInput
              inline
              label={t('inputs.fieldType')}
              value={kind}
              disabled={
                busy ||
                readOnly ||
                field.kind === 'relation' ||
                computedKinds.has(field.kind)
              }
              options={fieldKind.options
                .filter(
                  value =>
                    value === field.kind ||
                    (value !== 'relation' && !computedKinds.has(value))
                )
                .map(value => ({ value, label: t(`fieldTypes.${value}`) }))}
              onChange={value => setKind(value as FieldKind)}
            />
          )}
          {['select', 'status', 'multi-select'].includes(kind) && (
            <Stack gap="xs" className="database-property-options">
              <Text size="xs" color="muted" className="database-section-label">
                {t('inputs.options')}
              </Text>
              <div className="database-checkbox-list">
                {options.map(option => (
                  <Flex
                    key={option}
                    align="center"
                    gap="sm"
                    className="database-field-option"
                  >
                    <input
                      type="color"
                      aria-label={t('optionColor', { name: option })}
                      value={optionColors[option] ?? '#587faa'}
                      onChange={e =>
                        setOptionColors(current => ({
                          ...current,
                          [option]: e.target.value
                        }))
                      }
                    />
                    <Text size="sm">{option}</Text>
                    <Button
                      namespace={false}
                      variant="plain"
                      icon="lucide:x"
                      aria-label={t('removeOption', { name: option })}
                      onClick={() =>
                        setOptions(current =>
                          current.filter(value => value !== option)
                        )
                      }
                    />
                  </Flex>
                ))}
              </div>
              <input
                aria-label={t('newOption')}
                placeholder={t('newOption')}
                value={newOption}
                maxLength={255}
                onChange={e => setNewOption(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newOption.trim()) {
                    e.preventDefault()
                    setOptions(current => [
                      ...new Set([...current, newOption.trim()])
                    ])
                    setNewOption('')
                  }
                }}
              />
            </Stack>
          )}
          {kind === 'progress' && (
            <ProgressSettings value={progress} onChange={setProgress} />
          )}
          {kind === 'relation' && !field && (
            <Stack gap="xs">
              <SelectInput
                inline
                label={t('inputs.targetBase')}
                options={data.bases.map(b => ({ value: b.id, label: b.name }))}
                value={target}
                onChange={setTarget}
              />
              <label className="database-compact-input-row">
                <span>{t('inputs.reverseName')}</span>
                <input
                  value={reverseName}
                  maxLength={255}
                  onChange={e => setReverseName(e.target.value)}
                />
              </label>
              <SelectInput
                inline
                label={t('inputs.cardinality')}
                options={cardinalities}
                value={cardinality}
                onChange={value => setCardinality(value as 'one' | 'many')}
              />
              <SelectInput
                inline
                label={t('inputs.reverseCardinality')}
                options={cardinalities}
                value={reverseCardinality}
                onChange={value =>
                  setReverseCardinality(value as 'one' | 'many')
                }
              />
            </Stack>
          )}
          {kind === 'formula' && (
            <Stack gap="xs">
              <label className="database-compact-input-stack">
                <span>{t('formulaExpression')}</span>
                <textarea
                  className="database-formula-input"
                  spellCheck={false}
                  rows={3}
                  placeholder={'prop("Amount") * 2'}
                  value={formula}
                  onChange={e => setFormula(e.target.value)}
                />
              </label>
              <Text size="xs" color="muted">
                {t('formulaHelp')}
              </Text>
            </Stack>
          )}
          {kind === 'button' && (
            <label className="database-compact-input-stack">
              <span>{t('buttonUrl')}</span>
              <input
                type="url"
                placeholder="https://"
                value={buttonUrl}
                onChange={e => setButtonUrl(e.target.value)}
              />
            </label>
          )}
          {kind === 'rollup' && (
            <Stack gap="xs">
              <SelectInput
                inline
                label={t('rollupRelation')}
                value={rollup?.relation_id ?? ''}
                options={[
                  { value: '', label: '—' },
                  ...relationFields.map(f => ({ value: f.id, label: f.name }))
                ]}
                onChange={value =>
                  setRollup(
                    value
                      ? {
                          relation_id: value,
                          property_id: 'done',
                          aggregation: 'count'
                        }
                      : undefined
                  )
                }
              />
              {rollup && (
                <>
                  <SelectInput
                    inline
                    label={t('rollupProperty')}
                    value={rollup.property_id}
                    options={[
                      { value: 'done', label: t('itemDone') },
                      ...data.fields
                        .filter(f => f.base_id === relationTarget)
                        .map(f => ({ value: f.id, label: f.name }))
                    ]}
                    onChange={value =>
                      setRollup({ ...rollup, property_id: value })
                    }
                  />
                  <SelectInput
                    inline
                    label={t('rollupCalculation')}
                    value={rollup.aggregation}
                    options={[
                      'count',
                      'sum',
                      'average',
                      'min',
                      'max',
                      'checked-percent'
                    ].map(value => ({
                      value,
                      label: t(`aggregations.${value}`)
                    }))}
                    onChange={value =>
                      setRollup({
                        ...rollup,
                        aggregation: value as NonNullable<
                          FieldConfig['rollup']
                        >['aggregation']
                      })
                    }
                  />
                </>
              )}
            </Stack>
          )}
          {field && kind !== field.kind && (
            <Text size="xs" color="muted">
              {t('typeChangeHelp')}
            </Text>
          )}
          {kind === 'relation' && (
            <Text size="xs" color="muted">
              {t('relationHelp')}
            </Text>
          )}
          <Flex gap="xs" className="database-editor-footer" justify="end">
            {field && (
              <Button
                dangerous
                namespace={false}
                aria-label={t('buttons.delete')}
                icon="tabler:trash"
                variant="plain"
                disabled={busy || readOnly}
                style={{ marginRight: 'auto' }}
                onClick={() => {
                  if (window.confirm(t('confirmDeleteField')))
                    void run(async () => {
                      await api.removeField
                        .input({ id: field.id })
                        .mutate(undefined)
                      onDone()
                    })
                }}
              />
            )}
            <Button variant="plain" disabled={busy} onClick={onDone}>
              cancel
            </Button>
            <Button
              disabled={!canSave}
              loading={busy}
              onClick={() => {
                void save()
              }}
            >
              save
            </Button>
          </Flex>
        </div>
      )}
    </Stack>
  )
}
