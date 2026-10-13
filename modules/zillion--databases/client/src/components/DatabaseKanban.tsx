import { useMemo, useState } from 'react'

import { useModuleTranslation } from '@lifeforge/localization'
import { Box, Button, Flex, Stack, Text } from '@lifeforge/ui'

import { useDatabases } from '@/DatabaseProvider'
import { boardGroups, boardValue } from '@/utils/board'

import { type CellValue, type Field, type RecordPage } from '../../../shared'
import { itemType } from '../../../workspaceShared'
import { DatabaseBoardCard } from './DatabaseBoardCard'

export function DatabaseKanban({
  fields,
  records,
  groupField,
  onCreate
}: {
  fields: Field[]
  records: RecordPage[]
  groupField: Field | undefined
  onCreate?: (values: Record<string, CellValue>) => void
}) {
  const { api: forgeAPI, run, busy, readOnly } = useDatabases()
  const { t } = useModuleTranslation()
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')

  const [optimistic, setOptimistic] = useState<{
    id: string
    value: CellValue
  } | null>(null)
  const groups = useMemo(
    () => (groupField ? boardGroups(groupField, records, t) : []),
    [groupField, records, t]
  )
  const members = useMemo(() => {
    const result = new Map<CellValue, RecordPage[]>()

    if (!groupField) return result

    for (const record of records) {
      const value =
        optimistic?.id === record.id
          ? optimistic.value
          : boardValue(record, groupField)
      const group = result.get(value) ?? []
      group.push(record)
      result.set(value, group)
    }

    return result
  }, [records, groupField, optimistic])

  async function move(record: RecordPage, value: CellValue) {
    if (
      !groupField ||
      busy ||
      readOnly ||
      optimistic ||
      boardValue(record, groupField) === value
    )
      return
    setDragging(null)
    setOver(null)
    setOptimistic({ id: record.id, value })
    const result = await run(() =>
      forgeAPI.updateRecord.input({ id: record.id }).mutate({
        title: record.title,
        content: record.content,
        ...(groupField.id === 'done'
          ? { values: record.values, done: value === true }
          : groupField.id === 'item_type'
            ? { values: record.values, item_type: itemType.parse(value) }
            : { values: { ...record.values, [groupField.id]: value } }),
        expected_updated: record.updated
      })
    )
    setOptimistic(null)
    setAnnouncement(
      result === undefined
        ? t('saveFailed')
        : t('boardMoved', {
            title: record.title,
            group: groups.find(group => group.value === value)?.label
          })
    )
  }

  if (!groupField) return <Text color="muted">{t('kanbanHelp')}</Text>

  return (
    <>
      <Text aria-live="polite" className="monolith-board-status" role="status">
        {announcement}
      </Text>
      <Flex
        align="start"
        aria-label={t('boardLabel')}
        className="monolith-board"
        gap="md"
        minWidth="0"
        overflowX="auto"
        pb="md"
      >
        {groups.map(group => {
          const key = String(group.value)
          const items = members.get(group.value) ?? []

          return (
            <Stack
              key={key}
              aria-label={group.label}
              as="section"
              className="monolith-board-column"
              data-over={over === key}
              flexShrink="0"
              gap="sm"
              minWidth="min(270px, 82vw)"
              p="sm"
              r="lg"
              width="270px"
              onDragLeave={event => {
                if (!event.currentTarget.contains(event.relatedTarget as Node))
                  setOver(null)
              }}
              onDragOver={event => {
                if (dragging && !busy && !readOnly) {
                  event.preventDefault()
                  event.dataTransfer.dropEffect = 'move'
                  setOver(key)
                }
              }}
              onDrop={event => {
                event.preventDefault()
                const id = event.dataTransfer.getData(
                  'application/x-monolith-record'
                )
                const record =
                  id === dragging
                    ? records.find(record => record.id === id)
                    : undefined
                setOver(null)
                if (record) void move(record, group.value)
              }}
            >
              <Flex align="center" gap="sm" justify="between" px="xs" py="xs">
                <Flex align="center" gap="sm" minWidth="0">
                  <Box
                    aria-hidden="true"
                    bg="muted"
                    flexShrink="0"
                    height="7px"
                    r="full"
                    width="7px"
                  />
                  <Text as="h3" lineClamp={2} weight="medium">
                    {group.label}
                  </Text>
                  <Text color="muted">{items.length}</Text>
                </Flex>
                {onCreate && !readOnly && (
                  <Button
                    aria-label={t('addToGroup', { group: group.label })}
                    disabled={busy}
                    icon="tabler:plus"
                    minHeight="28px"
                    p="xs"
                    variant="plain"
                    onClick={() => onCreate({ [groupField.id]: group.value })}
                  />
                )}
              </Flex>
              {items.map(record => (
                <DatabaseBoardCard
                  key={record.id}
                  dragging={dragging === record.id}
                  fields={fields}
                  groupField={groupField}
                  groups={groups}
                  record={record}
                  onDrag={id => {
                    setDragging(id)
                    if (!id) setOver(null)
                  }}
                  onMove={(record, value) => {
                    void move(record, value)
                  }}
                />
              ))}
              {!items.length && (
                <Text align="center" color="muted" py="lg">
                  {over === key ? t('dropHere') : t('emptyGroup')}
                </Text>
              )}
              {onCreate && !readOnly && (
                <Button
                  className="monolith-board-create"
                  disabled={busy}
                  icon="tabler:plus"
                  justify="start"
                  variant="plain"
                  onClick={() => onCreate({ [groupField.id]: group.value })}
                >
                  newRecord
                </Button>
              )}
            </Stack>
          )
        })}
      </Flex>
    </>
  )
}
