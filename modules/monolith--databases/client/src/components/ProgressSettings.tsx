import { useModuleTranslation } from '@monolith/localization'
import { ColorPicker, Icon, Text } from '@monolith/ui'

import { useDatabases } from '@/DatabaseProvider'

import type { FieldConfig } from '../../../shared'
import { SelectInput } from './SelectInput'

export function ProgressSettings({
  value,
  onChange
}: {
  value: NonNullable<FieldConfig['progress']>
  onChange: (value: NonNullable<FieldConfig['progress']>) => void
}) {
  const { data, base, busy, readOnly } = useDatabases()
  const { t } = useModuleTranslation()
  const relations = data.fields.filter(
    f => f.base_id === base?.id && f.kind === 'relation'
  )
  const target = relations.find(
    f => f.id === value.relation?.field_id
  )?.target_base_id
  const choices = (
    baseId: string | null | undefined,
    ids: string[],
    change: (ids: string[]) => void
  ) => (
    <div className="database-checkbox-list">
      {[
        { id: 'done', name: t('itemDone') },
        ...data.fields.filter(
          f => f.base_id === baseId && f.kind === 'checkbox'
        ),
        ...ids
          .filter(
            id =>
              id !== 'done' &&
              !data.fields.some(
                f =>
                  f.id === id && f.base_id === baseId && f.kind === 'checkbox'
              )
          )
          .map(id => ({ id, name: t('progressSettings.unavailable') }))
      ].map(field => (
        <label key={field.id} className="database-checkbox-option">
          <Icon icon="tabler:checkbox" size="15px" color="muted" />
          <span>{field.name}</span>
          <input
            type="checkbox"
            checked={ids.includes(field.id)}
            disabled={busy || readOnly}
            onChange={e =>
              change(
                e.target.checked
                  ? [...ids, field.id]
                  : ids.filter(id => id !== field.id)
              )
            }
          />
        </label>
      ))}
    </div>
  )
  return (
    <div className="database-progress-settings">
      <Text size="xs" color="muted">
        {t('progressSettings.help')}
      </Text>
      <Text className="database-section-label" size="xs" color="muted">
        {t('progressSettings.thisPage')}
      </Text>
      {choices(base?.id, value.checkbox_ids, checkbox_ids =>
        onChange({ ...value, checkbox_ids })
      )}
      <div className="database-settings-divider" />
      <SelectInput
        inline
        label={t('progressSettings.relatedPages')}
        value={value.relation?.field_id ?? ''}
        disabled={busy || readOnly}
        options={[
          { value: '', label: t('progressSettings.none') },
          ...(value.relation && !target
            ? [
                {
                  value: value.relation.field_id,
                  label: t('progressSettings.unavailable')
                }
              ]
            : []),
          ...relations.map(f => ({ value: f.id, label: f.name }))
        ]}
        onChange={field_id =>
          onChange({
            ...value,
            relation: field_id
              ? { field_id, checkbox_ids: ['done'] }
              : undefined
          })
        }
      />
      {!relations.length && (
        <Text size="xs" color="muted">
          {t('progressSettings.relationHint')}
        </Text>
      )}
      {value.relation &&
        choices(target, value.relation.checkbox_ids, checkbox_ids =>
          onChange({ ...value, relation: { ...value.relation!, checkbox_ids } })
        )}
      <div className="database-settings-divider" />
      <label className="database-compact-toggle">
        <span>{t('progressSettings.showNumber')}</span>
        <input
          type="checkbox"
          role="switch"
          disabled={busy || readOnly}
          checked={value.show_number}
          onChange={e => onChange({ ...value, show_number: e.target.checked })}
        />
      </label>
      <div className="database-compact-setting">
        <Text size="sm">{t('progressSettings.color')}</Text>
        <ColorPicker
          label={t('progressSettings.color')}
          value={value.color}
          disabled={busy || readOnly}
          onChange={color => onChange({ ...value, color })}
        />
      </div>
    </div>
  )
}
