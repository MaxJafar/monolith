import { useModuleTranslation } from '@monolith/localization'
import { Button, Icon, Stack, Text } from '@monolith/ui'
import { useState } from 'react'

import { useDatabases } from '@/DatabaseProvider'
import {
  boardCellKey,
  boardGroupKey,
  boardGroups,
  boardValues,
  insertBoardRecord,
  orderedBoardRecords
} from '@/utils/board'
import { colorStyle, valueColor } from '@/utils/recordColors'
import { useViewColors } from '@/utils/viewColors'

import {
  type CellValue,
  type Field,
  type RecordPage,
  type SavedView,
  applyView
} from '../../../shared'
import { itemType } from '../../../workspaceShared'
import { BoardColumnHeader } from './BoardColumnHeader'
import { DatabaseBoardCard } from './DatabaseBoardCard'
import { type BoardDrag, type BoardDrop, useBoardDrag } from './useBoardDrag'
import { useBoardLayout } from './useBoardLayout'

export function DatabaseKanban({
  view,
  fields,
  records,
  groupField,
  subgroupField,
  editingRecordId,
  onFinishName,
  onCreate
}: {
  view?: SavedView
  fields: Field[]
  records: RecordPage[]
  groupField: Field | undefined
  subgroupField?: Field
  editingRecordId?: string
  onFinishName?: () => void
  onCreate?: (values: Record<string, CellValue>) => void
}) {
  const { api, run, busy, readOnly, data, index, retry } = useDatabases()
  const { t } = useModuleTranslation()
  const colors = useViewColors()
  const [pendingMove, setPendingMove] = useState<{
    source: BoardDrag
    target: BoardDrop
    order: string[]
  } | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [moveFailed, setMoveFailed] = useState(false)
  const dragDisabled = busy || readOnly || !!view?.config.locked || !view
  const drag = useBoardDrag({
    disabled: dragDisabled,
    onDrop: (source, target) => {
      const record = records.find(record => record.id === source.id)
      if (record) void move(record, source, target)
    }
  })
  const label = (field: Field) =>
    field.kind === 'relation'
      ? (id: string) => index.recordsById.get(id)?.title ?? id
      : undefined
  const layout = useBoardLayout({
    view,
    fieldId: groupField?.id ?? '',
    groups: groupField
      ? boardGroups(groupField, records, t, data.links, label(groupField))
      : [],
    board: drag.board,
    disabled: dragDisabled || !!drag.dragging
  })
  if (!groupField) return <Text color="muted">{t('kanbanHelp')}</Text>
  function values(record: RecordPage, field: Field) {
    const current = boardValues(record, field, data.links)
    if (!pendingMove || record.id !== pendingMove.source.id) return current
    const from =
      field.id === groupField?.id
        ? pendingMove.source.group
        : pendingMove.source.section
    const value =
      field.id === groupField?.id
        ? pendingMove.target.group
        : pendingMove.target.section
    if (from === value) return current
    const multiple =
      field.kind === 'multi-select' ||
      (field.kind === 'relation' &&
        field.config.cardinality !== 'one' &&
        field.id !== 'project_id')
    const next = multiple
      ? [
          ...new Set([
            ...current.filter(item => item != null && item !== from),
            ...(value == null ? [] : [value])
          ])
        ]
      : [value]
    return next.length ? next : [null]
  }
  const groups = layout.groups
  const sections = subgroupField
    ? boardGroups(subgroupField, records, t, data.links, label(subgroupField))
        .map(group => ({
          ...group,
          records: records.filter(record =>
            values(record, subgroupField).includes(group.value)
          )
        }))
        .filter(
          group =>
            group.records.length || (!records.length && group.value === null)
        )
    : [{ value: null, label: '', records }]
  const groupColor = (value: CellValue) =>
    value == null
      ? undefined
      : valueColor(String(value), {
          ...groupField.config.option_colors,
          ...(colors.config?.by === groupField.id ? colors.config.palette : {})
        })
  const initial = (field: Field, value: CellValue) =>
    field.kind === 'multi-select' ||
    (field.kind === 'relation' && field.id !== 'project_id')
      ? value == null
        ? []
        : [String(value)]
      : value
  const columns = {
    gridTemplateColumns: groups
      .map(group => {
        const key = boardGroupKey(groupField.id, group.value)
        return `${layout.closed(key) ? 0 : layout.width(key) + 12}px`
      })
      .join(' ')
  }

  async function move(
    record: RecordPage,
    source: BoardDrag,
    target: BoardDrop
  ) {
    if (!groupField || dragDisabled || !view || pendingMove) return
    const { group: value, section: sectionValue } = target
    const { group: from, section: fromSection } = source
    const updates = [
      { field: groupField, value, from },
      ...(subgroupField
        ? [{ field: subgroupField, value: sectionValue, from: fromSection }]
        : [])
    ].filter(change => change.value !== change.from)
    const inTarget = (item: RecordPage, links = data.links) =>
      boardValues(item, groupField, links).includes(value) &&
      (!subgroupField ||
        boardValues(item, subgroupField, links).includes(sectionValue))
    const currentItems = records.filter(item => inTarget(item))
    const currentOrder = view.config.sorts.length
      ? []
      : (view.config.board_order?.[target.key] ?? [])
    const order = insertBoardRecord(
      currentItems,
      currentOrder,
      record.id,
      target.before
    )
    if (
      !updates.length &&
      order.join() ===
        orderedBoardRecords(currentItems, currentOrder)
          .map(item => item.id)
          .join()
    )
      return
    setPendingMove({ source, target, order })
    setMoveFailed(false)
    const result = await run(async () => {
      const snapshot = await api.snapshot.query()
      const latestView = snapshot.views.find(item => item.id === view.id)
      if (!latestView || latestView.config.locked) throw Error(t('saveFailed'))
      // Keep hidden cards in the stored order, and merge into the latest view so
      // a drop cannot replace unrelated appearance or filter settings.
      const allRecords = applyView(
        snapshot.records.filter(item => item.base_id === record.base_id),
        {
          ...latestView,
          config: { ...latestView.config, filters: [], filter_groups: [] }
        },
        snapshot.links
      )
      const boardOrder = { ...latestView.config.board_order }
      if (latestView.config.sorts.length) {
        // Preserve every column's displayed order when switching to manual order.
        const sortedCells: Record<string, string[]> = {}
        for (const item of allRecords)
          for (const group of boardValues(item, groupField, snapshot.links))
            for (const section of subgroupField
              ? boardValues(item, subgroupField, snapshot.links)
              : [null]) {
              const key = boardCellKey(
                groupField,
                group,
                subgroupField,
                section
              )
              ;(sortedCells[key] ??= []).push(item.id)
            }
        Object.assign(boardOrder, sortedCells)
      }
      const targetRecords = allRecords.filter(item =>
        inTarget(item, snapshot.links)
      )
      await api.updateView.input({ id: view.id }).mutate({
        ...latestView,
        config: {
          ...latestView.config,
          sorts: [],
          board_order: {
            ...boardOrder,
            [target.key]: insertBoardRecord(
              targetRecords,
              boardOrder[target.key] ?? [],
              record.id,
              target.before
            )
          }
        }
      })
      let currentRecord = record
      for (const { field: groupField, value, from } of updates) {
        const current = boardValues(
          currentRecord,
          groupField,
          data.links
        ).filter(item => item != null && item !== from)
        const multiple = [
          ...new Set([...current, ...(value == null ? [] : [value])])
        ].map(String)
        if (groupField.kind === 'relation' && groupField.id !== 'project_id') {
          await api.setLinks.mutate({
            field_id: groupField.id,
            record_id: record.id,
            target_ids:
              groupField.config.cardinality === 'one'
                ? value == null
                  ? []
                  : [String(value)]
                : multiple,
            expected_ids: boardValues(record, groupField, data.links)
              .filter(item => item != null)
              .map(String)
          })
          currentRecord =
            (await api.snapshot.query()).records.find(
              item => item.id === record.id
            ) ?? currentRecord
          continue
        }
        const patch =
          groupField.id === 'done'
            ? { done: value === true }
            : groupField.id === 'item_type'
              ? { item_type: itemType.parse(value) }
              : groupField.id === 'status'
                ? { status: value as 'planned' | 'active' | 'done' }
                : groupField.id === 'priority'
                  ? { priority: value as 'low' | 'normal' | 'high' | 'urgent' }
                  : groupField.id === 'tags'
                    ? { tags: multiple }
                    : groupField.id === 'project_id'
                      ? { project_id: value == null ? null : String(value) }
                      : {
                          values: {
                            ...currentRecord.values,
                            [groupField.id]:
                              groupField.kind === 'multi-select'
                                ? multiple
                                : value
                          }
                        }
        currentRecord = await api.updateRecord
          .input({ id: record.id })
          .mutate({ ...patch, expected_updated: currentRecord.updated })
      }
      return currentRecord
    })
    if (!result) {
      drag.captureLayout(record.id, target.key, source.key)
      retry()
    }
    setPendingMove(null)
    setMoveFailed(!result)
    setAnnouncement(
      result
        ? t(updates.length ? 'boardMoved' : 'boardReordered', {
            title: record.title,
            group: groups.find(group => group.value === value)?.label,
            position: order.indexOf(record.id) + 1
          })
        : t('saveFailed')
    )
  }

  return (
    <>
      {(moveFailed || layout.failed) && (
        <Text size="sm" role="alert">
          {t(layout.failed ? 'boardLayoutFailed' : 'boardMoveFailed')}
        </Text>
      )}
      <Text aria-live="polite" className="monolith-board-status" role="status">
        {announcement}
      </Text>
      <Text aria-live="polite" className="monolith-board-status" role="status">
        {layout.announcement}
      </Text>
      <div
        ref={drag.board}
        className="database-grouped-board"
        data-dragging={!!drag.dragging}
        data-moving={!!pendingMove}
        data-column-dragging={!!layout.dragging}
        data-resizing={layout.resizing}
        data-layout-motion={layout.motion}
        onDragOver={layout.over}
        onDrop={layout.drop}
        aria-label={t('boardLabel')}
      >
        {layout.target && (
          <div
            className="database-board-column-indicator"
            style={{ left: layout.target.x }}
            aria-hidden="true"
          />
        )}
        <div className="database-board-columns" style={columns}>
          {groups.map(group => {
            const key = boardGroupKey(groupField.id, group.value)
            return (
              <div
                key={key}
                className="database-board-column-slot"
                data-board-layout
                data-board-column-key={key}
                data-collapsed={layout.closed(key)}
                data-dragging={layout.dragging === key}
                inert={layout.closed(key)}
                aria-hidden={layout.closed(key)}
              >
                <div
                  className="database-board-column-content"
                  style={{ width: layout.width(key) }}
                >
                  <BoardColumnHeader
                    group={group}
                    columnKey={key}
                    layout={layout}
                    disabled={dragDisabled || !!drag.dragging}
                    color={groupColor(group.value)}
                    count={
                      records.filter(record =>
                        values(record, groupField).includes(group.value)
                      ).length
                    }
                    onCreate={
                      !readOnly && onCreate
                        ? () =>
                            onCreate({
                              [groupField.id]: initial(groupField, group.value)
                            })
                        : undefined
                    }
                  />
                </div>
              </div>
            )
          })}
        </div>
        {sections.map(section => {
          const sectionKey = boardGroupKey(
            subgroupField?.id ?? '',
            section.value
          )
          const closed = layout.sectionClosed(sectionKey)
          return (
            <section key={sectionKey} className="database-board-section">
              {subgroupField && (
                <button
                  type="button"
                  className="database-board-group-toggle"
                  aria-expanded={!closed}
                  disabled={
                    dragDisabled || !!drag.dragging || !!layout.dragging
                  }
                  onClick={() => layout.toggleSection(sectionKey)}
                >
                  <Icon
                    icon={
                      closed ? 'lucide:chevron-right' : 'lucide:chevron-down'
                    }
                    size="16px"
                  />
                  <span>{section.label}</span>
                  <span className="database-group-count">
                    {section.records.length}
                  </span>
                </button>
              )}
              <div
                className="database-board-section-reveal"
                data-closed={closed}
                inert={closed}
                aria-hidden={closed}
              >
                <div className="database-board-section-content">
                  <div className="database-board-columns" style={columns}>
                    {groups.map(group => {
                      const columnKey = boardGroupKey(
                        groupField.id,
                        group.value
                      )
                      const key = boardCellKey(
                        groupField,
                        group.value,
                        subgroupField,
                        section.value
                      )
                      const cell = {
                        key,
                        group: group.value,
                        section: section.value
                      }
                      const order =
                        pendingMove?.target.key === key
                          ? pendingMove.order
                          : view?.config.sorts.length
                            ? []
                            : (view?.config.board_order?.[key] ?? [])
                      const items = orderedBoardRecords(
                        section.records.filter(record =>
                          values(record, groupField).includes(group.value)
                        ),
                        order
                      )
                      return (
                        <div
                          key={key}
                          className="database-board-column-slot"
                          data-board-layout
                          data-collapsed={layout.closed(columnKey)}
                          data-dragging={layout.dragging === columnKey}
                          inert={layout.closed(columnKey)}
                          aria-hidden={layout.closed(columnKey)}
                        >
                          <div
                            className="database-board-column-content"
                            style={{ width: layout.width(columnKey) }}
                          >
                            <Stack
                              className="monolith-board-column database-board-cell"
                              data-board-cell={key}
                              data-over={drag.target?.key === key}
                              gap="sm"
                              aria-label={group.label}
                              style={
                                colors.config?.columns === false
                                  ? undefined
                                  : colorStyle(groupColor(group.value))
                              }
                              onDragOver={event => drag.over(event, cell)}
                              onDragLeave={drag.leave}
                              onDrop={event => drag.drop(event, cell)}
                            >
                              {drag.target?.key === key && (
                                <div
                                  className="database-board-drop-indicator"
                                  style={{ top: drag.target.y }}
                                  aria-hidden="true"
                                />
                              )}
                              {items.map((record, position) => (
                                <div
                                  key={record.id}
                                  className="database-board-card-slot"
                                  data-board-slot={JSON.stringify([
                                    key,
                                    record.id
                                  ])}
                                  data-board-record={record.id}
                                >
                                  <DatabaseBoardCard
                                    fields={fields}
                                    groupField={groupField}
                                    groups={groups}
                                    record={record}
                                    editingNew={editingRecordId === record.id}
                                    onFinishName={onFinishName}
                                    dragging={
                                      drag.dragging?.id === record.id &&
                                      drag.dragging.key === key
                                    }
                                    dragDisabled={
                                      dragDisabled ||
                                      !!layout.dragging ||
                                      layout.resizing
                                    }
                                    sorted={!!view?.config.sorts.length}
                                    canMoveUp={position > 0}
                                    canMoveDown={position < items.length - 1}
                                    onReorder={direction => {
                                      const before =
                                        direction < 0
                                          ? items[position - 1]?.id
                                          : (items[position + 2]?.id ?? null)
                                      if (before === undefined) return
                                      drag.captureLayout(record.id, key, key)
                                      void move(
                                        record,
                                        { ...cell, id: record.id },
                                        { ...cell, before, y: 0 }
                                      )
                                    }}
                                    groupColor={
                                      colors.config
                                        ? undefined
                                        : groupColor(group.value)
                                    }
                                    onDrag={(id, point) =>
                                      id
                                        ? drag.start({ ...cell, id }, point)
                                        : drag.cancel()
                                    }
                                    onMove={(record, value) => {
                                      const targetKey = boardCellKey(
                                        groupField,
                                        value,
                                        subgroupField,
                                        section.value
                                      )
                                      drag.captureLayout(
                                        record.id,
                                        key,
                                        targetKey
                                      )
                                      void move(
                                        record,
                                        { ...cell, id: record.id },
                                        {
                                          key: targetKey,
                                          group: value,
                                          section: section.value,
                                          before: null,
                                          y: 0
                                        }
                                      )
                                    }}
                                  />
                                </div>
                              ))}
                              {onCreate && !readOnly && (
                                <Button
                                  namespace={false}
                                  className="monolith-board-create"
                                  variant="plain"
                                  icon="lucide:plus"
                                  justify="start"
                                  disabled={busy}
                                  onClick={() =>
                                    onCreate({
                                      [groupField.id]: initial(
                                        groupField,
                                        group.value
                                      ),
                                      ...(subgroupField
                                        ? {
                                            [subgroupField.id]: initial(
                                              subgroupField,
                                              section.value
                                            )
                                          }
                                        : {})
                                    })
                                  }
                                >
                                  {t('newRecord')}
                                </Button>
                              )}
                            </Stack>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </section>
          )
        })}
        <div className="database-board-collapsed-groups">
          {groups
            .filter(group =>
              layout.closed(boardGroupKey(groupField.id, group.value))
            )
            .map(group => (
              <button
                key={boardGroupKey(groupField.id, group.value)}
                type="button"
                className="database-board-group-toggle"
                aria-expanded={false}
                data-board-group-toggle={boardGroupKey(
                  groupField.id,
                  group.value
                )}
                aria-label={t('expandColumn', { group: group.label })}
                disabled={dragDisabled || !!drag.dragging || !!layout.dragging}
                onClick={() =>
                  layout.toggleColumn(boardGroupKey(groupField.id, group.value))
                }
              >
                <Icon icon="lucide:chevron-right" size="16px" />
                <span
                  className="database-tag-dot"
                  style={{
                    background: groupColor(group.value) ?? 'var(--text-muted)'
                  }}
                />
                <span>{group.label}</span>
                <span className="database-group-count">
                  {
                    records.filter(record =>
                      values(record, groupField).includes(group.value)
                    ).length
                  }
                </span>
              </button>
            ))}
        </div>
      </div>
    </>
  )
}
