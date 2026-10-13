import { Link } from 'react-router'

import { useModuleTranslation } from '@lifeforge/localization'
import { Box, Button, Flex, Icon, Text } from '@lifeforge/ui'

import { useDatabases } from '@/DatabaseProvider'
import { propertyIcons } from '@/utils/fieldPresentation'

import type { Field, RecordPage } from '../../../shared'
import { FieldValue } from './FieldValue'

export function DatabaseTable({
  fields,
  records,
  onEditField
}: {
  fields: Field[]
  records: RecordPage[]
  onEditField: (field: Field) => void
}) {
  const { base, index, recordHref, api, run, busy, readOnly } = useDatabases()
  const { t } = useModuleTranslation()

  return (
    <Box
      bg={{ base: 'bg-50', dark: 'bg-900' }}
      minWidth="0"
      overflowX="auto"
      r="sm"
      width="100%"
    >
      <table
        aria-label={base?.name ?? t('title')}
        className="zillion-database-table"
      >
        <thead>
          <tr>
            <th scope="col">
              <Flex
                align="center"
                gap="sm"
                minHeight={{ base: '44px', md: '32px' }}
              >
                <Icon
                  aria-hidden="true"
                  color="muted"
                  icon="tabler:file-text"
                />
                <Text color="muted" weight="medium">
                  {t('inputs.recordTitle')}
                </Text>
              </Flex>
            </th>
            <th scope="col">
              <Flex
                align="center"
                gap="sm"
                minHeight={{ base: '44px', md: '32px' }}
              >
                <Icon aria-hidden="true" color="muted" icon="tabler:category" />
                <Text color="muted" weight="medium">
                  {t('itemType')}
                </Text>
              </Flex>
            </th>
            {fields.map(field => (
              <th key={field.id} data-kind={field.kind} scope="col">
                <Button
                  disabled={busy || readOnly}
                  icon={propertyIcons[field.kind]}
                  iconProps={{ color: 'muted' }}
                  justify={field.kind === 'number' ? 'end' : 'start'}
                  minHeight={{ base: '44px', md: '32px' }}
                  namespace={false}
                  p="sm"
                  textProps={{ color: 'muted', weight: 'medium' }}
                  title={field.name}
                  variant="plain"
                  width="100%"
                  onClick={() => onEditField(field)}
                >
                  {field.name}
                </Button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map(record => (
            <tr key={record.id}>
              <td>
                <Button
                  as={Link}
                  icon="tabler:file-text"
                  justify="start"
                  minHeight={{ base: '44px', md: '32px' }}
                  namespace={false}
                  p="sm"
                  textProps={{ weight: 'medium' }}
                  title={record.title}
                  to={recordHref(record)}
                  variant="plain"
                  width="100%"
                >
                  {record.title}
                </Button>
              </td>
              <td>
                <select
                  aria-label={`${t('itemType')} ${record.title}`}
                  className="zillion-database-type"
                  disabled={busy || readOnly}
                  value={record.item_type ?? 'page'}
                  onChange={event =>
                    void run(() =>
                      api.updateRecord.input({ id: record.id }).mutate({
                        title: record.title,
                        content: record.content,
                        values: record.values,
                        item_type: event.target.value as
                          | 'page'
                          | 'task'
                          | 'note'
                          | 'project'
                          | 'event'
                          | 'post',
                        expected_updated: record.updated
                      })
                    )
                  }
                >
                  {['page', 'task', 'note', 'project', 'event', 'post'].map(
                    type => (
                      <option key={type} value={type}>
                        {t(`itemTypes.${type}`)}
                      </option>
                    )
                  )}
                </select>
              </td>
              {fields.map(field => (
                <td key={field.id} data-kind={field.kind}>
                  {field.kind === 'relation' ? (
                    <Flex gap="xs" wrap="wrap">
                      {(
                        index.linksByField.get(field.id)?.get(record.id) ?? []
                      ).map(link => {
                        const target = index.recordsById.get(
                          link.target_record_id
                        )

                        return (
                          target && (
                            <Button
                              key={link.id}
                              as={Link}
                              icon="tabler:arrow-up-right"
                              minHeight={{ base: '44px', md: '32px' }}
                              namespace={false}
                              p="sm"
                              textProps={{ weight: 'normal' }}
                              title={target.title}
                              to={recordHref(target)}
                              variant="plain"
                            >
                              {target.title}
                            </Button>
                          )
                        )
                      })}
                    </Flex>
                  ) : (
                    <FieldValue field={field} value={record.values[field.id]} />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!records.length && (
        <Box p="xl">
          <Text color="muted" role="status">
            {t('noRecords')}
          </Text>
        </Box>
      )}
    </Box>
  )
}
