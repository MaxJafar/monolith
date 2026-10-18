import dayjs from 'dayjs'
import { useState } from 'react'
import { Link } from 'react-router'

import { useModuleTranslation } from '@monolith/localization'
import { Button, Flex, FloatingPopover, Icon, Stack, Text } from '@monolith/ui'

import { useDatabases } from '@/DatabaseProvider'
import { valueColor } from '@/utils/recordColors'

import { computedKinds } from '../../../computed'
import type { CellValue, Field, RecordPage } from '../../../shared'
import { FieldValue } from './FieldValue'
import { PropertyEditor } from './PropertyEditor'
import { RelationEditor } from './RelationEditor'

const noRelationDraft = () => {}
/** The same value surface in a database cell and in a page property row. */
export function PropertyCell({
  field,
  value,
  record,
  disabled,
  linkRelations = true,
  onChange,
  onRelationDirty
}: {
  field: Field
  value: CellValue | undefined
  record?: RecordPage
  disabled?: boolean
  linkRelations?: boolean
  onChange: (value: CellValue) => void
  onRelationDirty?: (id: string, dirty: boolean) => void
}) {
  const { t } = useModuleTranslation()
  const {
    api,
    run,
    busy,
    index,
    recordHref,
    openRecord,
    embedded,
    data,
    workspaceId
  } = useDatabases()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [colorOption, setColorOption] = useState<string>()
  const choices = ['select', 'multi-select', 'status'].includes(field.kind)
  const many = field.kind === 'multi-select'
  const selected = Array.isArray(value)
    ? value
    : typeof value === 'string' && value
      ? [value]
      : []
  const options = [...new Set([...field.config.options, ...selected])]
  const relation = field.kind === 'relation' && field.id !== 'project_id'
  const timed =
    field.kind === 'date' &&
    (field.id === 'end_date' ||
      (field.id === 'date' &&
        (record?.item_type === 'event' ||
          (typeof value === 'string' && value.includes('T')))))
  const project = field.id === 'project_id'
  const links =
    relation && record
      ? (index.linksByField.get(field.id)?.get(record.id) ?? [])
      : []
  const empty = relation
    ? !links.length
    : value == null || value === '' || (Array.isArray(value) && !value.length)
  const computed = computedKinds.has(field.kind)

  function choose(option: string) {
    onChange(
      many
        ? selected.includes(option)
          ? selected.filter(item => item !== option)
          : [...selected, option]
        : option
    )
    setQuery('')
    if (!many) setAnchor(null)
  }
  async function createOption() {
    const option = query.trim()
    if (!option || busy) return
    // Built-in tags are stored on the canonical item; custom tags own their schema.
    if (field.id !== 'tags') {
      const result = await run(() =>
        api.updateField.input({ id: field.id }).mutate({
          name: field.name,
          options: [...new Set([...field.config.options, option])],
          option_colors: field.config.option_colors
        })
      )
      if (!result) return
    }
    choose(option)
  }
  function commitText() {
    if (
      field.kind === 'number' &&
      draft !== '' &&
      !Number.isFinite(Number(draft))
    )
      return
    const next =
      field.kind === 'number'
        ? draft === ''
          ? null
          : Number(draft)
        : draft || null
    if (next !== (value ?? null)) onChange(next)
    setAnchor(null)
  }
  if (computed) return <FieldValue field={field} value={value} />
  return (
    <>
      {relation && links.length > 0 && linkRelations ? (
        <Flex
          gap="xs"
          align="center"
          wrap="wrap"
          className="database-property-cell"
        >
          {links.map(link => {
            const target = index.recordsById.get(link.target_record_id)
            return (
              target && (
                <Button
                  key={link.id}
                  as={Link}
                  namespace={false}
                  variant="plain"
                  className="database-relation-value"
                  to={recordHref(target)}
                  onClick={event => {
                    if (
                      embedded &&
                      !event.metaKey &&
                      !event.ctrlKey &&
                      !event.shiftKey &&
                      !event.altKey
                    ) {
                      event.preventDefault()
                      openRecord(target)
                    }
                  }}
                >
                  {target.title}
                </Button>
              )
            )
          })}
          {!disabled && (
            <Button
              namespace={false}
              variant="plain"
              icon="lucide:plus"
              aria-label={field.name}
              onClick={event => setAnchor(event.currentTarget)}
            />
          )}
        </Flex>
      ) : (
        <button
          type="button"
          className="database-property-cell"
          aria-label={field.name}
          aria-haspopup={
            !computed && field.kind !== 'checkbox' ? 'dialog' : undefined
          }
          aria-expanded={anchor ? true : undefined}
          role={field.kind === 'checkbox' ? 'checkbox' : undefined}
          aria-checked={field.kind === 'checkbox' ? value === true : undefined}
          disabled={disabled}
          onClick={event => {
            if (field.kind === 'checkbox') {
              onChange(value !== true)
              return
            }
            setQuery('')
            setDraft(
              value == null
                ? ''
                : timed
                  ? dayjs(String(value)).format('YYYY-MM-DDTHH:mm')
                  : String(value)
            )
            setAnchor(event.currentTarget)
          }}
        >
          {field.kind === 'checkbox' ? (
            <Icon
              icon={value === true ? 'lucide:square-check' : 'lucide:square'}
              size="16px"
              color="muted"
            />
          ) : empty ? (
            <span className="database-empty-value">{t('emptyValue')}</span>
          ) : relation ? (
            <Flex gap="xs" wrap="wrap">
              {links.map(link => (
                <span key={link.id} className="database-relation-value">
                  {index.recordsById.get(link.target_record_id)?.title}
                </span>
              ))}
            </Flex>
          ) : project ? (
            <span>
              {index.recordsById.get(String(value))?.title ?? t('emptyValue')}
            </span>
          ) : timed && typeof value === 'string' ? (
            <span>{dayjs(value).format('D MMM YYYY, HH:mm')}</span>
          ) : ['url', 'files', 'button'].includes(field.kind) ? (
            <span>
              {Array.isArray(value) ? value.join(', ') : String(value)}
            </span>
          ) : (
            <FieldValue field={field} value={value} />
          )}
        </button>
      )}
      {field.kind === 'date' &&
        record &&
        typeof value === 'string' &&
        value &&
        dayjs(value).isValid() && (
          <Button
            as={Link}
            namespace={false}
            variant="plain"
            icon="lucide:calendar-days"
            aria-label={t('scheduling.openCalendar')}
            title={t('scheduling.openCalendar')}
            to={`/calendar?${new URLSearchParams({ workspace: workspaceId ?? '', calendarDate: dayjs(value).format('YYYY-MM-DD'), calendarLayout: 'agenda', calendarField: field.id === 'end_date' ? 'date' : field.id })}`}
          />
        )}
      {anchor && (
        <FloatingPopover
          anchor={anchor}
          label={field.name}
          width={320}
          className="database-value-popover"
          onClose={() => {
            if (
              [
                'text',
                'number',
                'url',
                'email',
                'phone',
                'place',
                'date'
              ].includes(field.kind)
            )
              commitText()
            else setAnchor(null)
          }}
        >
          {choices ? (
            <Stack gap="xs">
              <Flex wrap="wrap" gap="xs" className="database-option-search">
                {many &&
                  selected.map(option => (
                    <button
                      type="button"
                      className="database-option-token"
                      key={option}
                      style={{
                        background: `color-mix(in srgb, ${valueColor(option, field.config.option_colors)} 38%, var(--bg-surface))`
                      }}
                      aria-label={t('removeOption', { name: option })}
                      onClick={() => choose(option)}
                    >
                      {option}
                      <Icon icon="lucide:x" size="12px" />
                    </button>
                  ))}
                <input
                  aria-label={t('searchOptions')}
                  placeholder={t('searchOptions')}
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      const match = options.find(
                        option =>
                          option.toLowerCase() === query.trim().toLowerCase()
                      )
                      if (match) choose(match)
                      else void createOption()
                    }
                  }}
                />
              </Flex>
              <Text size="xs" color="muted" px="sm" py="xs">
                {t('selectOrCreateOption')}
              </Text>
              {options
                .filter(option =>
                  option.toLowerCase().includes(query.toLowerCase())
                )
                .map(option => (
                  <Flex
                    key={option}
                    className="database-option-row"
                    align="center"
                    gap="xs"
                  >
                    <button
                      type="button"
                      aria-pressed={selected.includes(option)}
                      onClick={() => choose(option)}
                    >
                      <FieldValue
                        field={field}
                        value={many ? [option] : option}
                      />
                      {selected.includes(option) && (
                        <Icon icon="lucide:check" size="14px" />
                      )}
                    </button>
                    {field.id !== 'tags' && (
                      <Button
                        namespace={false}
                        variant="plain"
                        icon="lucide:ellipsis"
                        aria-label={t('optionColor', { name: option })}
                        onClick={() =>
                          setColorOption(
                            colorOption === option ? undefined : option
                          )
                        }
                      />
                    )}
                    {colorOption === option && (
                      <label className="database-option-color">
                        {t('optionColor', { name: option })}
                        <input
                          type="color"
                          aria-label={t('optionColor', { name: option })}
                          value={valueColor(option, field.config.option_colors)}
                          onChange={event =>
                            void run(() =>
                              api.updateField.input({ id: field.id }).mutate({
                                name: field.name,
                                options: field.config.options,
                                option_colors: {
                                  ...field.config.option_colors,
                                  [option]: event.target.value
                                }
                              })
                            )
                          }
                        />
                      </label>
                    )}
                  </Flex>
                ))}
              {!!query.trim() &&
                !options.some(
                  option => option.toLowerCase() === query.trim().toLowerCase()
                ) && (
                  <Button
                    namespace={false}
                    variant="plain"
                    justify="start"
                    disabled={busy}
                    icon="lucide:plus"
                    onClick={() => void createOption()}
                  >
                    {t('createOption', { name: query.trim() })}
                  </Button>
                )}
            </Stack>
          ) : project ? (
            <Stack gap="xs">
              {data.records
                .filter(item => item.item_type === 'project')
                .map(item => (
                  <Button
                    key={item.id}
                    namespace={false}
                    variant="plain"
                    justify="start"
                    onClick={() => {
                      onChange(item.id)
                      setAnchor(null)
                    }}
                  >
                    {item.title}
                  </Button>
                ))}
            </Stack>
          ) : relation && record ? (
            <RelationEditor
              field={field}
              record={record}
              onDirtyChange={onRelationDirty ?? noRelationDraft}
            />
          ) : [
              'text',
              'number',
              'url',
              'email',
              'phone',
              'place',
              'date'
            ].includes(field.kind) ? (
            <Stack gap="xs">
              <input
                className="database-value-input"
                aria-label={field.name}
                type={
                  field.kind === 'number'
                    ? 'number'
                    : field.kind === 'date'
                      ? timed
                        ? 'datetime-local'
                        : 'date'
                      : 'text'
                }
                value={draft}
                onChange={event => setDraft(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    commitText()
                  }
                }}
              />
              <Button
                namespace={false}
                variant="plain"
                justify="start"
                onClick={commitText}
              >
                {t('buttons.save')}
              </Button>
            </Stack>
          ) : (
            <PropertyEditor
              field={field}
              value={value}
              onChange={onChange}
              disabled={disabled}
            />
          )}
          {!choices && !relation && (
            <Button
              namespace={false}
              variant="plain"
              justify="start"
              onClick={() => {
                onChange(null)
                setAnchor(null)
              }}
            >
              {t('buttons.clear')}
            </Button>
          )}
        </FloatingPopover>
      )}
    </>
  )
}
