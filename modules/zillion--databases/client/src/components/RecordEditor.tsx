import dayjs from 'dayjs'
import { useCallback, useState } from 'react'

import { useModuleTranslation } from '@lifeforge/localization'
import {
  BlockEditor,
  Button,
  Flex,
  Grid,
  Stack,
  Text,
  TextInput
} from '@lifeforge/ui'

import { useDatabases } from '@/DatabaseProvider'
import { DraftConfirmation, useDraftGuard } from '@/useDraftGuard'

import type { CellValue, Field, RecordPage } from '../../../shared'
import { type ItemType, itemType } from '../../../workspaceShared'
import { PageConnections } from './PageConnections'
import { PropertyEditor } from './PropertyEditor'
import { RelationEditor } from './RelationEditor'
import { SelectInput } from './SelectInput'

const emptyFields: Field[] = []

export function RecordEditor({
  record,
  initialValues,
  onDone
}: {
  record?: RecordPage
  initialValues?: Record<string, CellValue>
  onDone: () => void
}) {
  const {
    api: forgeAPI,
    base,
    index,
    run,
    busy,
    openRecord,
    knowledge,
    openPage,
    readOnly
  } = useDatabases()

  const { t } = useModuleTranslation()
  const [title, setTitle] = useState(record?.title ?? '')
  const [content, setContent] = useState(record?.content ?? '')
  const [contentValid, setContentValid] = useState(true)

  const [kind, setKind] = useState<ItemType>(() =>
    itemType.parse(
      record?.item_type ??
        initialValues?.item_type ??
        base?.source_type ??
        'page'
    )
  )

  const [done, setDone] = useState(record?.done ?? initialValues?.done === true)

  const formatDate = (value: string | null | undefined, type: ItemType) =>
    value
      ? dayjs(value).format(
          type === 'event' ? 'YYYY-MM-DDTHH:mm' : 'YYYY-MM-DD'
        )
      : ''
  const [date, setDate] = useState(
    formatDate(record?.date, kind) ||
      (initialValues?.date
        ? `${initialValues.date}${kind === 'event' ? 'T12:00' : ''}`
        : '')
  )
  const [endDate, setEndDate] = useState(
    formatDate(record?.end_date, 'event') ||
      (initialValues?.end_date ? `${initialValues.end_date}T12:00` : '')
  )

  const [project, setProject] = useState(record?.project_id ?? '')

  const [values, setValues] = useState<Record<string, CellValue>>(
    record?.values ??
      Object.fromEntries(
        Object.entries(initialValues ?? {}).filter(
          ([key]) => !['date', 'end_date', 'done', 'item_type'].includes(key)
        )
      )
  )

  const [preview, setPreview] = useState(false)
  const [saved, setSaved] = useState(record)
  const [confirmBack, setConfirmBack] = useState(false)
  const [relationDrafts, setRelationDrafts] = useState(() => new Set<string>())

  const relationDirtyChange = useCallback((id: string, dirty: boolean) => {
    setRelationDrafts(previous => {
      if (previous.has(id) === dirty) return previous

      const next = new Set(previous)

      if (dirty) next.add(id)
      else next.delete(id)

      return next
    })
  }, [])

  const pageDirty =
    !contentValid ||
    kind !== (saved?.item_type ?? base?.source_type ?? 'page') ||
    done !== (saved?.done ?? false) ||
    date !== formatDate(saved?.date, kind) ||
    endDate !== formatDate(saved?.end_date, 'event') ||
    project !== (saved?.project_id ?? '') ||
    title !== (saved?.title ?? '') ||
    content !== (saved?.content ?? '') ||
    JSON.stringify(values) !== JSON.stringify(saved?.values ?? {})

  const dirty = pageDirty || relationDrafts.size > 0

  const { blocker, allowNavigation } = useDraftGuard(dirty)

  if (!base) return null

  const fields = index.fieldsByBase.get(base.id) ?? emptyFields

  async function save() {
    if (!base || !contentValid || busy || readOnly) return

    const dates = {
      date: date
        ? date === formatDate(saved?.date, kind)
          ? saved?.date
          : dayjs(kind === 'event' ? date : `${date}T12:00:00`).toISOString()
        : null,
      end_date: endDate
        ? endDate === formatDate(saved?.end_date, 'event')
          ? saved?.end_date
          : dayjs(endDate).toISOString()
        : null
    }

    const result = await run(() =>
      record
        ? forgeAPI.updateRecord.input({ id: record.id }).mutate({
            title,
            content,
            values,
            item_type: kind,
            done,
            ...dates,
            project_id: kind === 'task' ? project || null : null,
            expected_updated: saved?.updated
          })
        : forgeAPI.createRecord.mutate({
            base_id: base.id,
            title,
            content,
            values,
            item_type: kind,
            done,
            ...dates,
            project_id: kind === 'task' ? project || null : null
          })
    )

    if (result) {
      setSaved(result)
      setTitle(result.title)
      setContent(result.content)
      setValues(result.values)
      setKind(itemType.parse(result.item_type))
      setDone(result.done)
      setDate(formatDate(result.date, itemType.parse(result.item_type)))
      setEndDate(formatDate(result.end_date, 'event'))
      setProject(result.project_id ?? '')

      if (!record) {
        allowNavigation()
        openRecord(result)
      }
    }
  }

  return (
    <Stack
      className="zillion-workspace-enter"
      gap="lg"
      minWidth="0"
      width="100%"
    >
      {(blocker.state === 'blocked' || confirmBack) && (
        <DraftConfirmation
          onDiscard={() => {
            setConfirmBack(false)
            if (blocker.state === 'blocked') blocker.proceed()
            else onDone()
          }}
          onKeepEditing={() => {
            setConfirmBack(false)
            if (blocker.state === 'blocked') blocker.reset()
          }}
        />
      )}
      <Flex gap="sm" justify="between" wrap="wrap">
        <Button
          disabled={busy}
          icon="tabler:arrow-left"
          variant="plain"
          onClick={
            record
              ? onDone
              : () => {
                  if (dirty) setConfirmBack(true)
                  else onDone()
                }
          }
        >
          backToDatabase
        </Button>
        <Flex gap="sm" wrap="wrap">
          <Button
            disabled={
              readOnly ||
              !contentValid ||
              !title.trim() ||
              (!pageDirty && !!saved)
            }
            icon="tabler:device-floppy"
            loading={busy}
            onClick={() => {
              void save()
            }}
          >
            savePage
          </Button>
          {record && (
            <Button
              disabled={busy || readOnly}
              icon="tabler:refresh"
              namespace={false}
              variant="plain"
              onClick={() => {
                if (dirty && !window.confirm(t('docs.reloadConfirm'))) return
                void run(async () => {
                  const latest = (await forgeAPI.snapshot.query()).records.find(
                    item => item.id === record.id
                  )

                  if (!latest) throw new Error(t('docs.unavailable'))
                  setSaved(latest)
                  setTitle(latest.title)
                  setContent(latest.content)
                  setValues(latest.values)
                  setKind(itemType.parse(latest.item_type ?? 'page'))
                  setDone(latest.done ?? false)
                  setDate(
                    formatDate(
                      latest.date,
                      itemType.parse(latest.item_type ?? 'page')
                    )
                  )
                  setEndDate(formatDate(latest.end_date, 'event'))
                  setProject(latest.project_id ?? '')

                  return true
                })
              }}
            >
              {t('docs.reload')}
            </Button>
          )}
          {record && (
            <Button
              dangerous
              disabled={busy || readOnly}
              icon="tabler:trash"
              variant="secondary"
              onClick={() => {
                if (window.confirm(t('confirmDeleteRecord')))
                  void run(async () => {
                    await forgeAPI.removeRecord
                      .input({ id: record.id })
                      .mutate(undefined)
                    allowNavigation()
                    onDone()
                  })
              }}
            >
              delete
            </Button>
          )}
        </Flex>
      </Flex>
      <Text as="h2" size="2xl" weight="semibold">
        {title || t('newRecord')}
      </Text>
      <Text color="muted" role="status" size="sm">
        {t(dirty ? 'docs.changed' : 'docs.saved')}
      </Text>
      <TextInput
        required
        disabled={busy || readOnly}
        icon="tabler:file-text"
        label="inputs.recordTitle"
        placeholder=""
        value={title}
        onChange={setTitle}
      />
      <Grid gap="md" templateCols={{ base: 1, md: 2 }}>
        <SelectInput
          disabled={busy || readOnly}
          label={t('itemType')}
          options={itemType.options.map(value => ({
            value,
            label: t(`itemTypes.${value}`)
          }))}
          value={kind}
          onChange={value => {
            const next = itemType.parse(value)
            setDate(previous =>
              previous
                ? next === 'event'
                  ? previous.includes('T')
                    ? previous
                    : `${previous}T12:00`
                  : previous.slice(0, 10)
                : ''
            )
            setKind(next)
          }}
        />
        {(kind === 'task' || kind === 'event') && (
          <label>
            {t('itemDate')}
            <input
              disabled={busy || readOnly}
              type={kind === 'event' ? 'datetime-local' : 'date'}
              value={date}
              onChange={event => setDate(event.target.value)}
            />
          </label>
        )}
        {kind === 'event' && (
          <label>
            {t('itemEndDate')}
            <input
              disabled={busy || readOnly}
              min={date}
              type="datetime-local"
              value={endDate}
              onChange={event => setEndDate(event.target.value)}
            />
          </label>
        )}
        {kind === 'task' && (
          <>
            <label>
              <input
                checked={done}
                disabled={busy || readOnly}
                type="checkbox"
                onChange={event => setDone(event.target.checked)}
              />{' '}
              {t('itemDone')}
            </label>
            <SelectInput
              disabled={busy || readOnly}
              label={t('itemProject')}
              options={[
                { value: '', label: t('noProject') },
                ...index.recordsByBase.values()
              ].flatMap(value =>
                Array.isArray(value)
                  ? value
                      .filter(item => item.item_type === 'project')
                      .map(item => ({ value: item.id, label: item.title }))
                  : [value]
              )}
              value={project}
              onChange={setProject}
            />
          </>
        )}
        {fields
          .filter(field => field.kind !== 'relation')
          .map(field => (
            <Stack key={field.id} gap="xs">
              <PropertyEditor
                disabled={busy || readOnly}
                field={field}
                value={values[field.id]}
                onChange={value =>
                  setValues(values => ({ ...values, [field.id]: value }))
                }
              />
              <Button
                disabled={busy || readOnly}
                justify="start"
                variant="plain"
                onClick={() =>
                  setValues(values => {
                    const result = { ...values }
                    delete result[field.id]

                    return result
                  })
                }
              >
                clear
              </Button>
            </Stack>
          ))}
      </Grid>
      <Stack bg={{ base: 'bg-100', dark: 'bg-900' }} gap="md" p="lg" r="xl">
        <Flex align="center" gap="sm" justify="between" wrap="wrap">
          <Text as="h3" size="lg" weight="semibold">
            {t('pageContent')}
          </Text>
          <Button
            aria-pressed={preview}
            icon={preview ? 'tabler:pencil' : 'tabler:eye'}
            variant="plain"
            onClick={() => setPreview(!preview)}
          >
            {preview ? 'editContent' : 'preview'}
          </Button>
        </Flex>
        <BlockEditor
          pages={knowledge.nodes}
          readOnly={readOnly || preview || busy}
          value={content}
          onChange={setContent}
          onOpenPage={openPage}
          onValidityChange={setContentValid}
        />
      </Stack>
      {record && <PageConnections pageKey={`record:${record.id}`} />}
      {record ? (
        <Grid gap="md" templateCols={{ base: 1, md: 2 }}>
          {fields
            .filter(field => field.kind === 'relation')
            .map(field => (
              <RelationEditor
                key={field.id}
                field={field}
                record={record}
                onDirtyChange={relationDirtyChange}
              />
            ))}
        </Grid>
      ) : (
        fields.some(field => field.kind === 'relation') && (
          <Text color="muted">{t('saveBeforeLinking')}</Text>
        )
      )}
    </Stack>
  )
}
