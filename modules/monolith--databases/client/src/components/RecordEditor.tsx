import dayjs from 'dayjs'
import { useCallback, useEffect, useId, useRef, useState } from 'react'

import type { Appearance } from '@monolith/blocks'
import { useModuleTranslation } from '@monolith/localization'
import {
  AnimatedCollapse,
  AppearanceContext,
  AppearanceCover,
  BlockEditor,
  Box,
  Button,
  CanonicalSource,
  Flex,
  FloatingPopover,
  Icon,
  PageIdentity,
  PopoverButton,
  Stack,
  Text,
  useAnimatedClose
} from '@monolith/ui'

import { useDatabases } from '@/DatabaseProvider'
import { DraftConfirmation, useDraftGuard } from '@/useDraftGuard'
import { propertyIcons } from '@/utils/fieldPresentation'

import { computedKinds } from '../../../computed'
import {
  type CellValue,
  type Field,
  type RecordPage,
  tableItemType,
  viewProperties
} from '../../../shared'
import { type ItemType, itemType } from '../../../workspaceShared'
import { FieldEditor } from './FieldEditor'
import { PageConnections } from './PageConnections'
import { PropertyCell } from './PropertyCell'
import { RecordSurface } from './RecordSurface'
import { CalendarScheduleEditor } from './calendar/CalendarScheduleEditor'
import { ProjectActionsPanel } from './work/ProjectActionsPanel'

const emptyFields: Field[] = []

export function RecordEditor({
  record,
  initialValues,
  onDone: finishClose,
  returnLabel
}: {
  record?: RecordPage
  initialValues?: Record<string, CellValue>
  onDone: () => void
  returnLabel?: string
}) {
  const { closing, close: onDone } = useAnimatedClose(finishClose)

  const {
    api: workspaceAPI,
    base,
    index,
    selectedViewId,
    run,
    busy,
    openRecord,
    knowledge,
    openPage,
    readOnly,
    people
  } = useDatabases()

  const { t } = useModuleTranslation()
  const [title, setTitle] = useState(record?.title ?? '')
  const [content, setContent] = useState(record?.content ?? '')
  const [contentValid, setContentValid] = useState(true)

  const [appearance, setAppearance] = useState<Appearance>(
    record?.appearance ?? {}
  )

  const [description, setDescription] = useState(record?.description ?? '')
  const [comment, setComment] = useState('')
  const [templateName, setTemplateName] = useState('')
  const [templateEditor, setTemplateEditor] = useState(false)
  const [templateSaved, setTemplateSaved] = useState(false)

  const [kind, setKind] = useState<ItemType>(() =>
    itemType.parse(
      record?.item_type ??
        initialValues?.item_type ??
        tableItemType(base?.table_type)
    )
  )

  const [done, setDone] = useState(record?.done ?? initialValues?.done === true)

  const [status, setStatus] = useState(
    record?.done ? 'done' : (record?.status ?? 'planned')
  )

  const [priority, setPriority] = useState(record?.priority ?? 'normal')
  const [tags, setTags] = useState((record?.tags ?? []).join(', '))

  const parsedTags = [
    ...new Set(
      tags
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean)
    )
  ]

  const formatDate = (value: string | null | undefined, type: ItemType) =>
    value
      ? dayjs(value).format(
          type === 'event' ? 'YYYY-MM-DDTHH:mm' : 'YYYY-MM-DD'
        )
      : ''
  const [date, setDate] = useState(
    formatDate(record?.date, kind) ||
      (initialValues?.date ? formatDate(String(initialValues.date), kind) : '')
  )
  const [endDate, setEndDate] = useState(
    formatDate(record?.end_date, 'event') ||
      (initialValues?.end_date
        ? formatDate(String(initialValues.end_date), 'event')
        : '')
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
  const [showSystem, setShowSystem] = useState(false)
  const propertiesId = useId()
  const systemPropertiesId = useId()
  const [propertiesOverride, setPropertiesExpanded] = useState<boolean>()

  const views = index.viewsByBase.get(base?.id ?? '') ?? []
  const view = views.find(view => view.id === selectedViewId) ?? views[0]
  const propertiesExpanded =
    propertiesOverride ?? view?.config.show_page_properties !== false

  const [fieldAnchor, setFieldAnchor] = useState<HTMLElement | null>(null)
  const [editingField, setEditingField] = useState<Field>()
  const saveRef = useRef<() => Promise<void>>(async () => {})
  const attempted = useRef('')
  const [saved, setSaved] = useState(record)
  const [scheduleDirty, setScheduleDirty] = useState(false)
  const [confirmBack, setConfirmBack] = useState(false)
  const [discarding, setDiscarding] = useState(false)
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
    description !== (saved?.description ?? '') ||
    JSON.stringify(appearance) !== JSON.stringify(saved?.appearance ?? {}) ||
    !contentValid ||
    kind !== (saved?.item_type ?? base?.source_type ?? 'page') ||
    done !== (saved?.done ?? false) ||
    status !== (saved?.done ? 'done' : (saved?.status ?? 'planned')) ||
    priority !== (saved?.priority ?? 'normal') ||
    JSON.stringify(parsedTags) !== JSON.stringify(saved?.tags ?? []) ||
    date !== formatDate(saved?.date, kind) ||
    endDate !== formatDate(saved?.end_date, 'event') ||
    project !== (saved?.project_id ?? '') ||
    title !== (saved?.title ?? '') ||
    content !== (saved?.content ?? '') ||
    JSON.stringify(values) !== JSON.stringify(saved?.values ?? {})

  const dirty =
    pageDirty || scheduleDirty || relationDrafts.size > 0 || !!comment.trim()

  const { blocker, allowNavigation } = useDraftGuard(dirty && !discarding)

  useEffect(() => {
    if (!record || pageDirty || busy || record.updated === saved?.updated)
      return

    const nextKind = itemType.parse(record.item_type ?? 'page')
    setSaved(record)
    setTitle(record.title)
    setContent(record.content)
    setValues(record.values)
    setAppearance(record.appearance ?? {})
    setDescription(record.description ?? '')
    setKind(nextKind)
    setDone(record.done ?? false)
    setStatus(record.done ? 'done' : (record.status ?? 'planned'))
    setPriority(record.priority ?? 'normal')
    setTags((record.tags ?? []).join(', '))
    setDate(formatDate(record.date, nextKind))
    setEndDate(formatDate(record.end_date, 'event'))
    setProject(record.project_id ?? '')
  }, [record, pageDirty, busy, saved?.updated])

  const fingerprint = JSON.stringify([
    title,
    content,
    appearance,
    description,
    kind,
    done,
    status,
    priority,
    tags,
    date,
    endDate,
    project,
    values
  ])
  useEffect(() => {
    if (
      !record ||
      !pageDirty ||
      busy ||
      readOnly ||
      !contentValid ||
      attempted.current === fingerprint
    )
      return

    const timer = setTimeout(() => {
      attempted.current = fingerprint
      void saveRef.current()
    }, 650)

    return () => clearTimeout(timer)
  }, [record?.id, pageDirty, busy, readOnly, contentValid, fingerprint])

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

    const requested = {
      title: title.trim() || t('untitledPage'),
      content,
      appearance,
      description,
      values,
      item_type: kind,
      done,
      status: status as 'planned' | 'active' | 'done',
      priority: priority as 'low' | 'normal' | 'high' | 'urgent',
      tags: parsedTags,
      ...dates,
      project_id: kind === 'task' ? project || null : null
    }
    const result = await run(async () => {
      if (!record)
        return workspaceAPI.createRecord.mutate({
          base_id: base.id,
          ...requested
        })

      // Canonical body/title saves have their own revision. Patch only changed
      // metadata, while refusing to overwrite another writer's property edit.
      const latest = (await workspaceAPI.snapshot.query()).records.find(
        item => item.id === record.id
      )

      if (!latest) throw Error(t('docs.unavailable'))

      const patch: Partial<typeof requested> = {}

      for (const key of Object.keys(requested) as (keyof typeof requested)[]) {
        if (key === 'values') continue

        const previous = saved?.[key]
        const next = requested[key]

        if (
          JSON.stringify(next) === JSON.stringify(previous) ||
          (key === 'title' && title === (saved?.title ?? '')) ||
          (key === 'content' && content === (saved?.content ?? ''))
        )
          continue

        const current = latest[key]

        if (
          JSON.stringify(current ?? null) !==
            JSON.stringify(previous ?? null) &&
          JSON.stringify(current) !== JSON.stringify(next)
        )
          throw Error(t('docs.reloadConfirm'))
        Object.assign(patch, { [key]: next })
      }

      const changedKeys = new Set([
        ...Object.keys(values),
        ...Object.keys(saved?.values ?? {})
      ])
      const merged = { ...latest.values }

      let valuesChanged = false

      for (const key of changedKeys) {
        if (JSON.stringify(values[key]) === JSON.stringify(saved?.values[key]))
          continue
        if (
          JSON.stringify(latest.values[key]) !==
            JSON.stringify(saved?.values[key]) &&
          JSON.stringify(latest.values[key]) !== JSON.stringify(values[key])
        )
          throw Error(t('docs.reloadConfirm'))
        valuesChanged = true
        if (values[key] === undefined) delete merged[key]
        else merged[key] = values[key]!
      }
      if (valuesChanged) patch.values = merged

      return workspaceAPI.updateRecord
        .input({ id: record.id })
        .mutate({ ...patch, expected_updated: latest.updated })
    })

    if (result) {
      setSaved(result)
      setTitle(current => (current === title ? result.title : current))
      setContent(current => (current === content ? result.content : current))
      setValues(current =>
        JSON.stringify(current) === JSON.stringify(values)
          ? result.values
          : current
      )
      setKind(itemType.parse(result.item_type))
      setDone(result.done)
      setStatus(result.done ? 'done' : (result.status ?? 'planned'))
      setPriority(result.priority ?? 'normal')
      setTags((result.tags ?? []).join(', '))
      setDate(formatDate(result.date, itemType.parse(result.item_type)))
      setEndDate(formatDate(result.end_date, 'event'))
      setProject(result.project_id ?? '')

      if (!record) {
        allowNavigation()
        onDone()
        openRecord(result)
      }
    }
  }

  saveRef.current = save
  const builtins = viewProperties(base.id, t).filter(
    field => field.id !== 'done' || kind === 'task'
  )
  const pageFields = [
    ...(showSystem || kind !== 'page' ? builtins : []),
    ...fields
  ]
  const propertyValues: Record<string, CellValue | undefined> = {
    ...values,
    item_type: kind,
    done,
    status,
    priority,
    tags: parsedTags,
    date,
    end_date: endDate,
    project_id: project
  }

  function changeProperty(field: Field, value: CellValue) {
    switch (field.id) {
      case 'item_type': {
        const next = itemType.parse(value)
        setDate(previous =>
          previous
            ? next === 'event'
              ? previous.includes('T')
                ? previous
                : previous + 'T12:00'
              : previous.slice(0, 10)
            : ''
        )
        setKind(next)
        break
      }
      case 'status':
        setStatus(String(value))
        setDone(value === 'done')
        break
      case 'done':
        setDone(value === true)
        setStatus(value === true ? 'done' : 'planned')
        break
      case 'priority':
        setPriority(String(value))
        break
      case 'tags':
        setTags(Array.isArray(value) ? value.join(', ') : String(value ?? ''))
        break
      case 'date':
        setDate(String(value ?? ''))
        break
      case 'end_date':
        setEndDate(String(value ?? ''))
        break
      case 'project_id':
        setProject(String(value ?? ''))
        break
      default:
        setValues(current => ({ ...current, [field.id]: value }))
    }
  }

  const propertyRow = (field: Field) => (
    <Flex key={field.id} align="start" className="database-page-property-row">
      <button
        className="database-property-label"
        disabled={readOnly || !fields.includes(field)}
        type="button"
        onClick={event => {
          setEditingField(field)
          setFieldAnchor(event.currentTarget)
        }}
      >
        <Icon color="muted" icon={propertyIcons[field.kind]} size="16px" />
        <span>{field.name}</span>
      </button>
      <PropertyCell
        disabled={busy || readOnly}
        field={field}
        record={record}
        value={
          computedKinds.has(field.kind)
            ? record?.values[field.id]
            : propertyValues[field.id]
        }
        onChange={value => changeProperty(field, value)}
        onRelationDirty={relationDirtyChange}
      />
    </Flex>
  )
  const pageProperties = (
    <Stack className="database-page-metadata" gap="xs">
      <AnimatedCollapse id={propertiesId} open={propertiesExpanded}>
        <Stack className="database-page-properties" gap="xs">
          <AnimatedCollapse
            id={systemPropertiesId}
            open={showSystem || kind !== 'page'}
          >
            <Stack gap="xs">{builtins.map(propertyRow)}</Stack>
          </AnimatedCollapse>
          {fields.map(propertyRow)}
          {!readOnly && (
            <Button
              className="database-add-property"
              icon="lucide:plus"
              justify="start"
              namespace={false}
              variant="plain"
              onClick={event => {
                setEditingField(undefined)
                setFieldAnchor(event.currentTarget)
              }}
            >
              {t('addField')}
            </Button>
          )}
          {kind === 'page' && (
            <Button
              aria-controls={systemPropertiesId}
              aria-expanded={showSystem}
              className="database-more-properties"
              icon="lucide:chevron-down"
              justify="start"
              namespace={false}
              variant="plain"
              onClick={() => setShowSystem(!showSystem)}
            >
              {t(showSystem ? 'hideSystemProperties' : 'showSystemProperties')}
            </Button>
          )}
        </Stack>
      </AnimatedCollapse>
      {(!propertiesExpanded || fields.length + builtins.length > 5) && (
        <Button
          aria-controls={propertiesId}
          aria-expanded={propertiesExpanded}
          className="database-more-properties"
          icon="lucide:chevron-down"
          justify="start"
          namespace={false}
          variant="plain"
          onClick={() => setPropertiesExpanded(!propertiesExpanded)}
        >
          {t(propertiesExpanded ? 'hideProperties' : 'showProperties', {
            count: pageFields.length
          })}
        </Button>
      )}
      {saved &&
        (kind === 'event' ||
          kind === 'task' ||
          fields.some(field => field.kind === 'date')) && (
          <CalendarScheduleEditor
            record={saved}
            onDirtyChange={setScheduleDirty}
          />
        )}
      {record && (
        <Stack className="database-comments" gap="sm">
          <Text as="h3" color="muted" size="xs" weight="semibold">
            {t('comments')}
          </Text>
          {(record.comments ?? []).map(item => (
            <Flex
              key={item.id}
              align="start"
              className="database-comment"
              gap="sm"
            >
              <span className="database-comment-avatar">
                {(
                  people.find(person => person.id === item.author_id)?.label ??
                  '?'
                ).slice(0, 1)}
              </span>
              <Stack gap="xs">
                <Flex gap="sm">
                  <Text size="sm" weight="medium">
                    {people.find(person => person.id === item.author_id)
                      ?.label ?? t('unknownOwner')}
                  </Text>
                  <Text color="muted" size="xs">
                    {dayjs(item.created).format('MMM D, HH:mm')}
                  </Text>
                </Flex>
                <Text size="sm" whiteSpace="pre-wrap">
                  {item.text}
                </Text>
              </Stack>
            </Flex>
          ))}
          <Flex align="center" className="database-comment-composer" gap="sm">
            <span className="database-comment-avatar">
              <Icon icon="lucide:user" size="16px" />
            </span>
            <textarea
              aria-label={t('addComment')}
              disabled={readOnly}
              placeholder={t('addComment')}
              rows={1}
              value={comment}
              onChange={event => setComment(event.target.value)}
            />
            {!!comment.trim() && (
              <Button
                aria-label={t('postComment')}
                disabled={busy || readOnly}
                icon="lucide:arrow-up"
                namespace={false}
                variant="plain"
                onClick={async () => {
                  const result = await run(() =>
                    workspaceAPI.addComment
                      .input({ id: record.id })
                      .mutate({ text: comment })
                  )

                  if (result) setComment('')
                }}
              />
            )}
          </Flex>
        </Stack>
      )}
    </Stack>
  )

  return (
    <RecordSurface
      appearance={appearance}
      closing={closing}
      toolbar={
        <Flex
          align="center"
          className="database-page-actions"
          gap="sm"
          justify="between"
        >
          <Button
            data-close-record
            aria-label={returnLabel ?? t('buttons.backToDatabase')}
            icon="lucide:panel-right-close"
            namespace={false}
            variant="plain"
            onClick={() => {
              if (dirty) setConfirmBack(true)
              else onDone()
            }}
          />
          <Flex align="center" gap="xs">
            <Text color="muted" role="status" size="xs">
              {busy
                ? t('savingPage')
                : t(dirty ? 'docs.changed' : 'docs.saved')}
            </Text>
            {(!record || pageDirty) && (
              <Button
                disabled={readOnly || busy || !contentValid}
                namespace={false}
                variant="plain"
                onClick={() => void save()}
              >
                {t('buttons.savePage')}
              </Button>
            )}
            <PopoverButton
              iconOnly
              icon="lucide:ellipsis"
              label={t('pageActions')}
              width={240}
            >
              <Stack gap="xs">
                <Button
                  icon="lucide:copy-plus"
                  justify="start"
                  namespace={false}
                  variant="plain"
                  onClick={() => setTemplateEditor(!templateEditor)}
                >
                  {t('saveTemplate')}
                </Button>
                <Button
                  icon="lucide:eye"
                  justify="start"
                  namespace={false}
                  variant="plain"
                  onClick={() => setPreview(!preview)}
                >
                  {t(preview ? 'buttons.editContent' : 'buttons.preview')}
                </Button>
                {record && (
                  <Button
                    icon="lucide:refresh-cw"
                    justify="start"
                    namespace={false}
                    variant="plain"
                    onClick={() => {
                      if (dirty && !window.confirm(t('docs.reloadConfirm')))
                        return
                      void run(async () => {
                        const latest = (
                          await workspaceAPI.snapshot.query()
                        ).records.find(item => item.id === record.id)

                        if (!latest) throw Error(t('docs.unavailable'))
                        setSaved(latest)
                        setTitle(latest.title)
                        setContent(latest.content)
                        setValues(latest.values)
                        setAppearance(latest.appearance ?? {})
                        setDescription(latest.description ?? '')
                        setKind(itemType.parse(latest.item_type ?? 'page'))
                        setStatus(latest.status ?? 'planned')
                        setDone(latest.done ?? false)
                        setPriority(latest.priority ?? 'normal')
                        setTags((latest.tags ?? []).join(', '))
                        setDate(formatDate(latest.date, kind))
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
                    icon="lucide:trash-2"
                    justify="start"
                    namespace={false}
                    variant="plain"
                    onClick={() => {
                      if (window.confirm(t('confirmDeleteRecord')))
                        void run(async () => {
                          await workspaceAPI.removeRecord
                            .input({ id: record.id })
                            .mutate(undefined)
                          allowNavigation()
                          onDone()
                        })
                    }}
                  >
                    {t('buttons.delete')}
                  </Button>
                )}
              </Stack>
            </PopoverButton>
          </Flex>
        </Flex>
      }
    >
      <Stack
        className="database-record-page"
        gap="sm"
        minWidth="0"
        width="100%"
      >
        {(blocker.state === 'blocked' || confirmBack) && (
          <DraftConfirmation
            onDiscard={() => {
              // Query-string navigation can commit after this render. Keep the
              // explicit discard decision until the editor closes.
              setDiscarding(true)
              setConfirmBack(false)
              allowNavigation()
              if (blocker.state === 'blocked') blocker.proceed()
              else onDone()
            }}
            onKeepEditing={() => {
              setConfirmBack(false)
              if (blocker.state === 'blocked') blocker.reset()
            }}
          />
        )}
        <AppearanceContext
          value={{
            appearance,
            readOnly,
            changeIcon: async icon =>
              setAppearance(current => ({ ...current, icon })),
            changeCover: async cover =>
              setAppearance(current => ({ ...current, cover }))
          }}
        >
          <AppearanceCover />
          <PageIdentity />
        </AppearanceContext>
        {description && (
          <textarea
            aria-label={t('pageDescription')}
            className="database-page-description"
            disabled={readOnly}
            value={description}
            onChange={event => setDescription(event.target.value)}
          />
        )}
        {templateEditor && (
          <Flex gap="sm">
            <input
              aria-label={t('templateName')}
              placeholder={t('templateName')}
              value={templateName}
              onChange={event => setTemplateName(event.target.value)}
            />
            <Button
              disabled={busy || !templateName.trim()}
              namespace={false}
              onClick={async () => {
                const result = await run(() =>
                  workspaceAPI.saveTemplate.input({ id: base.id }).mutate({
                    id: crypto.randomUUID(),
                    source_record_id: record?.id,
                    name: templateName,
                    content,
                    description,
                    appearance,
                    values
                  })
                )

                if (result) {
                  setTemplateEditor(false)
                  setTemplateSaved(true)
                }
              }}
            >
              {t('buttons.save')}
            </Button>
          </Flex>
        )}
        {templateSaved && (
          <Text role="status" size="xs">
            {t('templateSaved')}
          </Text>
        )}
        {!record && !!base.templates?.length && (
          <Flex gap="xs" wrap="wrap">
            {base.templates.map(template => (
              <Button
                key={template.id}
                namespace={false}
                variant="plain"
                onClick={() => {
                  setContent(template.content)
                  setValues(template.values)
                  setAppearance(template.appearance)
                  setDescription(template.description)
                }}
              >
                {template.name}
              </Button>
            ))}
          </Flex>
        )}
        <div className="database-page-content">
          <CanonicalSource
            afterTitle={pageProperties}
            readOnly={readOnly || preview}
            source={record ? { kind: 'record', id: record.id } : undefined}
          >
            <Box
              aria-label={t('inputs.recordTitle')}
              as="input"
              className="database-page-title"
              disabled={readOnly}
              placeholder={t('untitledPage')}
              value={title}
              onChange={event => setTitle(event.target.value)}
            />
            {pageProperties}
            <BlockEditor
              pages={knowledge.nodes}
              readOnly={readOnly || preview}
              value={content}
              onChange={setContent}
              onCreatePage={async title => {
                if (readOnly || preview) return

                const page = await run(() =>
                  workspaceAPI.createRecord.mutate({
                    base_id: base.id,
                    title,
                    content: '',
                    values: {}
                  })
                )

                return page
                  ? { kind: 'record', id: page.id, title: page.title }
                  : undefined
              }}
              onOpenPage={openPage}
              onValidityChange={setContentValid}
            />
          </CanonicalSource>
        </div>
        {record?.item_type === 'project' && (
          <ProjectActionsPanel projectId={record.id} />
        )}
        {record && <PageConnections pageKey={`record:${record.id}`} />}
        {fieldAnchor && (
          <FloatingPopover
            anchor={fieldAnchor}
            className="database-floating-panel"
            label={t(editingField ? 'editField' : 'addField')}
            width={300}
            onClose={() => setFieldAnchor(null)}
          >
            <FieldEditor
              key={editingField?.id ?? 'new'}
              field={editingField}
              onDone={() => setFieldAnchor(null)}
            />
          </FloatingPopover>
        )}
      </Stack>
    </RecordSurface>
  )
}
