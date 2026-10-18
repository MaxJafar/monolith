import { useModuleTranslation } from '@monolith/localization'
import { Flex, Stack, Text } from '@monolith/ui'

import { useDatabases } from '@/DatabaseProvider'
import { boardValues } from '@/utils/board'

import {
  type CellValue,
  type Field,
  type RecordPage,
  propertyValue
} from '../../../shared'
import { FieldValue } from './FieldValue'
import { PropertyCell } from './PropertyCell'

export function DatabaseCardProperties({
  fields,
  record,
  disabled,
  onChange
}: {
  fields: Field[]
  record: RecordPage
  disabled?: boolean
  onChange?: (field: Field, value: CellValue) => void
}) {
  const { data, index } = useDatabases()
  const { t } = useModuleTranslation()
  if (!fields.length) return null

  return (
    <Stack className="database-card-properties" gap="xs" minWidth="0">
      {fields.map(field => (
        <Flex
          className="database-card-property"
          key={field.id}
          align="start"
          gap="sm"
          minWidth="0"
        >
          <Text
            className="database-card-property-label"
            color="muted"
            size="xs"
            title={field.name}
          >
            {field.name}
          </Text>
          {onChange ? (
            <PropertyCell
              field={field}
              record={record}
              value={
                field.id === 'date' || field.id === 'end_date'
                  ? record[field.id]
                  : propertyValue(record, field.id)
              }
              disabled={disabled}
              linkRelations={false}
              onChange={value => onChange(field, value)}
            />
          ) : field.kind === 'relation' ? (
            <Text size="xs">
              {boardValues(record, field, data.links)
                .filter(id => id != null)
                .map(
                  id =>
                    index.recordsById.get(String(id))?.title ??
                    t('untitledPage')
                )
                .join(', ') || '—'}
            </Text>
          ) : (
            <FieldValue field={field} value={propertyValue(record, field.id)} />
          )}
        </Flex>
      ))}
    </Stack>
  )
}
