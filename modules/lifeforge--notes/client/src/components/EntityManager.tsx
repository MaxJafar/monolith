import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useBeforeUnload, useBlocker } from 'react-router'

import { useModuleTranslation } from '@lifeforge/localization'
import { Box, Button, Card, Flex, Stack, Text, TextInput } from '@lifeforge/ui'

import FieldControl from './FieldControl'

export type FieldValue = string | number | boolean | string[] | null

export type Draft = Record<string, FieldValue>

export type Item = { id: string } & Record<string, unknown>

export type Field = {
  name: string
  kind: 'text' | 'area' | 'number' | 'boolean' | 'select' | 'multi'
  required?: boolean
  default?: string
  options?: { value: string; label: string }[]
}

function initialDraft(fields: Field[], item?: Item): Draft {
  return Object.fromEntries(
    fields.map(field => {
      const value = item?.[field.name]

      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        value === null ||
        (Array.isArray(value) && value.every(v => typeof v === 'string'))
      )
        return [field.name, value]

      return [
        field.name,
        field.kind === 'number'
          ? 0
          : field.kind === 'boolean'
            ? false
            : field.kind === 'multi'
              ? []
              : field.default ||
                (field.kind === 'select'
                  ? field.required
                    ? field.options?.[0]?.value || ''
                    : null
                  : '')
      ]
    })
  )
}

export default function EntityManager({
  entity,
  fields,
  items,
  loading,
  error,
  retry,
  onSave,
  onRemove,
  extra,
  renderField,
  renderValue,
  autoEditId,
  saveDisabled = false
}: {
  entity: string
  fields: Field[]
  items: Item[]
  loading: boolean
  error: Error | null
  retry: () => void
  onSave: (
    id: string | undefined,
    draft: Draft,
    original?: Item
  ) => Promise<void>
  onRemove: (id: string) => Promise<void>
  extra?: (item: Item) => ReactNode
  renderField?: (
    field: Field,
    draft: Draft,
    onChange: (value: FieldValue) => void
  ) => ReactNode
  renderValue?: (field: Field, item: Item) => ReactNode
  autoEditId?: string
  saveDisabled?: boolean
}) {
  const { t } = useModuleTranslation()
  const [editing, setEditing] = useState<string | null | undefined>(undefined)
  const [original, setOriginal] = useState<Item | undefined>()
  const autoOpened = useRef<string | null>(null)
  const [draft, setDraft] = useState<Draft>({})
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const dirty =
    editing !== undefined &&
    (saveDisabled ||
      JSON.stringify(draft) !== JSON.stringify(initialDraft(fields, original)))
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty &&
      currentLocation.pathname + currentLocation.search !==
        nextLocation.pathname + nextLocation.search
  )
  useBeforeUnload(event => {
    if (dirty) {
      event.preventDefault()
      event.returnValue = ''
    }
  })

  function discardDraft() {
    return !dirty || window.confirm(t('discardConfirm'))
  }

  useEffect(() => {
    if (!autoEditId || autoOpened.current === autoEditId) return

    const item = items.find(item => item.id === autoEditId)

    if (item) {
      autoOpened.current = autoEditId
      setOriginal(item)
      setDraft(initialDraft(fields, item))
      setEditing(item.id)
    }
  }, [autoEditId, items, fields])

  const visible = items.filter(item =>
    JSON.stringify(item)
      .toLocaleLowerCase()
      .includes(search.toLocaleLowerCase())
  )

  async function save() {
    if (saveDisabled) return
    setBusy(true)
    setFormError('')

    try {
      await onSave(editing || undefined, draft, original)
      setEditing(undefined)
    } catch (failure) {
      setFormError(failure instanceof Error ? failure.message : t('saveFailed'))
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    setBusy(true)
    setFormError('')

    try {
      await onRemove(id)
      setPendingDelete(null)
    } catch (failure) {
      setFormError(failure instanceof Error ? failure.message : t('saveFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack gap="lg" minWidth="0">
      {blocker.state === 'blocked' && (
        <Card role="alert">
          <Flex align="center" gap="md" wrap="wrap">
            <Text>{t('unsaved')}</Text>
            <Button
              namespace={false}
              variant="secondary"
              onClick={() => blocker.reset()}
            >
              {t('keepEditing')}
            </Button>
            <Button
              dangerous
              namespace={false}
              onClick={() => blocker.proceed()}
            >
              {t('discard')}
            </Button>
          </Flex>
        </Card>
      )}
      <Flex align="center" gap="md" justify="between" wrap="wrap">
        <Text as="h2" size="xl" weight="semibold">
          {t('entities.' + entity)} · {items.length}
        </Text>
        <Button
          disabled={busy}
          icon="tabler:plus"
          namespace={false}
          onClick={() => {
            if (!discardDraft()) return
            setOriginal(undefined)
            setDraft(initialDraft(fields))
            setFormError('')
            setEditing(null)
          }}
        >
          {t('create')}
        </Button>
      </Flex>
      <TextInput
        icon="tabler:search"
        label="inputs.search"
        placeholder={t('inputs.search')}
        value={search}
        onChange={setSearch}
      />
      {loading && (
        <Text color="muted" role="status">
          {t('loading')}
        </Text>
      )}
      {error && (
        <Card>
          <Stack gap="md">
            <Text role="alert">{error.message}</Text>
            <Button icon="tabler:refresh" namespace={false} onClick={retry}>
              {t('retry')}
            </Button>
          </Stack>
        </Card>
      )}
      {formError && (
        <Text color="dangerous" role="alert">
          {formError}
        </Text>
      )}
      {editing !== undefined && (
        <Card>
          <Stack
            as="form"
            gap="md"
            onSubmit={event => {
              event.preventDefault()
              void save()
            }}
          >
            <Text as="h3" size="lg" weight="semibold">
              {t(editing ? 'edit' : 'create')}
            </Text>
            {fields.map(
              field =>
                renderField?.(field, draft, value =>
                  setDraft(previous => ({ ...previous, [field.name]: value }))
                ) ?? (
                  <FieldControl
                    key={field.name}
                    field={field}
                    value={draft[field.name] ?? null}
                    onChange={value =>
                      setDraft(previous => ({
                        ...previous,
                        [field.name]: value
                      }))
                    }
                  />
                )
            )}
            <Flex gap="sm" wrap="wrap">
              <Button
                disabled={saveDisabled}
                icon="tabler:check"
                loading={busy}
                namespace={false}
                type="submit"
              >
                {t('save')}
              </Button>
              <Button
                disabled={busy}
                namespace={false}
                variant="secondary"
                onClick={() => {
                  if (discardDraft()) setEditing(undefined)
                }}
              >
                {t('cancel')}
              </Button>
            </Flex>
          </Stack>
        </Card>
      )}
      {!loading && !error && visible.length === 0 && (
        <Card>
          <Text color="muted">{t(items.length ? 'noResults' : 'empty')}</Text>
        </Card>
      )}
      {visible.map(item => (
        <Card key={item.id}>
          <Stack gap="md">
            <Text as="h3" size="lg" weight="semibold">
              {String(item.name || item.title || item.question || item.id)}
            </Text>
            {fields
              .filter(
                field =>
                  !['name', 'title', 'question', 'icon', 'color'].includes(
                    field.name
                  )
              )
              .map(field => {
                const custom = renderValue?.(field, item)

                if (custom) return <Box key={field.name}>{custom}</Box>

                const value = item[field.name]
                const formatted = field.options
                  ? Array.isArray(value)
                    ? value
                        .map(
                          id =>
                            field.options?.find(option => option.value === id)
                              ?.label
                        )
                        .filter(Boolean)
                        .join(', ')
                    : field.options.find(option => option.value === value)
                        ?.label
                  : typeof value === 'boolean'
                    ? t(value ? 'yes' : 'no')
                    : typeof value === 'string' || typeof value === 'number'
                      ? String(value)
                      : ''

                return formatted ? (
                  <Box key={field.name}>
                    <Text color="muted">{t('inputs.' + field.name)}</Text>
                    <Text as="p" overflowWrap="anywhere" whiteSpace="pre-wrap">
                      {formatted}
                    </Text>
                  </Box>
                ) : null
              })}
            {extra?.(item)}
            <Flex gap="sm" wrap="wrap">
              <Button
                disabled={busy}
                icon="tabler:pencil"
                namespace={false}
                variant="secondary"
                onClick={() => {
                  if (!discardDraft()) return
                  setOriginal(item)
                  setDraft(initialDraft(fields, item))
                  setEditing(item.id)
                  setFormError('')
                }}
              >
                {t('edit')}
              </Button>
              {pendingDelete === item.id ? (
                <>
                  <Text>{t('confirmDelete')}</Text>
                  <Button
                    dangerous
                    icon="tabler:trash"
                    loading={busy}
                    namespace={false}
                    onClick={() => remove(item.id)}
                  >
                    {t('delete')}
                  </Button>
                  <Button
                    namespace={false}
                    variant="secondary"
                    onClick={() => setPendingDelete(null)}
                  >
                    {t('cancel')}
                  </Button>
                </>
              ) : (
                <Button
                  dangerous
                  disabled={busy}
                  icon="tabler:trash"
                  namespace={false}
                  variant="tertiary"
                  onClick={() => setPendingDelete(item.id)}
                >
                  {t('delete')}
                </Button>
              )}
            </Flex>
          </Stack>
        </Card>
      ))}
    </Stack>
  )
}
