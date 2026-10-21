// SPDX-License-Identifier: 0BSD
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Flex, Text } from '@/components/primitives'

import { Button } from '../Button'
import { DateInput } from '../DateInput'
import { ListboxInput } from '../ListboxInput'
import { ListboxOption } from '../ListboxInput/components/ListboxOption'
import { NumberInput } from '../NumberInput'
import { TextAreaInput } from '../TextAreaInput'
import {
  type FrequencyName,
  days,
  durationUnits,
  frequencies,
  positions
} from './model'
import { useRepeatDraft } from './useRepeatDraft'

export type { FreqSpecificParams, RRuleParams } from './types'

function Choice<Value extends string | number>({
  label,
  value,
  options,
  onChange
}: {
  label: string
  value: Value
  options: { value: Value; label: string }[]
  onChange: (next: Value) => void
}) {
  return (
    <ListboxInput
      label={label}
      namespace={false}
      value={value}
      onChange={onChange}
      renderContent={() =>
        options.find(item => item.value === value)?.label ?? String(value)
      }
    >
      {options.map(item => (
        <ListboxOption key={item.value} value={item.value} label={item.label} />
      ))}
    </ListboxInput>
  )
}
function Count({
  label,
  value,
  onChange,
  min = 1,
  max
}: {
  label: string
  value: number
  onChange: (next: number) => void
  min?: number
  max?: number
}) {
  return (
    <NumberInput
      required
      label={label}
      namespace={false}
      icon="tabler:number"
      value={value}
      min={min}
      max={max}
      onChange={onChange}
    />
  )
}
export function RRuleInput<HasDuration extends boolean = boolean>({
  value,
  onChange,
  hasDuration
}: {
  value: string
  onChange: (value: string) => void
  hasDuration: HasDuration
}) {
  const { t, i18n } = useTranslation('common.recurring')
  const { draft, structured, change } = useRepeatDraft(
    value,
    onChange,
    hasDuration
  )
  const [manual, setManual] = useState(false)
  if (!structured || manual)
    return (
      <Flex direction="column" gap="sm">
        <Text size="sm" color="muted">
          {t('editor.rawDescription')}
        </Text>
        <TextAreaInput
          label={t('editor.raw')}
          placeholder="RRULE:FREQ=DAILY"
          namespace={false}
          value={value}
          onChange={text => {
            setManual(true)
            onChange(text)
          }}
        />
        {structured && (
          <Button
            variant="plain"
            namespace={false}
            onClick={() => setManual(false)}
          >
            {t('editor.structured')}
          </Button>
        )}
      </Flex>
    )
  const longPeriod =
    draft.frequency === 'monthly' || draft.frequency === 'yearly'
  const language = i18n.resolvedLanguage || 'en'
  const weekdayNames = days.map((day, index) => ({
    value: day,
    label: new Intl.DateTimeFormat(language, {
      weekday: 'long',
      timeZone: 'UTC'
    }).format(new Date(Date.UTC(2026, 0, 5 + index)))
  }))
  const monthNames = Array.from({ length: 12 }, (_, index) => ({
    value: index + 1,
    label: new Intl.DateTimeFormat(language, {
      month: 'long',
      timeZone: 'UTC'
    }).format(new Date(Date.UTC(2026, index, 1)))
  }))
  const duration = draft.duration ?? {
    duration_amt: 1,
    duration_unit: 'hour' as const
  }
  return (
    <Flex direction="column" gap="md" width="100%">
      <DateInput
        hasTime
        required
        label={t('editor.start')}
        namespace={false}
        icon="tabler:calendar"
        value={draft.start}
        onChange={start => change({ start })}
      />
      <Choice
        label={t('inputs.frequency')}
        value={draft.frequency}
        options={(Object.keys(frequencies) as FrequencyName[]).map(freq => ({
          value: freq,
          label: t('freqs.' + freq)
        }))}
        onChange={frequency =>
          change({
            frequency,
            interval: frequency === 'yearly' ? 1 : draft.interval
          })
        }
      />
      {draft.frequency !== 'yearly' && (
        <Count
          label={t('editor.interval')}
          value={draft.interval}
          onChange={interval => change({ interval })}
        />
      )}
      {draft.frequency === 'weekly' && (
        <Flex
          wrap="wrap"
          gap="xs"
          role="group"
          aria-label={t('editor.weekdays')}
        >
          {weekdayNames.map(day => (
            <Button
              key={day.value}
              variant={draft.days.includes(day.value) ? 'primary' : 'secondary'}
              namespace={false}
              aria-pressed={draft.days.includes(day.value)}
              onClick={() =>
                change({
                  days: draft.days.includes(day.value)
                    ? draft.days.filter(value => value !== day.value)
                    : [...draft.days, day.value]
                })
              }
            >
              {day.label}
            </Button>
          ))}
        </Flex>
      )}
      {longPeriod && (
        <>
          <Choice
            label={t('editor.pattern')}
            value={draft.pattern}
            options={(['exactDate', 'relativeDay'] as const).map(pattern => ({
              value: pattern,
              label: t('inputs.monthly.' + pattern + '.title')
            }))}
            onChange={pattern => change({ pattern })}
          />
          {draft.frequency === 'yearly' && (
            <Choice
              label={t('inputs.yearly.exactDate.inputs.month')}
              value={draft.month}
              options={monthNames}
              onChange={month => change({ month })}
            />
          )}
          {draft.pattern === 'exactDate' ? (
            <Count
              label={t('editor.monthDay')}
              value={draft.monthDay}
              min={-31}
              max={31}
              onChange={monthDay => change({ monthDay })}
            />
          ) : (
            <>
              <Choice
                label={t('editor.position')}
                value={draft.position}
                options={(
                  Object.keys(positions) as (keyof typeof positions)[]
                ).map(position => ({
                  value: position,
                  label: t('onThe.' + position)
                }))}
                onChange={position => change({ position })}
              />
              <Choice
                label={t('editor.dayGroup')}
                value={draft.dayGroup}
                options={[
                  ...weekdayNames,
                  ...(['day', 'weekday', 'weekendDay'] as const).map(group => ({
                    value: group,
                    label: t('onTheDay.' + group)
                  }))
                ]}
                onChange={dayGroup => change({ dayGroup })}
              />
            </>
          )}
        </>
      )}
      <Choice
        label={t('inputs.endType')}
        value={draft.ending}
        options={(['never', 'after', 'on'] as const).map(ending => ({
          value: ending,
          label: t('endTypes.' + ending)
        }))}
        onChange={ending => change({ ending })}
      />
      {draft.ending === 'after' && (
        <Count
          label={t('editor.count')}
          value={draft.count}
          onChange={count => change({ count })}
        />
      )}
      {draft.ending === 'on' && (
        <DateInput
          label={t('editor.until')}
          namespace={false}
          required
          icon="tabler:calendar"
          value={draft.until}
          startDate={draft.start ?? undefined}
          onChange={date => {
            const until = date ? new Date(date) : null
            until?.setHours(23, 59, 59, 0)
            change({ until })
          }}
        />
      )}
      {hasDuration && (
        <>
          <Count
            label={t('inputs.durationAmount')}
            value={duration.duration_amt}
            onChange={duration_amt =>
              change({ duration: { ...duration, duration_amt } })
            }
          />
          <Choice
            label={t('inputs.durationUnit')}
            value={duration.duration_unit}
            options={durationUnits.map(unit => ({
              value: unit,
              label: t('durationUnits.' + unit)
            }))}
            onChange={duration_unit =>
              change({ duration: { ...duration, duration_unit } })
            }
          />
        </>
      )}
      {draft.start && !value && (
        <Text role="status" size="sm" color="dangerous">
          {t('editor.incomplete')}
        </Text>
      )}
    </Flex>
  )
}
