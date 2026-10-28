import { useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { type ReactNode, useEffect, useState } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import { Button, Flex, FloatingPopover, Icon, Text } from '@monolith/ui'

import { useDatabases } from '@/DatabaseProvider'
import { workspaceAPI } from '@/manifest'

import {
  type Schedule,
  type ScheduleRow,
  calendarBinding,
  scheduleSchema
} from '../../../../calendarShared'
import type { RecordPage } from '../../../../shared'
import {
  GuestsEditor,
  RemindersEditor,
  RepeatEditor,
  TimingEditor,
  useReminderLabel,
  weekdayName
} from './ScheduleEditors'
import './calendar.css'
import { useCalendarSchedules } from './useCalendarSchedules'

type Row = 'repeat' | 'reminders' | 'guests' | 'timing'

/** Rows added to the page properties, for "Hide N properties". */
export const schedulePropertyCount = 4

/** Repeat, reminders, guests and time zone shown as page properties. Each
 * property edits in a popover and saves when the popover closes. */
export function ScheduleProperties({
  record,
  onDirtyChange
}: {
  record: RecordPage
  onDirtyChange: (dirty: boolean) => void
}) {
  const query = useCalendarSchedules(),
    { t } = useModuleTranslation()

  if (query.isFetching && !query.data)
    return (
      <Text className="monolith-schedule-status" color="muted" role="status">
        {t('scheduling.loading')}
      </Text>
    )
  if (query.error && !query.data)
    return (
      <Flex align="center" className="monolith-schedule-status" gap="sm">
        <Text role="alert" size="sm">
          {query.error.message}
        </Text>
        <Button
          namespace={false}
          variant="plain"
          onClick={() => void query.refetch()}
        >
          {t('scheduling.retry')}
        </Button>
      </Flex>
    )

  return (
    <ScheduleRows
      key={record.id}
      actor={query.actor}
      emailReady={query.data?.email_ready ?? false}
      record={record}
      row={query.data?.schedules.find(row => row.record_id === record.id)}
      onDirtyChange={onDirtyChange}
    />
  )
}

function ScheduleRows({
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
  const reminderLabel = useReminderLabel()

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
  const [open, setOpen] = useState<{ row: Row; anchor: HTMLElement }>()

  useEffect(() => {
    if (!dirty && row && row.revision > revision) {
      setSettings(row.settings)
      setRevision(row.revision)
    }
  }, [row, dirty, revision])
  const [error, setError] = useState(''),
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
  const rule = settings.recurrence
  const invitedSelf = !!actor && !!row?.settings.attendees.includes(actor)
  const guests = people.filter(
    person =>
      person.kind === 'human' && person.id !== (row?.organizer_id ?? actor)
  )

  function change(patch: Partial<Schedule>) {
    setSettings(current => ({ ...current, ...patch }))
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

  function close() {
    setOpen(undefined)
    if (dirty) void save()
  }

  function repeatSummary(value: NonNullable<Schedule['recurrence']>) {
    const unit = {
      daily: 'everyDay',
      weekly: 'everyWeek',
      monthly: 'everyMonth',
      yearly: 'everyYear'
    }[value.frequency]
    const parts = [t(`scheduling.${unit}`, { count: value.interval })]

    if (value.frequency === 'weekly' && value.weekdays.length)
      parts[0] +=
        ' ' +
        t('scheduling.onWeekdays', {
          days: [1, 2, 3, 4, 5, 6, 0]
            .filter(day => value.weekdays.includes(day))
            .map(day => weekdayName(day, i18n.language))
            .join(', ')
        })
    if (value.until)
      parts.push(
        t('scheduling.untilDate', {
          date: dayjs(value.until).format('MMM D, YYYY')
        })
      )
    if (value.count)
      parts.push(t('scheduling.occurrences', { count: value.count }))

    return parts.join(' · ')
  }

  const empty = (label: string) => (
    <span className="database-empty-value">{label}</span>
  )
  const reminders = [...settings.reminders].sort((a, b) => a - b)
  const invited = settings.attendees.flatMap(id => {
    const person = people.find(item => item.id === id)

    return person ? [person] : []
  })

  const rows: { id: Row; icon: string; label: string; value: ReactNode }[] = [
    {
      id: 'repeat',
      icon: 'lucide:repeat',
      label: t('scheduling.repeat'),
      value: rule ? repeatSummary(rule) : empty(t('scheduling.none'))
    },
    {
      id: 'reminders',
      icon: 'lucide:bell',
      label: t('scheduling.remindersLabel'),
      value: reminders.length ? (
        <Flex align="center" gap="sm" minWidth="0">
          <span>
            {reminders
              .map(minutes =>
                minutes
                  ? t('scheduling.reminderBefore', {
                      time: reminderLabel(minutes)
                    })
                  : reminderLabel(minutes)
              )
              .join(', ')}
          </span>
          {settings.email && (
            <Icon
              aria-label={t('scheduling.organizerEmail')}
              color="muted"
              icon="lucide:mail"
              size="14px"
            />
          )}
        </Flex>
      ) : (
        empty(t('scheduling.noReminders'))
      )
    },
    {
      id: 'guests',
      icon: 'lucide:users',
      label: t('scheduling.guestsLabel'),
      value: invited.length ? (
        <Flex gap="xs" wrap="wrap">
          {invited.map(person => (
            <span
              key={person.id}
              className="monolith-schedule-guest-chip"
              data-status={row?.responses[person.id]?.status ?? 'invited'}
            >
              {person.label}
            </span>
          ))}
        </Flex>
      ) : (
        empty(t('emptyValue'))
      )
    },
    {
      id: 'timing',
      icon: 'lucide:globe',
      label: t('scheduling.zoneLabel'),
      value: [
        settings.time_zone.replace(/_/g, ' '),
        ...(settings.all_day || settings.start_field !== 'date'
          ? [t('scheduling.allDay')]
          : [])
      ].join(' · ')
    }
  ]

  return (
    <>
      {rows.map(item => (
        <Flex
          key={item.id}
          align="start"
          className="database-page-property-row"
        >
          <span className="database-property-label">
            <Icon color="muted" icon={item.icon} size="16px" />
            <span>{item.label}</span>
          </span>
          <button
            aria-expanded={open?.row === item.id || undefined}
            aria-haspopup="dialog"
            aria-label={item.label}
            className="database-property-cell"
            disabled={readOnly && !(item.id === 'guests' && invitedSelf)}
            type="button"
            onClick={event =>
              setOpen({ row: item.id, anchor: event.currentTarget })
            }
          >
            {item.value}
          </button>
        </Flex>
      ))}
      {dirty && !!row && row.revision > revision && (
        <Flex align="center" className="monolith-schedule-status" gap="sm">
          <Text role="status" size="sm">
            {t('scheduling.settingsChanged')}
          </Text>
          <Button
            namespace={false}
            variant="plain"
            onClick={() => {
              setSettings(row.settings)
              setRevision(row.revision)
              setDirty(false)
              setError('')
            }}
          >
            {t('scheduling.reloadSettings')}
          </Button>
        </Flex>
      )}
      {error && (
        <Text
          className="monolith-schedule-status"
          color="dangerous"
          role="alert"
          size="sm"
        >
          {error}
        </Text>
      )}
      {open && (
        <FloatingPopover
          anchor={open.anchor}
          className="database-value-popover monolith-schedule-popover"
          label={rows.find(item => item.id === open.row)?.label ?? ''}
          width={open.row === 'timing' ? 340 : 320}
          onClose={close}
        >
          {open.row === 'repeat' && (
            <RepeatEditor change={change} disabled={disabled} rule={rule} />
          )}
          {open.row === 'reminders' && (
            <RemindersEditor
              change={change}
              disabled={disabled}
              emailLocked={disabled || (!!row && row.organizer_id !== actor)}
              emailReady={emailReady}
              settings={settings}
            />
          )}
          {open.row === 'guests' && (
            <GuestsEditor
              actor={actor}
              change={change}
              disabled={disabled}
              email={email}
              guests={guests}
              respond={status => void respond(status)}
              responding={responding}
              row={row}
              settings={settings}
              onEmailChange={value => {
                setEmail(value)
                setResponseDirty(true)
              }}
            />
          )}
          {open.row === 'timing' && (
            <TimingEditor
              change={change}
              dates={data.fields.filter(
                field =>
                  field.base_id === record.base_id && field.kind === 'date'
              )}
              disabled={disabled}
              settings={settings}
            />
          )}
        </FloatingPopover>
      )}
    </>
  )
}
