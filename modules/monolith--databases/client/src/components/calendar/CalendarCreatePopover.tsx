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
      anchor={initial.anchor}
      label={t('eventCreation.title')}
      className="monolith-calendar-create"
      width={420}
      align="end"
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
        <Flex align="center" justify="between" gap="sm">
          <Flex align="center" gap="sm">
            <Icon icon="lucide:calendar" size="16px" />
            <Text size="sm" weight="medium">
              {t('eventCreation.title')}
            </Text>
          </Flex>
          <Button
            aria-label={t('cancel')}
            icon="lucide:x"
            namespace={false}
            variant="plain"
            p="xs"
            disabled={pending}
            onClick={close}
          />
        </Flex>
        <Box
          as="input"
          data-autofocus
          required
          maxLength={500}
          aria-label={t('title')}
          placeholder={t('eventCreation.placeholder')}
          className="monolith-calendar-create-title"
          value={title}
          disabled={disabled}
          onChange={event => setTitle(event.target.value)}
        />
        <Stack gap="xs">
          <Text color="muted" size="xs">
            {t('saveInDatabase')}
          </Text>
          <ChoiceSelect
            label={t('saveInDatabase')}
            value={database}
            disabled={disabled}
            onChange={setDatabase}
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
              type="datetime-local"
              aria-label={t('date')}
              value={start}
              disabled={disabled}
              onChange={event => changeStart(event.target.value)}
            />
          </Box>
          <Box as="label" className="monolith-calendar-create-time">
            <Text color="muted" size="sm">
              {t('endDate')}
            </Text>
            <input
              required
              type="datetime-local"
              aria-label={t('endDate')}
              value={end}
              min={start}
              disabled={disabled}
              onChange={event => setEnd(event.target.value)}
            />
          </Box>
          <Flex align="center" gap="xs">
            <Icon icon="lucide:globe" size="12px" color="muted" />
            <Text color="muted" size="xs">
              {zone}
            </Text>
          </Flex>
        </Stack>
        <Flex align="center" justify="between" gap="md">
          <Text color="muted" size="sm">
            {t('priorityLabel')}
          </Text>
          <Box width="150px">
            <ChoiceSelect
              label={t('priorityLabel')}
              value={priority}
              disabled={disabled}
              onChange={value => setPriority(value as typeof priority)}
              options={(['low', 'normal', 'high', 'urgent'] as const).map(
                value => ({
                  value,
                  label: t(`priority.${value}`),
                  icon: 'lucide:flag'
                })
              )}
            />
          </Box>
        </Flex>
        {error && (
          <Text size="sm" color="dangerous" role="alert">
            {error}
          </Text>
        )}
        <DraftNotice blocker={blocker} />
        {discarding && (
          <DraftConfirmation
            onKeepEditing={() => setDiscarding(false)}
            onDiscard={() => {
              allowNavigation()
              onClose()
            }}
          />
        )}
        <Flex
          className="monolith-calendar-create-footer"
          align="center"
          justify="between"
          gap="sm"
          pt="md"
        >
          <Button
            namespace={false}
            variant="plain"
            icon="lucide:maximize-2"
            disabled={disabled || !title.trim()}
            onClick={() => void save(true)}
          >
            {t('eventCreation.openPage')}
          </Button>
          <Button
            namespace={false}
            icon="lucide:plus"
            type="submit"
            loading={pending}
            disabled={disabled || !title.trim()}
          >
            {t('create')}
          </Button>
        </Flex>
      </Stack>
    </FloatingPopover>
  )
}
