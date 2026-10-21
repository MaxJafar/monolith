// SPDX-License-Identifier: 0BSD
import { type InputHTMLAttributes, type RefObject, useMemo } from 'react'

import { Placeholder } from '@/components/inputs/shared/components/Placeholder'
import { autoFocusableRef } from '@/components/inputs/shared/utils/autoFocusableRef'

import type { InputSize, InputVariant } from '../../shared/types'
import { textInputBoxRecipe } from './TextInputBox.css'

type NativeAttributes = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'size'
>
export function TextInputBox({
  value,
  onChange,
  onRawChange,
  inputRef,
  isPassword,
  showPassword,
  variant = 'classic',
  size = 'default',
  autoFocus = false,
  onEnter,
  onKeyDown,
  className,
  style,
  ...attributes
}: NativeAttributes & {
  value: string
  onChange: (value: string) => void
  onRawChange?: InputHTMLAttributes<HTMLInputElement>['onChange']
  inputRef?: RefObject<HTMLInputElement | null>
  isPassword?: boolean
  showPassword?: boolean
  variant?: InputVariant
  size?: InputSize
  onEnter?: () => void
}) {
  const focusRef = useMemo(
    () => autoFocusableRef(autoFocus, inputRef),
    [autoFocus, inputRef]
  )
  const classes = [textInputBoxRecipe({ variant, size }), className]
    .filter(Boolean)
    .join(' ')
  return (
    <Placeholder
      color={variant === 'classic' ? 'transparent' : 'default'}
      focusColor="default"
    >
      <input
        autoComplete="off"
        {...attributes}
        className={classes}
        style={style}
        ref={focusRef}
        value={value}
        type={
          isPassword
            ? showPassword
              ? 'text'
              : 'password'
            : (attributes.type ?? 'text')
        }
        onChange={event => {
          onRawChange?.(event)
          onChange(event.currentTarget.value)
        }}
        onKeyDown={event => {
          onKeyDown?.(event)
          if (
            event.key === 'Enter' &&
            !event.defaultPrevented &&
            !event.nativeEvent.isComposing
          )
            onEnter?.()
        }}
      />
    </Placeholder>
  )
}
