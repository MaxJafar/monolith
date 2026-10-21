// SPDX-License-Identifier: 0BSD
import { useTranslation } from 'react-i18next'

import { useModalStore } from '@/providers'

import { TextInput, type TextInputProps } from '../TextInput'
import { IconPickerModal } from './IconPickerModal'

export type IconInputProps = Omit<
  TextInputProps,
  'placeholder' | 'actionButtonProps' | 'size' | 'isPassword' | 'type'
>
export function IconInput({ value, onChange, ...props }: IconInputProps) {
  const { open } = useModalStore()
  const { t } = useTranslation('common.modals')
  return (
    <TextInput
      {...props}
      size="default"
      icon={value || 'tabler:icons'}
      value={value}
      onChange={onChange}
      placeholder="lucide:folder"
      spellCheck={false}
      onBlur={event => {
        onChange(event.currentTarget.value.trim())
        props.onBlur?.(event)
      }}
      actionButtonProps={{
        icon: 'tabler:search',
        'aria-label': t('iconPicker.title'),
        'aria-haspopup': 'dialog',
        onClick: () => open(IconPickerModal, { setSelectedIcon: onChange })
      }}
    />
  )
}
