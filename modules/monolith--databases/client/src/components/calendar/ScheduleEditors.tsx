import { useState } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import {
  Box,
  Button,
  Checkbox,
  ChoiceSelect,
  Flex,
  Grid,
  Stack,
  Switch,
  Text
} from '@monolith/ui'

import type { Schedule, ScheduleRow } from '../../../../calendarShared'

type Change = (patch: Partial<Schedule>) => void
type Rule = NonNullable<Schedule['recurrence']>

export const reminderOptions = [0, 5, 10, 15, 30, 60, 1440]

/** Short reminder labels shared by the chips and the property value. */
export function useReminderLabel() {
  const { t } = useModuleTranslation()

  return (minutes: number) => {
    if (minutes === 0) return t('scheduling.atStart')
    if (minutes % 1440 === 0)
      return t('scheduling.reminderDays', { count: minutes / 1440 })
    if (minutes % 60 === 0)
      return t('scheduling.reminderHours', { count: minutes / 60 })

    return t('scheduling.reminderMinutes', { count: minutes })
  }
}

export function weekdayName(day: number, language: string) {
  return new Intl.DateTimeFormat(language, {
    weekday: 'short',
    timeZone: 'UTC'
  }).format(Date.UTC(2026, 9, 18 + day))
}

export function RepeatEditor({
  rule,
  disabled,
  change
}: {
  rule: Schedule['recurrence']
  disabled: boolean
  change: Change
}) {
  const { t, i18n } = useModuleTranslation()

  function update(patch: Partial<Rule>) {
    if (rule) change({ recurrence: { ...rule, ...patch } })
  }

  return (
    <Stack gap="sm">
      <ChoiceSelect
        disabled={disabled}
        label={t('scheduling.repeat')}
        options={['none', 'daily', 'weekly', 'monthly', 'yearly'].map(
          value => ({ value, label: t(`scheduling.${value}`) })
        )}
        value={rule?.frequency ?? 'none'}
        onChange={value =>
          change({
            recurrence:
              value === 'none'
                ? null
                : {
                    frequency: value as Rule['frequency'],
                    interval: 1,
                    weekdays: [],
                    count: null,
                    until: null
                  }
          })
        }
      />
      {rule && (
        <Box as="label" className="monolith-calendar-field">
          <Text color="muted" size="xs">
            {t('scheduling.interval')}
          </Text>
          <input
            disabled={disabled}
            max="365"
            min="1"
            type="number"
            value={rule.interval}
            onChange={event => update({ interval: Number(event.target.value) })}
          />
        </Box>
      )}
      {rule?.frequency === 'weekly' && (
        <Grid
          aria-label={t('scheduling.weekdays')}
          className="monolith-schedule-weekdays"
          gap="xs"
          templateCols={7}
        >
          {[1, 2, 3, 4, 5, 6, 0].map(day => (
            <Button
              key={day}
              aria-pressed={rule.weekdays.includes(day)}
              className="monolith-schedule-chip"
              disabled={disabled}
              namespace={false}
              variant="secondary"
              onClick={() =>
                update({
                  weekdays: rule.weekdays.includes(day)
                    ? rule.weekdays.filter(value => value !== day)
                    : [...rule.weekdays, day]
                })
              }
            >
              {weekdayName(day, i18n.language)}
            </Button>
          ))}
        </Grid>
      )}
      {rule && (
        <Grid align="end" gap="sm" templateCols={2}>
          <Box as="label" className="monolith-calendar-field">
            <Text color="muted" size="xs">
              {t('scheduling.until')}
            </Text>
            <input
              disabled={disabled}
              type="date"
              value={rule.until ?? ''}
              onChange={event =>
                update({ until: event.target.value || null, count: null })
              }
            />
          </Box>
          <Box as="label" className="monolith-calendar-field">
            <Text color="muted" size="xs">
              {t('scheduling.count')}
            </Text>
            <input
              disabled={disabled}
              max="10000"
              min="1"
              type="number"
              value={rule.count ?? ''}
              onChange={event =>
                update({
                  count: event.target.value ? Number(event.target.value) : null,
                  until: null
                })
              }
            />
          </Box>
        </Grid>
      )}
      {rule && (
        <Text color="muted" size="xs">
          {t('scheduling.seriesHelp')}
        </Text>
      )}
    </Stack>
  )
}

export function RemindersEditor({
  settings,
  disabled,
  emailLocked,
  emailReady,
  change
}: {
  settings: Schedule
  disabled: boolean
  emailLocked: boolean
  emailReady: boolean
  change: Change
}) {
  const { t } = useModuleTranslation()
  const label = useReminderLabel()

  return (
    <Stack gap="sm">
      <Text color="muted" size="xs">
        {t('scheduling.remindersHelp')}
      </Text>
      <Flex aria-label={t('scheduling.reminders')} gap="xs" wrap="wrap">
        {reminderOptions.map(minutes => {
          const active = settings.reminders.includes(minutes)

          return (
            <Button
              key={minutes}
              aria-pressed={active}
              className="monolith-schedule-chip"
              disabled={disabled || (settings.reminders.length >= 5 && !active)}
              namespace={false}
              variant="secondary"
              onClick={() =>
                change({
                  reminders: active
                    ? settings.reminders.filter(value => value !== minutes)
                    : [...settings.reminders, minutes]
                })
              }
            >
              {label(minutes)}
            </Button>
          )
        })}
      </Flex>
      <Flex
        align="center"
        as="label"
        className="monolith-schedule-toggle"
        data-disabled={emailLocked || undefined}
        gap="md"
        justify="between"
      >
        <Stack gap="xs" minWidth="0">
          <Text size="sm">{t('scheduling.organizerEmail')}</Text>
          {!emailReady && (
            <Text color="muted" size="xs">
              {t('scheduling.emailNotConfigured')}
            </Text>
          )}
        </Stack>
        <Switch
          disabled={emailLocked}
          value={settings.email}
          onChange={value => change({ email: value })}
        />
      </Flex>
    </Stack>
  )
}

export function GuestsEditor({
  settings,
  disabled,
  guests,
  row,
  actor,
  email,
  responding,
  change,
  onEmailChange,
  respond
}: {
  settings: Schedule
  disabled: boolean
  guests: { id: string; label: string }[]
  row?: ScheduleRow
  actor?: string
  email: boolean
  responding: boolean
  change: Change
  onEmailChange: (email: boolean) => void
  respond: (status: 'accepted' | 'tentative' | 'declined') => void
}) {
  const { t } = useModuleTranslation()

  return (
    <Stack gap="sm">
      <Text color="muted" size="xs">
        {t('scheduling.workspaceSharing')}
      </Text>
      {guests.length ? (
        <Stack gap="none">
          {guests.map(person => {
            const invited = settings.attendees.includes(person.id)
            const status = row?.responses[person.id]?.status ?? 'invited'

            return (
              <Flex
                key={person.id}
                align="center"
                className="monolith-schedule-guest"
                gap="sm"
                justify="between"
              >
                <Checkbox
                  checked={invited}
                  disabled={disabled}
                  label={person.label}
                  onCheckedChange={checked =>
                    change({
                      attendees: checked
                        ? [...settings.attendees, person.id]
                        : settings.attendees.filter(id => id !== person.id)
                    })
                  }
                />
                {invited && (
                  <Text
                    className="monolith-schedule-rsvp"
                    data-status={status}
                    size="xs"
                  >
                    {t(`scheduling.${status}`)}
                  </Text>
                )}
              </Flex>
            )
          })}
        </Stack>
      ) : (
        <Text color="muted" size="sm">
          {t('scheduling.noGuests')}
        </Text>
      )}
      {actor && row?.settings.attendees.includes(actor) && (
        <Stack className="monolith-schedule-rsvp-section" gap="sm">
          <Text size="sm" weight="medium">
            {t('scheduling.yourResponse')}
          </Text>
          <Flex gap="xs" wrap="wrap">
            {(['accepted', 'tentative', 'declined'] as const).map(status => (
              <Button
                key={status}
                aria-pressed={row.responses[actor]?.status === status}
                className="monolith-schedule-chip"
                loading={responding}
                namespace={false}
                variant="secondary"
                onClick={() => respond(status)}
              >
                {t(`scheduling.${status}`)}
              </Button>
            ))}
          </Flex>
          <Checkbox
            checked={email}
            disabled={responding}
            label={t('scheduling.myEmail')}
            onCheckedChange={onEmailChange}
          />
        </Stack>
      )}
    </Stack>
  )
}

export function TimingEditor({
  settings,
  disabled,
  dates,
  change
}: {
  settings: Schedule
  disabled: boolean
  dates: { id: string; name: string }[]
  change: Change
}) {
  const { t } = useModuleTranslation()
  const [query, setQuery] = useState('')

  const allDayLocked = settings.start_field !== 'date'
  const zones = (
    Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
  ).supportedValuesOf?.('timeZone') ?? ['UTC', settings.time_zone]
  const search = query.trim().toLowerCase().replace(/ /g, '_')
  const matches = zones
    .filter(zone => zone.toLowerCase().includes(search))
    .slice(0, 50)

  return (
    <Stack gap="sm">
      <Stack gap="xs">
        <input
          aria-label={t('scheduling.timeZone')}
          className="monolith-schedule-search"
          disabled={disabled}
          placeholder={settings.time_zone}
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
        <Stack className="monolith-schedule-zones" gap="none">
          {matches.map(zone => (
            <button
              key={zone}
              aria-pressed={zone === settings.time_zone}
              className="monolith-schedule-zone"
              disabled={disabled}
              type="button"
              onClick={() => change({ time_zone: zone })}
            >
              {zone.replace(/_/g, ' ')}
            </button>
          ))}
          {!matches.length && (
            <Text color="muted" size="sm">
              {t('scheduling.noTimeZones')}
            </Text>
          )}
        </Stack>
      </Stack>
      <Flex
        align="center"
        as="label"
        className="monolith-schedule-toggle"
        data-disabled={disabled || allDayLocked || undefined}
        gap="sm"
        justify="between"
      >
        <Text size="sm">{t('scheduling.allDay')}</Text>
        <Switch
          disabled={disabled || allDayLocked}
          value={settings.all_day || allDayLocked}
          onChange={value => change({ all_day: value })}
        />
      </Flex>
      <Grid gap="sm" templateCols={2}>
        <Stack gap="xs">
          <Text color="muted" size="xs">
            {t('scheduling.startProperty')}
          </Text>
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
          <Text color="muted" size="xs">
            {t('scheduling.endProperty')}
          </Text>
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
      </Grid>
    </Stack>
  )
}
