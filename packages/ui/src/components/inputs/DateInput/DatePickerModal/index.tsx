// SPDX-License-Identifier: 0BSD
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Button,
  ListboxInput,
  ListboxOption,
  NumberInput,
  TextInput
} from '@/components/inputs'
import { ModalHeader } from '@/components/overlays'
import { Box, Flex, Stack, Text } from '@/components/primitives'

import {
  clockText,
  dateWithTime,
  dayAllowed,
  localDate,
  monthAllowed,
  selectionAllowed,
  shiftMonth,
  startingDate,
  validDate
} from '../calendar'
import { DateGrid } from './DateGrid'
import './datePicker.css'

export interface DatePickerModalData {
  value: Date | null
  onChange: (date: Date | null) => void
  label?: string
  icon?: string
  hasTime?: boolean
  startDate?: Date
  endDate?: Date
  required?: boolean
  namespace?: string | false
}
export function DatePickerModal({
  data,
  onClose
}: {
  data: DatePickerModalData
  onClose: () => void
}) {
  const titleId = useId(),
    errorId = useId()
  const { t, i18n } = useTranslation('common.modals')
  const locale = i18n.resolvedLanguage || 'en'
  const { hasTime = false, startDate: min, endDate: max } = data
  const [initial] = useState(() => startingDate(data.value, min, max))
  const [selected, setSelected] = useState(() =>
    validDate(data.value) ? new Date(data.value) : null
  )
  const [month, setMonth] = useState(() =>
    localDate(initial.getFullYear(), initial.getMonth(), 1)
  )
  const [time, setTime] = useState(() => clockText(initial))
  const [choosingMonth, setChoosingMonth] = useState(false)
  const [year, setYear] = useState(month.getFullYear())
  const candidate = selected ? dateWithTime(selected, time, hasTime) : null
  const allowed = selectionAllowed(candidate, hasTime, min, max)
  const invalid = !!selected && !allowed
  const title = hasTime ? 'datePicker.titleWithTime' : 'datePicker.title'
  function navigate(next: Date) {
    setMonth(next)
    setYear(next.getFullYear())
  }
  function selectDay(day: Date) {
    if (!dayAllowed(day, min, max)) return
    setSelected(day)
    navigate(localDate(day.getFullYear(), day.getMonth(), 1))
  }
  function confirm() {
    if (allowed) {
      data.onChange(candidate)
      onClose()
    }
  }
  const monthNames = Array.from({ length: 12 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { month: 'long' }).format(
      localDate(2026, index, 1)
    )
  )
  return (
    <Stack
      role="dialog"
      aria-labelledby={titleId}
      className="monolith-form-dialog monolith-date-editor"
      width="352px"
      maxWidth="100%"
      gap="md"
    >
      <ModalHeader
        titleId={titleId}
        icon={data.icon || (hasTime ? 'tabler:clock' : 'tabler:calendar')}
        title={title}
        onClose={onClose}
      />
      <Flex align="center" justify="between" gap="sm">
        <Button
          namespace={false}
          variant="plain"
          icon="tabler:chevron-down"
          iconPosition="end"
          aria-expanded={choosingMonth}
          onClick={() => {
            setYear(month.getFullYear())
            setChoosingMonth(value => !value)
          }}
        >
          {new Intl.DateTimeFormat(locale, {
            month: 'long',
            year: 'numeric'
          }).format(month)}
        </Button>
        <Flex gap="xs">
          <Button
            variant="plain"
            icon="tabler:chevron-left"
            aria-label={t('datePicker.previousMonth')}
            disabled={!monthAllowed(shiftMonth(month, -1), min, max)}
            onClick={() => navigate(shiftMonth(month, -1))}
          />
          <Button
            variant="plain"
            icon="tabler:chevron-right"
            aria-label={t('datePicker.nextMonth')}
            disabled={!monthAllowed(shiftMonth(month, 1), min, max)}
            onClick={() => navigate(shiftMonth(month, 1))}
          />
        </Flex>
      </Flex>
      {choosingMonth && (
        <Flex gap="sm" align="end">
          <Box flex="1" minWidth="0">
            <ListboxInput
              label="datePicker.month"
              namespace="common.modals"
              value={month.getMonth()}
              onChange={value =>
                setMonth(localDate(month.getFullYear(), value, 1))
              }
              renderContent={value => monthNames[value]}
            >
              {monthNames.map((name, index) => (
                <ListboxOption key={name} value={index} label={name} />
              ))}
            </ListboxInput>
          </Box>
          <Box width="104px">
            <NumberInput
              namespace="common.modals"
              label="datePicker.year"
              icon=""
              min={1}
              max={9999}
              value={year}
              onChange={value => {
                setYear(value)
                if (Number.isInteger(value) && value >= 1 && value <= 9999)
                  setMonth(localDate(value, month.getMonth(), 1))
              }}
            />
          </Box>
        </Flex>
      )}
      <DateGrid
        month={month}
        selected={selected}
        min={min}
        max={max}
        locale={locale}
        onSelect={selectDay}
        onMonth={navigate}
      />
      {hasTime && (
        <TextInput
          namespace="common.modals"
          label="datePicker.time"
          icon="tabler:clock"
          value={time}
          placeholder="09:00"
          inputMode="numeric"
          onChange={value => {
            setTime(value)
            if (!selected) setSelected(initial)
          }}
          onEnter={confirm}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
        />
      )}
      {invalid && (
        <Text id={errorId} role="alert" size="sm" color="dangerous">
          {t('datePicker.invalidSelection')}
        </Text>
      )}
      <Flex gap="sm" justify="between">
        <Button
          namespace="common.modals"
          variant="plain"
          disabled={!dayAllowed(new Date(), min, max)}
          onClick={() => selectDay(new Date())}
        >
          datePicker.today
        </Button>
        <Flex gap="sm">
          {!data.required && (
            <Button
              variant="plain"
              namespace="common.modals"
              onClick={() => {
                data.onChange(null)
                onClose()
              }}
            >
              datePicker.clear
            </Button>
          )}
          <Button icon="tabler:check" disabled={!allowed} onClick={confirm}>
            confirm
          </Button>
        </Flex>
      </Flex>
    </Stack>
  )
}
