import { ChoiceSelect, Flex, Stack, Text } from '@monolith/ui'
import { useTranslation } from 'react-i18next'

import { valueColor } from '@/utils/viewColors'

import {
  type Field,
  type RecordPage,
  type ViewConfig,
  propertyValue
} from '../../../shared'

export function ViewColorsEditor({
  config,
  fields,
  records,
  onChange
}: {
  config: ViewConfig
  fields: Field[]
  records: RecordPage[]
  onChange: (value: ViewConfig) => void
}) {
  const { t } = useTranslation('common.workspaceUI')

  const color = config.color ?? { by: 'none', palette: {}, columns: true }
  const field = fields.find(field => field.id === color.by)
  const values =
    color.by === 'solid'
      ? ['solid']
      : Array.from(
          new Set([
            ...(field?.config.options ?? []),
            ...records.flatMap(record => {
              const value = propertyValue(record, color.by)

              return Array.isArray(value)
                ? value
                : value == null
                  ? []
                  : [String(value)]
            })
          ])
        )
          .filter(Boolean)
          .slice(0, 100)

  return (
    <Stack className="monolith-view-colors" gap="sm">
      <Text weight="semibold">{t('databaseColors')}</Text>
      <Flex align="center" gap="md" wrap="wrap">
        <Text size="sm">{t('colorBy')}</Text>
        <ChoiceSelect
          label={t('colorBy')}
          value={color.by}
          onChange={value =>
            onChange({
              ...config,
              color: {
                ...color,
                by: value,
                palette: {}
              }
            })
          }
          options={[
            { value: 'none', label: t('noColor') },
            { value: 'solid', label: t('singleColor') },
            ...fields
              .filter(
                field =>
                  ['select', 'status', 'multi-select', 'checkbox'].includes(
                    field.kind
                  ) || field.id === 'tags'
              )
              .map(field => ({ value: field.id, label: field.name }))
          ]}
        />
        <Flex align="center" as="label" gap="sm">
          <input
            checked={color.columns}
            type="checkbox"
            onChange={event =>
              onChange({
                ...config,
                color: { ...color, columns: event.target.checked }
              })
            }
          />
          {t('colorColumns')}
        </Flex>
      </Flex>
      <Flex gap="sm" wrap="wrap">
        {values.map(value => (
          <Flex
            key={value}
            align="center"
            as="label"
            className="monolith-color-option"
            gap="sm"
          >
            <input
              aria-label={t('colorFor', {
                name: value === 'solid' ? t('singleColor') : value
              })}
              type="color"
              value={
                color.palette[value] ??
                valueColor(value, field?.config.option_colors)
              }
              onChange={event =>
                onChange({
                  ...config,
                  color: {
                    ...color,
                    palette: { ...color.palette, [value]: event.target.value }
                  }
                })
              }
            />
            <Text size="sm">
              {value === 'solid' ? t('singleColor') : value}
            </Text>
          </Flex>
        ))}
      </Flex>
      <Text color="muted" size="xs">
        {t('colorHelp')}
      </Text>
    </Stack>
  )
}
