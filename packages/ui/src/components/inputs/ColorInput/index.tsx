// SPDX-License-Identifier: 0BSD
import { useTranslation } from 'react-i18next'

import { useModalStore } from '@/providers'

import { TextInput, type TextInputProps } from '../TextInput'
import { ColorPickerModal } from './ColorPickerModal'
import { parseHex } from './color'

export type ColorInputProps = Omit<
  TextInputProps,
  'placeholder' | 'actionButtonProps' | 'isPassword' | 'type' | 'size'
>

export function ColorInput({
  value,
  onChange,
  icon = 'tabler:palette',
  ...props
}: ColorInputProps) {
  const { open } = useModalStore()
  const { t } = useTranslation('common.modals')
  return (
    <TextInput
      {...props}
      size="default"
      icon={icon}
      placeholder="#6993C3"
      value={value}
      onChange={text =>
        onChange(
          text.trim() ? '#' + text.trim().replace(/^#/, '').toUpperCase() : ''
        )
      }
      spellCheck={false}
      actionButtonProps={{
        'aria-label': t('colorPicker.title'),
        'aria-haspopup': 'dialog',
        children: (
          <span
            className="monolith-color-preview-dot"
            aria-hidden
            style={{ backgroundColor: parseHex(value) ?? 'transparent' }}
          />
        ),
        onClick: () => open(ColorPickerModal, { value, onChange })
      }}
    />
  )
}
