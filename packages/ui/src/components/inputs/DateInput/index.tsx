// SPDX-License-Identifier: 0BSD
import { useTranslation } from 'react-i18next'

import { useModalStore } from '@/providers'

import { TextInput, type TextInputProps } from '../TextInput'
import { DatePickerModal, type DatePickerModalData } from './DatePickerModal'
import { validDate } from './calendar'

export * from './DatePickerModal'
export type DateInputProps = Omit<
  TextInputProps,
  | 'value'
  | 'onChange'
  | 'size'
  | 'placeholder'
  | 'actionButtonProps'
  | 'type'
  | 'isPassword'
> &
  Pick<
    DatePickerModalData,
    'value' | 'onChange' | 'hasTime' | 'startDate' | 'endDate'
  >

export function DateInput({
  value,
  onChange,
  hasTime = false,
  startDate,
  endDate,
  onEnter,
  ...props
}: DateInputProps) {
  const { open } = useModalStore()
  const { t, i18n } = useTranslation('common.modals')
  const title = t(hasTime ? 'datePicker.titleWithTime' : 'datePicker.title')
  const show = () => {
    if (!props.disabled)
      open(DatePickerModal, {
        value,
        onChange,
        hasTime,
        startDate,
        endDate,
        required: props.required,
        icon: props.icon
      })
  }
  const formatted = validDate(value)
    ? new Intl.DateTimeFormat(i18n.resolvedLanguage || 'en', {
        dateStyle: 'medium',
        ...(hasTime ? { timeStyle: 'short' as const } : {})
      }).format(value)
    : ''
  return (
    <TextInput
      {...props}
      size="default"
      icon={props.icon || (hasTime ? 'tabler:clock' : 'tabler:calendar')}
      readOnly
      value={formatted}
      onChange={() => {}}
      placeholder={title}
      aria-haspopup="dialog"
      onClick={event => {
        props.onClick?.(event)
        if (!event.defaultPrevented) show()
      }}
      onEnter={onEnter ?? show}
      onKeyDown={event => {
        props.onKeyDown?.(event)
        if (
          !event.defaultPrevented &&
          (event.key === ' ' || event.key === 'ArrowDown')
        ) {
          event.preventDefault()
          show()
        }
      }}
      actionButtonProps={
        value && !props.required
          ? {
              icon: 'tabler:x',
              'aria-label': t('datePicker.clear'),
              onClick: () => onChange(null)
            }
          : { icon: 'tabler:calendar', 'aria-label': title, onClick: show }
      }
    />
  )
}
