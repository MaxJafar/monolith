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
  IconPickerModal,
  PopoverButton,
  Stack,
  Text,
  useAnimatedClose,
  useCoverPicker,
  useModalStore
} from '@monolith/ui'
import dayjs from 'dayjs'
import { useCallback, useEffect, useId, useRef, useState } from 'react'

import { useDatabases } from '@/DatabaseProvider'
import { DraftConfirmation, useDraftGuard } from '@/useDraftGuard'
import { propertyIcons } from '@/utils/fieldPresentation'

import { computedKinds } from '../../../computed'
import {
  type CellValue,
  type Field,
  type RecordPage,
  viewProperties
} from '../../../shared'
import { type ItemType, itemType } from '../../../workspaceShared'
import { FieldEditor } from './FieldEditor'
import { PageConnections } from './PageConnections'
import { PropertyCell } from './PropertyCell'
import { RecordSurface } from './RecordSurface'

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
  const pickCover = useCoverPicker()
  const { open: openModal } = useModalStore()

  const [kind, setKind] = useState<ItemType>(() =>
    itemType.parse(
      record?.item_type ??
        initialValues?.item_type ??
        base?.source_type ??
        'page'
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

  const dirty = pageDirty || relationDrafts.size > 0 || !!comment.trim()

  const { blocker, allowNavigation } = useDraftGuard(dirty)

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
        return workspaceAPI.createRecord.mutate({ base_id: base.id, ...requested })
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
        type="button"
        className="database-property-label"
        disabled={readOnly || !fields.includes(field)}
        onClick={event => {
          setEditingField(field)
          setFieldAnchor(event.currentTarget)
        }}
      >
        <Icon icon={propertyIcons[field.kind]} size="16px" color="muted" />
        <span>{field.name}</span>
      </button>
      <PropertyCell
        field={field}
        value={
          computedKinds.has(field.kind)
            ? record?.values[field.id]
            : propertyValues[field.id]
        }
        record={record}
        disabled={busy || readOnly}
        onChange={value => changeProperty(field, value)}
        onRelationDirty={relationDirtyChange}
      />
    </Flex>
  )
  const pageProperties = (
    <Stack className="database-page-metadata" gap="xs">
      <AnimatedCollapse open={propertiesExpanded} id={propertiesId}>
        <Stack gap="xs" className="database-page-properties">
          <AnimatedCollapse
            open={showSystem || kind !== 'page'}
            id={systemPropertiesId}
          >
            <Stack gap="xs">{builtins.map(propertyRow)}</Stack>
          </AnimatedCollapse>
          {fields.map(propertyRow)}
          {!readOnly && (
            <Button
              namespace={false}
              className="database-add-property"
              variant="plain"
              icon="lucide:plus"
              justify="start"
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
              namespace={false}
              className="database-more-properties"
              variant="plain"
              icon="lucide:chevron-down"
              aria-expanded={showSystem}
              aria-controls={systemPropertiesId}
              justify="start"
              onClick={() => setShowSystem(!showSystem)}
            >
              {t(showSystem ? 'hideSystemProperties' : 'showSystemProperties')}
            </Button>
          )}
        </Stack>
      </AnimatedCollapse>
      {(!propertiesExpanded || fields.length + builtins.length > 5) && (
        <Button
          namespace={false}
          className="database-more-properties"
          variant="plain"
          icon="lucide:chevron-down"
          aria-expanded={propertiesExpanded}
          aria-controls={propertiesId}
          justify="start"
          onClick={() => setPropertiesExpanded(!propertiesExpanded)}
        >
          {t(propertiesExpanded ? 'hideProperties' : 'showProperties', {
            count: pageFields.length
          })}
        </Button>
      )}
      {record && (
        <Stack className="database-comments" gap="sm">
          <Text as="h3" size="xs" color="muted" weight="semibold">
            {t('comments')}
          </Text>
          {(record.comments ?? []).map(item => (
            <Flex
              key={item.id}
              gap="sm"
              className="database-comment"
              align="start"
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
                  <Text size="xs" color="muted">
                    {dayjs(item.created).format('MMM D, HH:mm')}
                  </Text>
                </Flex>
                <Text size="sm" whiteSpace="pre-wrap">
                  {item.text}
                </Text>
              </Stack>
            </Flex>
          ))}
          <Flex gap="sm" className="database-comment-composer" align="center">
            <span className="database-comment-avatar">
              <Icon icon="lucide:user" size="16px" />
            </span>
            <textarea
              rows={1}
              aria-label={t('addComment')}
              placeholder={t('addComment')}
              value={comment}
              onChange={event => setComment(event.target.value)}
              disabled={readOnly}
            />
            {!!comment.trim() && (
              <Button
                namespace={false}
                variant="plain"
                icon="lucide:arrow-up"
                aria-label={t('postComment')}
                disabled={busy || readOnly}
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
      closing={closing}
      appearance={appearance}
      toolbar={
        <Flex
          className="database-page-actions"
          justify="between"
          align="center"
          gap="sm"
        >
          <Button
            data-close-record
            namespace={false}
            variant="plain"
            icon="lucide:panel-right-close"
            aria-label={returnLabel ?? t('buttons.backToDatabase')}
            onClick={() => {
              if (dirty) setConfirmBack(true)
              else onDone()
            }}
          />
          <Flex gap="xs" align="center">
            <Text size="xs" color="muted" role="status">
              {busy
                ? t('savingPage')
                : t(dirty ? 'docs.changed' : 'docs.saved')}
            </Text>
            {(!record || pageDirty) && (
              <Button
                namespace={false}
                variant="plain"
                disabled={readOnly || busy || !contentValid}
                onClick={() => void save()}
              >
                {t('buttons.savePage')}
              </Button>
            )}
            <PopoverButton
              label={t('pageActions')}
              icon="lucide:ellipsis"
              iconOnly
              width={240}
            >
              <Stack gap="xs">
                <Button
                  namespace={false}
                  variant="plain"
                  justify="start"
                  icon="lucide:copy-plus"
                  onClick={() => setTemplateEditor(!templateEditor)}
                >
                  {t('saveTemplate')}
                </Button>
                <Button
                  namespace={false}
                  variant="plain"
                  justify="start"
                  icon="lucide:eye"
                  onClick={() => setPreview(!preview)}
                >
                  {t(preview ? 'buttons.editContent' : 'buttons.preview')}
                </Button>
                {record && (
                  <Button
                    namespace={false}
                    variant="plain"
                    justify="start"
                    icon="lucide:refresh-cw"
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
                    namespace={false}
                    dangerous
                    variant="plain"
                    justify="start"
                    icon="lucide:trash-2"
                    disabled={busy || readOnly}
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
        <AppearanceContext value={{ appearance, readOnly: true }}>
          <AppearanceCover />
        </AppearanceContext>
        <Flex gap="sm" align="center" className="database-page-decoration">
          <Button
            namespace={false}
            variant="plain"
            icon={appearance.icon ?? 'lucide:smile'}
            disabled={readOnly}
            onClick={() =>
              openModal(IconPickerModal, {
                setSelectedIcon: icon =>
                  setAppearance(current => ({ ...current, icon }))
              })
            }
          >
            {t('pageIcon')}
          </Button>
          <Button
            namespace={false}
            variant="plain"
            icon="lucide:image"
            disabled={readOnly}
            onClick={() =>
              pickCover(appearance.cover, cover =>
                setAppearance(current => ({ ...current, cover }))
              )
            }
          >
            {t('pageCover')}
          </Button>
        </Flex>
        {description && (
          <textarea
            className="database-page-description"
            aria-label={t('pageDescription')}
            value={description}
            onChange={event => setDescription(event.target.value)}
            disabled={readOnly}
          />
        )}
        {templateEditor && (
          <Flex gap="sm">
            <input
              aria-label={t('templateName')}
              value={templateName}
              placeholder={t('templateName')}
              onChange={event => setTemplateName(event.target.value)}
            />
            <Button
              namespace={false}
              disabled={busy || !templateName.trim()}
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
            source={record ? { kind: 'record', id: record.id } : undefined}
            readOnly={readOnly || preview}
            afterTitle={pageProperties}
          >
            <Box
              as="input"
              className="database-page-title"
              aria-label={t('inputs.recordTitle')}
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
              onOpenPage={openPage}
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
              onValidityChange={setContentValid}
            />
          </CanonicalSource>
        </div>
        {record && <PageConnections pageKey={`record:${record.id}`} />}
        {fieldAnchor && (
          <FloatingPopover
            anchor={fieldAnchor}
            width={300}
            label={t(editingField ? 'editField' : 'addField')}
            className="database-floating-panel"
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
