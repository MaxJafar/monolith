import { useMemo } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import { Box, Flex, HorizontalBarChart, Icon, Stack, Text } from '@monolith/ui'

import { groupDistribution } from '@/utils/fieldPresentation'

import {
  type Field,
  type RecordPage,
  type SavedView,
  viewProperties
} from '../../../shared'

export function ViewSummary({
  fields,
  records,
  view
}: {
  fields: Field[]
  records: RecordPage[]
  view: SavedView | undefined
}) {
  const { t } = useModuleTranslation()

  const field =
    [...viewProperties('', t), ...fields].find(
      field =>
        field.id === (view?.config.group_property ?? view?.group_field_id)
    ) ??
    fields.find(
      field =>
        field.kind === 'checkbox' ||
        (field.kind === 'select' && field.config.options.length <= 4)
    )
  const distribution = useMemo(
    () => (field ? groupDistribution(field, records) : []),
    [field, records]
  )

  if (
    !field ||
    !records.length ||
    !distribution.length ||
    distribution.length > 5
  )
    return null

  return (
    <Box as="details" bg={{ base: 'bg-50', dark: 'bg-900' }} p="md" r="lg">
      <Flex align="center" as="summary" gap="sm" minHeight="44px">
        <Icon aria-hidden="true" color="primary" icon="tabler:chart-bar" />
        <Box flex="1" minWidth="0">
          <Text weight="medium">{field.name}</Text>
        </Box>
        <Text color="muted">{t('recordCount', { count: records.length })}</Text>
        <Icon aria-hidden="true" color="muted" icon="tabler:chevron-down" />
      </Flex>
      <Stack gap="md" maxWidth="36rem" pt="md">
        {view && <Text color="muted">{view.name}</Text>}
        <HorizontalBarChart
          label={field.name}
          max={records.length}
          points={distribution.map(item => ({
            label:
              item.value == null
                ? t('ungrouped')
                : typeof item.value === 'boolean'
                  ? t(item.value ? 'checked' : 'unchecked')
                  : String(item.value),
            value: item.count
          }))}
        />
      </Stack>
    </Box>
  )
}
