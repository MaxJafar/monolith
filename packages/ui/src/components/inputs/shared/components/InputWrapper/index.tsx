// SPDX-License-Identifier: 0BSD
import type { ReactNode, RefObject } from 'react'

import { Flex, type FlexProps, Text } from '@/components/primitives'
import { surface } from '@/system'

import { InputFocusProvider } from '../../contexts/InputFocusContext'
import type { InputSize, InputVariant } from '../../types'
import {
  inputWrapperErrorTextStyle,
  inputWrapperRecipe
} from './InputWrapper.css'

export type InputWrapperProps = FlexProps & {
  children: ReactNode
  variant?: InputVariant
  size?: InputSize
  disabled?: boolean
  inputRef?: RefObject<{ focus(): void } | null>
  onFocus?: () => void
  errorMsg?: string
  errorId?: string
}
export type InputWrapperPassthrough = Omit<
  InputWrapperProps,
  | 'children'
  | 'variant'
  | 'size'
  | 'disabled'
  | 'errorMsg'
  | 'errorId'
  | 'inputRef'
  | 'onFocus'
  | 'className'
>

export function InputWrapper({
  children,
  variant = 'classic',
  size = 'default',
  disabled = false,
  inputRef,
  onFocus,
  errorMsg,
  errorId,
  className,
  onClick,
  ...layout
}: InputWrapperProps) {
  return (
    <InputFocusProvider>
      <Flex direction="column" gap="sm" width="100%" minWidth="0">
        <Flex
          {...layout}
          align="center"
          minWidth="0"
          width="100%"
          position="relative"
          bg={layout.bg ?? surface.lightInteractive}
          className={[
            'monolith-input',
            inputWrapperRecipe({
              variant,
              size,
              hasError: !!errorMsg,
              disabled
            }),
            className
          ]
            .filter(Boolean)
            .join(' ')}
          data-input-variant={variant}
          data-disabled={disabled || undefined}
          aria-disabled={disabled || undefined}
          inert={disabled || undefined}
          role="group"
          onFocus={onFocus}
          onClick={event => {
            onClick?.(event)
            if (disabled || event.defaultPrevented) return
            const target = event.target
            if (
              target instanceof Element &&
              target.closest(
                'input, textarea, select, button, a, [role="combobox"], [contenteditable="true"]'
              )
            )
              return
            inputRef?.current?.focus()
          }}
        >
          {children}
        </Flex>
        {errorMsg && (
          <Text
            id={errorId}
            role="alert"
            size="sm"
            color="dangerous"
            className={inputWrapperErrorTextStyle}
            px={variant === 'classic' ? 'md' : undefined}
          >
            {errorMsg}
          </Text>
        )}
      </Flex>
    </InputFocusProvider>
  )
}
