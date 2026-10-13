import { useModuleTranslation } from '@lifeforge/localization'
import { Button, Flex, Stack, Text } from '@lifeforge/ui'

import type { Field, ViewConfig } from '../../../shared'
import { FilterEditor } from './FilterEditor'
import { SelectInput } from './SelectInput'

type FilterGroup = NonNullable<ViewConfig['filter_groups']>[number]

export function FilterGroupEditor({
  group,
  fields,
  index,
  canAdd,
  onChange,
  onRemove
}: {
  group: FilterGroup
  fields: Field[]
  index: number
  canAdd: boolean
  onChange: (group: FilterGroup) => void
  onRemove: () => void
}) {
  const { t } = useModuleTranslation()

  return (
    <Stack bg={{ base: 'bg-50', dark: 'bg-800' }} gap="sm" p="md" r="lg">
      <Flex align="center" gap="sm" justify="between" wrap="wrap">
        <Text weight="semibold">{t('filterGroup', { index: index + 1 })}</Text>
        <Button
          dangerous
          aria-label={t('removeFilterGroup')}
          icon="tabler:x"
          variant="plain"
          onClick={onRemove}
        />
      </Flex>
      <SelectInput
        label={t('inputs.groupLogic')}
        options={['and', 'or'].map(value => ({
          value,
          label: t(`filterLogic.${value}`)
        }))}
        value={group.filter_logic}
        onChange={value =>
          onChange({ ...group, filter_logic: value as 'and' | 'or' })
        }
      />
      {group.filters.map((filter, index) => (
        <FilterEditor
          key={index}
          fields={fields}
          filter={filter}
          onChange={filter =>
            onChange({
              ...group,
              filters: group.filters.map((current, i) =>
                i === index ? filter : current
              )
            })
          }
          onRemove={() =>
            onChange({
              ...group,
              filters: group.filters.filter((_, i) => i !== index)
            })
          }
        />
      ))}
      <Button
        disabled={!canAdd || group.filters.length >= 20}
        icon="tabler:plus"
        justify="start"
        variant="plain"
        onClick={() =>
          onChange({
            ...group,
            filters: [
              ...group.filters,
              { field_id: 'title', operator: 'contains', value: '' }
            ]
          })
        }
      >
        addFilter
      </Button>
    </Stack>
  )
}
