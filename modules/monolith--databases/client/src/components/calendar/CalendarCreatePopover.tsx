import dayjs from 'dayjs'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Box,
  Button,
  ChoiceSelect,
  Flex,
  FloatingPopover,
  Icon,
  Stack,
  Text
} from '@monolith/ui'

import { useDatabases } from '@/DatabaseProvider'
import { DraftConfirmation, DraftNotice, useDraftGuard } from '@/useDraftGuard'

import './calendar.css'

export type CalendarCreation = {
  anchor: HTMLElement
  start: string
  end: string
  database: string
}

/** Own the draft in the contextual editor, keeping the calendar in place. */
export function CalendarCreatePopover({
  initial,
  onClose
}: {
  initial: CalendarCreation
  onClose: () => void
}) {
  const { t } = useTranslation('common.systemViews')
  const { data, api, run, readOnly, busy, openRecord } = useDatabases()
  const [title, setTitle] = useState('')
  const [database, setDatabase] = useState(initial.database)
  const [start, setStart] = useState(initial.start)
  const [end, setEnd] = useState(initial.end)

  const [priority, setPriority] = useState<
    'low' | 'normal' | 'high' | 'urgent'
  >('normal')

  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [discarding, setDiscarding] = useState(false)
  const [saved, setSaved] = useState(false)

  const dirty =
    !saved &&
    (!!title ||
      database !== initial.database ||
      start !== initial.start ||
      end !== initial.end ||
      priority !== 'normal')

  const { blocker, allowNavigation } = useDraftGuard(dirty || pending)

  const disabled = readOnly || busy || pending
  const zone = Intl.DateTimeFormat()
    .resolvedOptions()
    .timeZone.replace(/_/g, ' ')

  function close() {
    if (pending) return
    if (dirty) setDiscarding(true)
    else onClose()
  }

  function changeStart(value: string) {
    const minutes = dayjs(end).diff(dayjs(start), 'minute')
    const duration = Number.isFinite(minutes) ? Math.max(15, minutes) : 60
    setStart(value)
    if (dayjs(value).isValid())
      setEnd(dayjs(value).add(duration, 'minute').format('YYYY-MM-DDTHH:mm'))
  }

  async function save(openPage = false) {
    if (disabled || !title.trim()) return

    if (
      !dayjs(start).isValid() ||
      !dayjs(end).isValid() ||
      !dayjs(end).isAfter(dayjs(start))
    ) {
      setError(t('eventCreation.invalidRange'))

      return
    }
    setPending(true)
    setError('')
    const result = await run(async () => {
      const base = database
        ? { id: database }
        : await api.createBase.mutate({
            name: t('titles.calendar'),
            table_type: 'event',
            description: ''
          })
      // Keep the newly created database selected if record creation needs retrying.
      setDatabase(base.id)

      return api.createRecord.mutate({
        base_id: base.id,
        title: title.trim(),
        item_type: 'event',
        priority,
        content: '',
        values: {},
        date: dayjs(start).toISOString(),
        end_date: dayjs(end).toISOString()
      })
    })
    setPending(false)

    if (!result) {
      setError(t('eventCreation.saveFailed'))

      return
    }
    setSaved(true)
    allowNavigation()
    onClose()
    if (openPage) openRecord(result)
  }

  return (
    <FloatingPopover
      align="end"
      anchor={initial.anchor}
      className="monolith-calendar-create"
      label={t('eventCreation.title')}
      width={420}
      onClose={close}
    >
      <Stack
        as="form"
        gap="md"
        p="sm"
        onSubmit={event => {
          event.preventDefault()
          void save()
        }}
      >
        <Flex align="center" gap="sm" justify="between">
          <Flex align="center" gap="sm">
            <Icon icon="lucide:calendar" size="16px" />
            <Text size="sm" weight="medium">
              {t('eventCreation.title')}
            </Text>
          </Flex>
          <Button
            aria-label={t('cancel')}
            disabled={pending}
            icon="lucide:x"
            namespace={false}
            p="xs"
            variant="plain"
            onClick={close}
          />
        </Flex>
        <Box
          data-autofocus
          required
          aria-label={t('title')}
          as="input"
          className="monolith-calendar-create-title"
          disabled={disabled}
          maxLength={500}
          placeholder={t('eventCreation.placeholder')}
          value={title}
          onChange={event => setTitle(event.target.value)}
        />
        <Stack gap="xs">
          <Text color="muted" size="xs">
            {t('saveInDatabase')}
          </Text>
          <ChoiceSelect
            disabled={disabled}
            label={t('saveInDatabase')}
            options={[
              {
                value: '',
                label: t('createDatabaseFor', { name: t('titles.calendar') }),
                icon: 'lucide:plus'
              },
              ...data.bases.map(base => ({
                value: base.id,
                label: base.name,
                icon: 'lucide:database'
              }))
            ]}
            value={database}
            onChange={setDatabase}
          />
        </Stack>
        <Stack
          className="monolith-calendar-create-times"
          gap="sm"
          p="md"
          r="md"
        >
          <Box as="label" className="monolith-calendar-create-time">
            <Text color="muted" size="sm">
              {t('date')}
            </Text>
            <input
              required
              aria-label={t('date')}
              disabled={disabled}
              type="datetime-local"
              value={start}
              onChange={event => changeStart(event.target.value)}
            />
          </Box>
          <Box as="label" className="monolith-calendar-create-time">
            <Text color="muted" size="sm">
              {t('endDate')}
            </Text>
            <input
              required
              aria-label={t('endDate')}
              disabled={disabled}
              min={start}
              type="datetime-local"
              value={end}
              onChange={event => setEnd(event.target.value)}
            />
          </Box>
          <Flex align="center" gap="xs">
            <Icon color="muted" icon="lucide:globe" size="12px" />
            <Text color="muted" size="xs">
              {zone}
            </Text>
          </Flex>
        </Stack>
        <Flex align="center" gap="md" justify="between">
          <Text color="muted" size="sm">
            {t('priorityLabel')}
          </Text>
          <Box width="150px">
            <ChoiceSelect
              disabled={disabled}
              label={t('priorityLabel')}
              options={(['low', 'normal', 'high', 'urgent'] as const).map(
                value => ({
                  value,
                  label: t(`priority.${value}`),
                  icon: 'lucide:flag'
                })
              )}
              value={priority}
              onChange={value => setPriority(value as typeof priority)}
            />
          </Box>
        </Flex>
        {error && (
          <Text color="dangerous" role="alert" size="sm">
            {error}
          </Text>
        )}
        <DraftNotice blocker={blocker} />
        {discarding && (
          <DraftConfirmation
            onDiscard={() => {
              allowNavigation()
              onClose()
            }}
            onKeepEditing={() => setDiscarding(false)}
          />
        )}
        <Flex
          align="center"
          className="monolith-calendar-create-footer"
          gap="sm"
          justify="between"
          pt="md"
        >
          <Button
            disabled={disabled || !title.trim()}
            icon="lucide:maximize-2"
            namespace={false}
            variant="plain"
            onClick={() => void save(true)}
          >
            {t('eventCreation.openPage')}
          </Button>
          <Button
            disabled={disabled || !title.trim()}
            icon="lucide:plus"
            loading={pending}
            namespace={false}
            type="submit"
          >
            {t('create')}
          </Button>
        </Flex>
      </Stack>
    </FloatingPopover>
  )
}
