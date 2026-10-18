import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useId, useState } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import {
  Box,
  Button,
  ChoiceSelect,
  Flex,
  Grid,
  Stack,
  Text
} from '@monolith/ui'

import { useDatabases } from '@/DatabaseProvider'
import { workspaceAPI } from '@/manifest'

import {
  type Schedule,
  type ScheduleRow,
  calendarBinding,
  scheduleSchema
} from '../../../../calendarShared'
import type { RecordPage } from '../../../../shared'
import './calendar.css'
import { useCalendarSchedules } from './useCalendarSchedules'

export function CalendarScheduleEditor({
  record,
  onDirtyChange
}: {
  record: RecordPage
  onDirtyChange: (dirty: boolean) => void
}) {
  const query = useCalendarSchedules(),
    { t } = useModuleTranslation()

  if (query.isLoading)
    return <Text role="status">{t('scheduling.loading')}</Text>
  if (query.error && !query.data)
    return (
      <Stack>
        <Text role="alert">{query.error.message}</Text>
        <Button onClick={() => void query.refetch()}>
          {t('scheduling.retry')}
        </Button>
      </Stack>
    )

  const row = query.data?.schedules.find(row => row.record_id === record.id)

  return (
    <ScheduleForm
      key={record.id}
      actor={query.actor}
      emailReady={query.data?.email_ready ?? false}
      record={record}
      row={row}
      onDirtyChange={onDirtyChange}
    />
  )
}

function ScheduleForm({
  record,
  row,
  emailReady,
  actor,
  onDirtyChange
}: {
  record: RecordPage
  row?: ScheduleRow
  emailReady: boolean
  actor?: string
  onDirtyChange: (dirty: boolean) => void
}) {
  const { t, i18n } = useModuleTranslation()
  const { data, people, readOnly, run, busy, workspaceId } = useDatabases()
  const cache = useQueryClient()

  const binding = calendarBinding(record, data.fields)
  const [settings, setSettings] = useState<Schedule>(
    () =>
      row?.settings ??
      scheduleSchema.parse({
        time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        start_field: binding.start,
        end_field: binding.end,
        all_day: record.item_type !== 'event' || binding.start !== 'date'
      })
  )

  const [revision, setRevision] = useState(row?.revision ?? 0)
  const [dirty, setDirty] = useState(false)
  const zoneListId = useId()

  useEffect(() => {
    if (!dirty && row && row.revision !== revision) {
      setSettings(row.settings)
      setRevision(row.revision)
    }
  }, [row, dirty, revision])
  const [error, setError] = useState(''),
    [saved, setSaved] = useState(false),
    [responding, setResponding] = useState(false)

  const [responseDirty, setResponseDirty] = useState(false)

  const [email, setEmail] = useState(
    row?.responses[actor ?? '']?.email ?? false
  )
  useEffect(() => {
    if (!responseDirty) setEmail(row?.responses[actor ?? '']?.email ?? false)
  }, [row, actor, responseDirty])
  useEffect(() => {
    onDirtyChange(dirty || responseDirty)
  }, [dirty, responseDirty, onDirtyChange])

  useEffect(() => () => onDirtyChange(false), [onDirtyChange])

  const disabled = busy || readOnly

  function change(patch: Partial<Schedule>) {
    setSettings(current => ({ ...current, ...patch }))
    setSaved(false)
    setDirty(true)
  }

  async function save() {
    const parsed = scheduleSchema.safeParse(settings)

    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message ?? t('scheduling.invalidSettings')
      )

      return
    }
    if (!workspaceId) return
    setError('')
    const result = await run(() =>
      workspaceAPI.calendar.save
        .input({ workspace_id: workspaceId, record_id: record.id })
        .mutate({ expected_revision: revision, settings: parsed.data })
    )

    if (result) {
      setSettings(result.settings)
      setRevision(result.revision)
      setDirty(false)
      setSaved(true)
    }
  }

  async function respond(status: 'accepted' | 'tentative' | 'declined') {
    if (!workspaceId || responding) return
    setResponding(true)
    setError('')

    try {
      await workspaceAPI.calendar.respond
        .input({ workspace_id: workspaceId, record_id: record.id })
        .mutate({ status, email })
      await cache.invalidateQueries({ queryKey: workspaceAPI.calendar.key })
      setResponseDirty(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setResponding(false)
    }
  }

  const rule = settings.recurrence
  const dates = data.fields.filter(
    field => field.base_id === record.base_id && field.kind === 'date'
  )

  return (
    <Stack gap="md" py="md">
      <Text as="h3" size="lg" weight="semibold">
        {t('scheduling.scheduleAndGuests')}
      </Text>
      <Text color="muted" size="sm">
        {t('scheduling.workspaceSharing')}
      </Text>
      <Grid gap="sm" templateCols={{ base: 1, md: 2 }}>
        <Stack gap="xs">
          <Text size="sm">{t('scheduling.startProperty')}</Text>
          <ChoiceSelect
            disabled={disabled}
            label={t('scheduling.startProperty')}
            options={[
              { value: 'date', label: t('itemDate') },
              ...dates.map(field => ({ value: field.id, label: field.name }))
            ]}
            value={settings.start_field}
            onChange={value => change({ start_field: value })}
          />
        </Stack>
        <Stack gap="xs">
          <Text size="sm">{t('scheduling.endProperty')}</Text>
          <ChoiceSelect
            disabled={disabled}
            label={t('scheduling.endProperty')}
            options={[
              { value: '', label: t('scheduling.noEnd') },
              { value: 'end_date', label: t('itemEndDate') },
              ...dates
                .filter(field => field.id !== settings.start_field)
                .map(field => ({ value: field.id, label: field.name }))
            ]}
            value={settings.end_field ?? ''}
            onChange={value => change({ end_field: value || null })}
          />
        </Stack>
        <Box as="label" className="monolith-calendar-field">
          <Text size="sm">{t('scheduling.timeZone')}</Text>
          <input
            disabled={disabled}
            list={zoneListId}
            value={settings.time_zone}
            onChange={event => change({ time_zone: event.target.value })}
          />
          <datalist id={zoneListId}>
            {(
              (
                Intl as unknown as {
                  supportedValuesOf?: (key: string) => string[]
                }
              ).supportedValuesOf?.('timeZone') ?? ['UTC', 'Asia/Baku']
            ).map(zone => (
              <option key={zone} value={zone} />
            ))}
          </datalist>
        </Box>
        <Flex align="center" as="label" gap="sm">
          <input
            checked={settings.all_day || settings.start_field !== 'date'}
            disabled={disabled || settings.start_field !== 'date'}
            type="checkbox"
            onChange={event => change({ all_day: event.target.checked })}
          />
          {t('scheduling.allDay')}
        </Flex>
        <Stack gap="xs">
          <Text size="sm">{t('scheduling.repeat')}</Text>
          <ChoiceSelect
            disabled={disabled}
            label={t('scheduling.repeat')}
            options={['none', 'daily', 'weekly', 'monthly', 'yearly'].map(
              value => ({
                value,
                label: t(`scheduling.${value}`)
              })
            )}
            value={rule?.frequency ?? 'none'}
            onChange={value =>
              change({
                recurrence:
                  value === 'none'
                    ? null
                    : {
                        frequency: value as NonNullable<
                          Schedule['recurrence']
                        >['frequency'],
                        interval: 1,
                        weekdays: [],
                        count: null,
                        until: null
                      }
              })
            }
          />
        </Stack>
        {rule && (
          <Box as="label" className="monolith-calendar-field">
            <Text size="sm">{t('scheduling.interval')}</Text>
            <input
              disabled={disabled}
              max="365"
              min="1"
              type="number"
              value={rule.interval}
              onChange={event =>
                change({
                  recurrence: { ...rule, interval: Number(event.target.value) }
                })
              }
            />
          </Box>
        )}
      </Grid>
      {rule?.frequency === 'weekly' && (
        <Flex aria-label={t('scheduling.weekdays')} gap="xs" wrap="wrap">
          {[1, 2, 3, 4, 5, 6, 0].map(day => (
            <Button
              key={day}
              aria-pressed={rule.weekdays.includes(day)}
              disabled={disabled}
              namespace={false}
              variant={rule.weekdays.includes(day) ? 'primary' : 'secondary'}
              onClick={() =>
                change({
                  recurrence: {
                    ...rule,
                    weekdays: rule.weekdays.includes(day)
                      ? rule.weekdays.filter(value => value !== day)
                      : [...rule.weekdays, day]
                  }
                })
              }
            >
              {new Intl.DateTimeFormat(i18n.language, {
                weekday: 'short',
                timeZone: 'UTC'
              }).format(Date.UTC(2026, 9, 18 + day))}
            </Button>
          ))}
        </Flex>
      )}
      {rule && (
        <Grid gap="sm" templateCols={2}>
          <Box as="label" className="monolith-calendar-field">
            <Text size="sm">{t('scheduling.until')}</Text>
            <input
              disabled={disabled}
              type="date"
              value={rule.until ?? ''}
              onChange={event =>
                change({
                  recurrence: {
                    ...rule,
                    until: event.target.value || null,
                    count: null
                  }
                })
              }
            />
          </Box>
          <Box as="label" className="monolith-calendar-field">
            <Text size="sm">{t('scheduling.count')}</Text>
            <input
              disabled={disabled}
              max="10000"
              min="1"
              type="number"
              value={rule.count ?? ''}
              onChange={event =>
                change({
                  recurrence: {
                    ...rule,
                    count: event.target.value
                      ? Number(event.target.value)
                      : null,
                    until: null
                  }
                })
              }
            />
          </Box>
        </Grid>
      )}
      <Text color="muted" size="sm">
        {t('scheduling.seriesHelp')}
      </Text>
      <Stack gap="xs">
        <Text weight="medium">{t('scheduling.reminders')}</Text>
        <Flex gap="sm" wrap="wrap">
          {[0, 5, 10, 15, 30, 60, 1440].map(minutes => (
            <Flex key={minutes} align="center" as="label" gap="xs">
              <input
                checked={settings.reminders.includes(minutes)}
                disabled={
                  disabled ||
                  (settings.reminders.length >= 5 &&
                    !settings.reminders.includes(minutes))
                }
                type="checkbox"
                onChange={event =>
                  change({
                    reminders: event.target.checked
                      ? [...settings.reminders, minutes]
                      : settings.reminders.filter(value => value !== minutes)
                  })
                }
              />
              {minutes === 0
                ? t('scheduling.atStart')
                : t('scheduling.minutesBefore', { count: minutes })}
            </Flex>
          ))}
        </Flex>
      </Stack>
      <Flex align="center" as="label" gap="sm">
        <input
          checked={settings.email}
          disabled={disabled || (!!row && row.organizer_id !== actor)}
          type="checkbox"
          onChange={event => change({ email: event.target.checked })}
        />
        {t('scheduling.organizerEmail')}
      </Flex>
      {!emailReady && (
        <Text color="muted" role="status" size="sm">
          {t('scheduling.emailNotConfigured')}
        </Text>
      )}
      <Stack gap="xs">
        <Text weight="medium">{t('scheduling.guests')}</Text>
        {people
          .filter(
            person =>
              person.kind === 'human' &&
              person.id !== (row?.organizer_id ?? actor)
          )
          .map(person => (
            <Flex key={person.id} align="center" as="label" gap="sm">
              <input
                checked={settings.attendees.includes(person.id)}
                disabled={disabled}
                type="checkbox"
                onChange={event =>
                  change({
                    attendees: event.target.checked
                      ? [...settings.attendees, person.id]
                      : settings.attendees.filter(id => id !== person.id)
                  })
                }
              />
              {person.label}
              <Text color="muted" size="sm">
                {settings.attendees.includes(person.id)
                  ? t(
                      `scheduling.${row?.responses[person.id]?.status ?? 'invited'}`
                    )
                  : ''}
              </Text>
            </Flex>
          ))}
      </Stack>
      {actor && row?.settings.attendees.includes(actor) && (
        <Stack gap="sm">
          <Text weight="medium">{t('scheduling.yourResponse')}</Text>
          <Flex as="label" gap="sm">
            <input
              checked={email}
              disabled={responding}
              type="checkbox"
              onChange={event => {
                setEmail(event.target.checked)
                setResponseDirty(true)
              }}
            />
            {t('scheduling.myEmail')}
          </Flex>
          <Flex gap="xs">
            {(['accepted', 'tentative', 'declined'] as const).map(status => (
              <Button
                key={status}
                loading={responding}
                namespace={false}
                variant={
                  row.responses[actor]?.status === status
                    ? 'primary'
                    : 'secondary'
                }
                onClick={() => void respond(status)}
              >
                {t(`scheduling.${status}`)}
              </Button>
            ))}
          </Flex>
        </Stack>
      )}
      {dirty && (row?.revision ?? 0) !== revision && (
        <Stack gap="xs">
          <Text role="status">{t('scheduling.settingsChanged')}</Text>
          <Button
            namespace={false}
            variant="secondary"
            onClick={() => {
              if (row) {
                setSettings(row.settings)
                setRevision(row.revision)
                setDirty(false)
                setError('')
              }
            }}
          >
            {t('scheduling.reloadSettings')}
          </Button>
        </Stack>
      )}
      {error && (
        <Text color="dangerous" role="alert">
          {error}
        </Text>
      )}
      {!readOnly && (
        <Button loading={busy} namespace={false} onClick={() => void save()}>
          {t('scheduling.saveSchedule')}
        </Button>
      )}
      {saved && <Text role="status">{t('scheduling.saved')}</Text>}
    </Stack>
  )
}
