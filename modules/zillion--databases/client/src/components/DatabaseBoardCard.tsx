import { Link } from 'react-router'

import { useModuleTranslation } from '@lifeforge/localization'
import {
  Box,
  ContextMenu,
  ContextMenuItem,
  Flex,
  Icon,
  Stack,
  Text
} from '@lifeforge/ui'

import { useDatabases } from '@/DatabaseProvider'
import { type BoardGroup, boardValue } from '@/utils/board'

import {
  type CellValue,
  type Field,
  type RecordPage,
  propertyValue
} from '../../../shared'
import { FieldValue } from './FieldValue'

export function DatabaseBoardCard({
  record,
  fields,
  groupField,
  groups,
  dragging,
  onDrag,
  onMove
}: {
  record: RecordPage
  fields: Field[]
  groupField: Field
  groups: BoardGroup[]
  dragging: boolean
  onDrag: (id: string | null) => void
  onMove: (record: RecordPage, value: CellValue) => void
}) {
  const { recordHref, busy, readOnly } = useDatabases()
  const { t } = useModuleTranslation()

  const details = fields
    .filter(field => field.id !== groupField.id && field.kind !== 'relation')
    .filter(field => {
      const value = propertyValue(record, field.id)

      return (
        value != null &&
        value !== '' &&
        (!Array.isArray(value) || value.length > 0)
      )
    })
    .slice(0, 3)

  return (
    <Stack
      as="article"
      className="monolith-board-card"
      data-dragging={dragging}
      draggable={!busy && !readOnly}
      gap="sm"
      p="md"
      position="relative"
      r="md"
      onDragEnd={() => onDrag(null)}
      onDragStart={event => {
        if (
          busy ||
          readOnly ||
          (event.target instanceof Element &&
            event.target.closest('button,input,select'))
        ) {
          event.preventDefault()

          return
        }
        event.dataTransfer.setData('application/x-monolith-record', record.id)
        event.dataTransfer.effectAllowed = 'move'
        onDrag(record.id)
      }}
    >
      <Flex align="start" gap="sm" justify="between">
        <Box asChild flex="1" minWidth="0">
          <Text
            as={Link}
            className="monolith-board-card-link"
            draggable={false}
            to={recordHref(record)}
            weight="medium"
            wrap="wrap"
          >
            <Icon
              aria-hidden="true"
              color="muted"
              icon={
                record.done ? 'tabler:circle-check' : 'tabler:file-description'
              }
              mr="sm"
            />
            {record.title}
          </Text>
        </Box>
        {!readOnly && (
          <ContextMenu
            className="monolith-board-actions"
            componentProps={{
              button: {
                'aria-label': t('boardActions', { title: record.title }),
                disabled: busy,
                p: 'xs',
                minHeight: '28px',
                title: t('moveTo')
              }
            }}
            customIcon="tabler:dots"
          >
            {groups.map(group => (
              <ContextMenuItem
                key={String(group.value)}
                checked={boardValue(record, groupField) === group.value}
                disabled={
                  busy || boardValue(record, groupField) === group.value
                }
                icon="tabler:arrow-right"
                label={t('moveToGroup', { group: group.label })}
                namespace={false}
                onClick={() => onMove(record, group.value)}
              />
            ))}
          </ContextMenu>
        )}
      </Flex>
      {details.map(field => (
        <Flex
          key={field.id}
          align="center"
          gap="sm"
          minWidth="0"
          title={field.name}
        >
          <FieldValue field={field} value={propertyValue(record, field.id)} />
        </Flex>
      ))}
    </Stack>
  )
}
