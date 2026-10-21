// SPDX-License-Identifier: 0BSD
import { useEffect, useId, useRef } from 'react'

import { Flex } from '@/components/primitives'

import { InputIcon } from '../shared/components/InputIcon'
import { InputLabel } from '../shared/components/InputLabel'
import {
  InputWrapper,
  type InputWrapperPassthrough
} from '../shared/components/InputWrapper'
import { Placeholder } from '../shared/components/Placeholder'
import { useInputLabel } from '../shared/hooks/useInputLabel'
import type { InputVariants } from '../shared/types'
import { textarea } from './textarea.css'

export type TextAreaInputProps = InputVariants & {
  value: string
  onChange: (value: string) => void
  placeholder: string
  label?: string
  icon?: string
  required?: boolean
  disabled?: boolean
  autoFocus?: boolean
  className?: string
  namespace?: string | false
  errorMsg?: string
  onEnter?: () => void
  wrapperProps?: InputWrapperPassthrough
}

export function TextAreaInput({
  value,
  onChange,
  placeholder,
  label,
  icon,
  required,
  disabled,
  autoFocus,
  className,
  namespace,
  errorMsg,
  onEnter,
  wrapperProps,
  variant = 'classic'
}: TextAreaInputProps) {
  const id = useId()
  const ref = useRef<HTMLTextAreaElement>(null)
  const translatedLabel = useInputLabel({ label: label ?? '', namespace })
  useEffect(() => {
    const element = ref.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = element.scrollHeight + 'px'
  }, [value])
  return (
    <InputWrapper
      {...wrapperProps}
      variant={variant}
      inputRef={ref}
      className={className}
      disabled={disabled}
      errorMsg={errorMsg}
      errorId={id + '-error'}
    >
      {variant === 'classic' && icon && (
        <InputIcon
          icon={icon}
          active={value.length > 0}
          hasError={!!errorMsg}
        />
      )}
      <Flex position="relative" width="100%" minWidth="0">
        {variant === 'classic' && label && (
          <InputLabel
            htmlFor={id}
            label={translatedLabel}
            required={required}
            active={value.length > 0}
            hasError={!!errorMsg}
          />
        )}
        <Placeholder
          color={variant === 'classic' && label ? 'transparent' : 'default'}
        >
          <textarea
            id={id}
            ref={ref}
            autoFocus={autoFocus}
            required={required}
            disabled={disabled}
            placeholder={placeholder}
            className={textarea({ variant })}
            value={value}
            aria-label={translatedLabel || placeholder}
            aria-invalid={!!errorMsg || undefined}
            aria-describedby={errorMsg ? id + '-error' : undefined}
            onChange={event => onChange(event.currentTarget.value)}
            onKeyDown={event => {
              if (
                onEnter &&
                event.key === 'Enter' &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault()
                onEnter()
              }
            }}
          />
        </Placeholder>
      </Flex>
    </InputWrapper>
  )
}
