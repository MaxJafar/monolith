import { useModuleTranslation } from '@monolith/localization'
import {
  Button,
  ContextMenu,
  ContextMenuItem,
  Flex,
  Icon,
  Stack,
  Text,
  elasticDragPreview,
  setInternalDragData
} from '@monolith/ui'
import { useEffect, useRef, useState } from 'react'

import { useDatabases } from '@/DatabaseProvider'
import { type BoardGroup, boardValues } from '@/utils/board'
import { colorStyle, useViewColors } from '@/utils/viewColors'

import { type CellValue, type Field, type RecordPage } from '../../../shared'
import { DatabaseCardProperties } from './DatabaseCardProperties'

export function DatabaseBoardCard({
  record,
  fields,
  groupField,
  groups,
  dragging,
  dragDisabled = false,
  sorted = false,
  canMoveUp = false,
  canMoveDown = false,
  onReorder,
  groupColor,
  editingNew = false,
  onFinishName,
  onDrag,
  onMove
}: {
  record: RecordPage
  fields: Field[]
  groupField: Field
  groups: BoardGroup[]
  groupColor?: string
  dragging: boolean
  dragDisabled?: boolean
  sorted?: boolean
  canMoveUp?: boolean
  canMoveDown?: boolean
  onReorder?: (direction: -1 | 1) => void
  editingNew?: boolean
  onFinishName?: () => void
  onDrag: (id: string | null, point?: { x: number; y: number }) => void
  onMove: (record: RecordPage, value: CellValue) => void
}) {
  const { api, run, openRecord, busy, readOnly, data } = useDatabases()
  const { t } = useModuleTranslation()
  const colors = useViewColors()
  const [titleDraft, setTitleDraft] = useState<string | null>(null)
  const titleButton = useRef<HTMLButtonElement>(null)
  const dragHandle = useRef<HTMLButtonElement>(null)
  const restoreDragFocus = useRef(false)
  const pending = useRef<Promise<RecordPage | undefined> | null>(null)
  const pendingTitle = useRef<Promise<RecordPage | undefined> | null>(null)
  const savedRecord = useRef<RecordPage | null>(null)
  const stopPreview = useRef<(() => void) | undefined>(undefined)
  const editing = !readOnly && (editingNew || titleDraft !== null)
  const disabled = readOnly || (busy && !pendingTitle.current)
  const canDrag = !busy && !readOnly && !editing && !dragDisabled
  useEffect(() => {
    if (!canDrag || !restoreDragFocus.current) return
    restoreDragFocus.current = false
    if (
      document.activeElement === document.body ||
      document.activeElement === document.documentElement ||
      document.activeElement === dragHandle.current
    )
      dragHandle.current?.focus()
  }, [canDrag])
  useEffect(() => {
    if (!dragging || !canDrag) stopPreview.current?.()
  }, [dragging, canDrag])
  useEffect(
    () => () => {
      stopPreview.current?.()
      stopPreview.current = undefined
    },
    []
  )

  // A blur can save the name just before a property is edited. Keep those
  // writes ordered and carry the returned revision into the next edit.
  function update(
    patch: (
      current: RecordPage
    ) => Partial<Pick<RecordPage, 'title' | 'values'>>
  ) {
    if (readOnly) return Promise.resolve(undefined)
    const previous = pending.current
    const request = (async () => {
      if (previous && !(await previous)) return undefined
      const current =
        savedRecord.current && savedRecord.current.updated >= record.updated
          ? savedRecord.current
          : record
      const result = await run(() =>
        api.updateRecord.input({ id: record.id }).mutate({
          ...patch(current),
          expected_updated: current.updated
        })
      )
      if (result) savedRecord.current = result
      return result
    })()
    pending.current = request
    void request.finally(() => {
      if (pending.current === request) pending.current = null
    })
    return request
  }

  function finishName(): Promise<RecordPage | undefined> {
    if (pendingTitle.current) return pendingTitle.current
    if (!editing) return pending.current ?? Promise.resolve(record)
    const title = (titleDraft ?? '').trim() || t('untitledPage')
    const request = (
      title === record.title
        ? Promise.resolve(record)
        : update(() => ({ title }))
    ).then(result => {
      if (result) {
        setTitleDraft(null)
        onFinishName?.()
      }
      pendingTitle.current = null
      return result
    })
    pendingTitle.current = request
    return request
  }

  function fitTitle(input: HTMLTextAreaElement) {
    input.style.height = '0px'
    input.style.height = `${input.scrollHeight}px`
  }

  return (
    <Stack
      as="article"
      className="monolith-board-card"
      data-record-id={record.id}
      data-editing={editing}
      data-dragging={dragging}
      draggable={canDrag}
      gap="sm"
      p="md"
      position="relative"
      r="md"
      style={colors.style(record) ?? colorStyle(groupColor)}
      onDragEnd={() => onDrag(null)}
      onDragStart={event => {
        if (
          !canDrag ||
          (event.target instanceof Element &&
            !event.target.closest('[data-board-drag-handle]') &&
            event.target.closest(
              'button,input,textarea,select,a,[contenteditable="true"],[role="dialog"]'
            ))
        ) {
          event.preventDefault()

          return
        }
        setInternalDragData(
          event.nativeEvent,
          'application/x-monolith-record',
          record.id
        )
        event.dataTransfer.effectAllowed = 'move'
        stopPreview.current = elasticDragPreview(
          event.nativeEvent,
          record.title,
          event.currentTarget
        )
        onDrag(record.id, { x: event.clientX, y: event.clientY })
      }}
    >
      <Flex
        align="start"
        gap="sm"
        justify="between"
        className="database-board-card-header"
      >
        <Flex
          align="start"
          gap="sm"
          flex="1"
          minWidth="0"
          className="database-board-title"
        >
          {!readOnly ? (
            <button
              ref={dragHandle}
              type="button"
              className="database-board-drag-handle"
              data-board-drag-handle
              draggable={canDrag}
              disabled={!canDrag}
              aria-label={t('dragCard', { title: record.title })}
              title={t(sorted ? 'dragCardSortedHelp' : 'dragCardHelp')}
              onKeyDown={event => {
                if (!event.altKey || !onReorder) return
                const direction =
                  event.key === 'ArrowUp' && canMoveUp
                    ? -1
                    : event.key === 'ArrowDown' && canMoveDown
                      ? 1
                      : null
                if (direction) {
                  event.preventDefault()
                  event.stopPropagation()
                  restoreDragFocus.current = true
                  onReorder(direction)
                }
              }}
            >
              <Icon
                className="database-board-page-icon"
                icon={
                  record.appearance?.icon ??
                  (record.done
                    ? 'tabler:circle-check'
                    : 'tabler:file-description')
                }
                size="16px"
              />
              <Icon
                className="database-board-grip-icon"
                icon="lucide:grip-vertical"
                size="16px"
              />
            </button>
          ) : (
            <Icon
              aria-hidden="true"
              color="muted"
              icon={
                record.appearance?.icon ??
                (record.done
                  ? 'tabler:circle-check'
                  : 'tabler:file-description')
              }
              size="16px"
            />
          )}
          {editing ? (
            <textarea
              autoFocus
              ref={input => {
                if (input) fitTitle(input)
              }}
              className="database-board-title-input"
              aria-label={t('inputs.recordTitle')}
              placeholder={t('cardNamePlaceholder')}
              rows={1}
              maxLength={255}
              value={titleDraft ?? ''}
              readOnly={busy}
              onFocus={event => event.currentTarget.select()}
              onChange={event => {
                setTitleDraft(event.target.value)
                fitTitle(event.currentTarget)
              }}
              onBlur={() => void finishName()}
              onKeyDown={event => {
                if (event.nativeEvent.isComposing) return
                if (event.key === 'Enter') {
                  event.preventDefault()
                  event.stopPropagation()
                  const input = event.currentTarget
                  void finishName().then(result => {
                    if (result)
                      requestAnimationFrame(() => {
                        if (
                          document.activeElement === input ||
                          document.activeElement === document.body
                        )
                          titleButton.current?.focus()
                      })
                  })
                }
                if (event.key === 'Escape') {
                  event.preventDefault()
                  event.stopPropagation()
                  setTitleDraft(null)
                  onFinishName?.()
                  requestAnimationFrame(() => titleButton.current?.focus())
                }
              }}
            />
          ) : readOnly ? (
            <Text weight="medium">{record.title}</Text>
          ) : (
            <button
              ref={titleButton}
              type="button"
              className="database-board-title-button"
              disabled={busy}
              aria-label={t('editCardName', { title: record.title })}
              onClick={() => setTitleDraft(record.title)}
            >
              {record.title}
            </button>
          )}
        </Flex>
        <Flex align="center" gap="xs" className="database-board-card-actions">
          <Button
            namespace={false}
            variant="plain"
            className="database-board-open"
            icon="lucide:panel-right"
            aria-label={t('openRecordPage', { title: record.title })}
            disabled={busy && !pendingTitle.current}
            onPointerDown={event => {
              if (editing) event.preventDefault()
            }}
            onClick={() => {
              void finishName().then(result => {
                if (result) openRecord(result)
              })
            }}
          >
            {t('openPage')}
          </Button>
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
              {onReorder && (
                <>
                  <ContextMenuItem
                    namespace={false}
                    icon="lucide:arrow-up"
                    label={t('boardMoveUp')}
                    disabled={dragDisabled || !canMoveUp}
                    onClick={() => onReorder(-1)}
                  />
                  <ContextMenuItem
                    namespace={false}
                    icon="lucide:arrow-down"
                    label={t('boardMoveDown')}
                    disabled={dragDisabled || !canMoveDown}
                    onClick={() => onReorder(1)}
                  />
                </>
              )}
              {groups.map(group => (
                <ContextMenuItem
                  key={String(group.value)}
                  checked={boardValues(record, groupField, data.links).includes(
                    group.value
                  )}
                  disabled={
                    busy ||
                    dragDisabled ||
                    boardValues(record, groupField, data.links).includes(
                      group.value
                    )
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
      </Flex>
      <DatabaseCardProperties
        fields={fields}
        record={record}
        disabled={disabled}
        onChange={
          readOnly
            ? undefined
            : (field, value) => {
                void update(current => ({
                  values: { ...current.values, [field.id]: value }
                }))
              }
        }
      />
    </Stack>
  )
}
