import { useModuleTranslation } from '@monolith/localization'
import { Box, Button, ChoiceSelect, Flex, Icon, Text } from '@monolith/ui'
import { useState } from 'react'
import { Link } from 'react-router'

import { useDatabases } from '@/DatabaseProvider'
import { propertyIcons } from '@/utils/fieldPresentation'
import { useViewColors } from '@/utils/viewColors'

import type { Field, RecordPage, ViewConfig } from '../../../shared'
import { PropertyCell } from './PropertyCell'

export function DatabaseTable({
  fields,
  records,
  config,
  onEditField,
  onAddField
}: {
  fields: Field[]
  records: RecordPage[]
  config?: ViewConfig
  onEditField: (field: Field) => void
  onAddField: () => void
}) {
  const { base, recordHref, openRecord, api, run, busy, readOnly } =
    useDatabases()

  const { t } = useModuleTranslation()
  const colors = useViewColors()
  const [selected, setSelected] = useState('')
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [editingTitle, setEditingTitle] = useState<string>()
  const [titleDraft, setTitleDraft] = useState('')
  async function addRow() {
    if (!base || busy || !newTitle.trim()) return
    const result = await run(() =>
      api.createRecord.mutate({
        base_id: base.id,
        title: newTitle.trim(),
        content: '',
        values: {}
      })
    )
    if (result) {
      setNewTitle('')
      setAdding(false)
      setSelected(result.id + ':title')
    }
  }
  async function rename(record: RecordPage) {
    if (busy || !titleDraft.trim()) return
    if (titleDraft !== record.title)
      await run(() =>
        api.updateRecord.input({ id: record.id }).mutate({
          title: titleDraft.trim(),
          expected_updated: record.updated
        })
      )
    setEditingTitle(undefined)
  }

  return (
    <Box minWidth="0" overflowX="auto" r="sm" width="100%">
      <table
        aria-label={base?.name ?? t('title')}
        className="zillion-database-table"
        data-wrap={config?.wrap_cells !== false}
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
            {config?.show_item_type !== false && (
              <th scope="col">
                <Flex
                  align="center"
                  gap="sm"
                  minHeight={{ base: '44px', md: '32px' }}
                >
                  <Icon
                    aria-hidden="true"
                    color="muted"
                    icon="tabler:category"
                  />
                  <Text color="muted" weight="medium">
                    {t('itemType')}
                  </Text>
                </Flex>
              </th>
            )}
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
            {!readOnly && (
              <th scope="col">
                <Button
                  variant="plain"
                  icon="lucide:plus"
                  aria-label={t('addField')}
                  disabled={busy}
                  onClick={onAddField}
                />
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {!records.length && (
            <tr className="database-empty-row">
              <td colSpan={fields.length + (config?.show_item_type !== false ? 2 : 1) + (readOnly ? 0 : 1)}>
                <Text color="muted" role="status">{t('noRecords')}</Text>
              </td>
            </tr>
          )}
          {records.map(record => (
            <tr key={record.id} style={colors.style(record)}>
              <td
                tabIndex={0}
                data-selected={selected === record.id + ':title'}
                onClick={() => setSelected(record.id + ':title')}
                onDoubleClick={() => {
                  if (!readOnly) {
                    setEditingTitle(record.id)
                    setTitleDraft(record.title)
                  }
                }}
                onKeyDown={event => {
                  if (
                    event.key === 'Enter' &&
                    (event.ctrlKey || event.metaKey)
                  ) {
                    event.preventDefault()
                    openRecord(record)
                  }
                }}
              >
                {editingTitle === record.id ? (
                  <input
                    autoFocus
                    className="database-title-cell-input"
                    aria-label={t('inputs.recordTitle')}
                    value={titleDraft}
                    onChange={event => setTitleDraft(event.target.value)}
                    onBlur={() => void rename(record)}
                    onKeyDown={event => {
                      if (event.key === 'Enter') event.currentTarget.blur()
                      if (event.key === 'Escape') setEditingTitle(undefined)
                    }}
                  />
                ) : (
                  <Flex className="database-title-cell" align="center" gap="xs">
                    <Button
                      as={Link}
                      icon={record.appearance?.icon ?? 'tabler:file-text'}
                      justify="start"
                      minHeight={{ base: '44px', md: '32px' }}
                      namespace={false}
                      p="sm"
                      textProps={{ weight: 'medium' }}
                      title={record.title}
                      to={recordHref(record)}
                      variant="plain"
                      width="100%"
                      onClick={event => {
                        if (
                          !event.ctrlKey &&
                          !event.metaKey &&
                          !event.shiftKey &&
                          !event.altKey
                        )
                          event.preventDefault()
                      }}
                    >
                      {record.title}
                    </Button>
                    <Button
                      namespace={false}
                      className="database-row-open"
                      variant="plain"
                      icon="lucide:panel-right"
                      aria-label={t('openRecordPage', { title: record.title })}
                      onClick={() => openRecord(record)}
                    >
                      {t('openPage')}
                    </Button>
                  </Flex>
                )}
              </td>
              {config?.show_item_type !== false && (
                <td>
                  <ChoiceSelect
                    label={`${t('itemType')} ${record.title}`}
                    disabled={busy || readOnly}
                    value={record.item_type ?? 'page'}
                    onChange={value =>
                      void run(() =>
                        api.updateRecord.input({ id: record.id }).mutate({
                          item_type: value as
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
                    options={[
                      'page',
                      'task',
                      'note',
                      'project',
                      'event',
                      'post'
                    ].map(value => ({ value, label: t(`itemTypes.${value}`) }))}
                  />
                </td>
              )}
              {fields.map(field => (
                <td
                  key={field.id}
                  data-kind={field.kind}
                  data-selected={selected === record.id + ':' + field.id}
                  onClick={() => setSelected(record.id + ':' + field.id)}
                >
                  <PropertyCell
                    field={field}
                    record={record}
                    value={record.values[field.id]}
                    disabled={busy || readOnly}
                    onChange={value =>
                      void run(() =>
                        api.updateRecord.input({ id: record.id }).mutate({
                          values: { ...record.values, [field.id]: value },
                          expected_updated: record.updated
                        })
                      )
                    }
                  />
                </td>
              ))}
              {!readOnly && <td />}
            </tr>
          ))}
          {!readOnly && (
            <tr className="database-new-row">
              <td
                colSpan={
                  fields.length + (config?.show_item_type !== false ? 3 : 2)
                }
              >
                {adding ? (
                  <input
                    autoFocus
                    className="database-title-cell-input"
                    aria-label={t('newRecord')}
                    placeholder={t('inputs.recordTitle')}
                    value={newTitle}
                    onChange={event => setNewTitle(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        void addRow()
                      }
                      if (event.key === 'Escape') {
                        setAdding(false)
                        setNewTitle('')
                      }
                    }}
                    onBlur={() => {
                      if (newTitle.trim()) void addRow()
                      else setAdding(false)
                    }}
                  />
                ) : (
                  <Button
                    namespace={false}
                    variant="plain"
                    icon="lucide:plus"
                    justify="start"
                    onClick={() => setAdding(true)}
                  >
                    {t('newRecord')}
                  </Button>
                )}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Box>
  )
}
