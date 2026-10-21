// SPDX-License-Identifier: 0BSD
import {
  Combobox,
  ComboboxButton,
  ComboboxInput as SearchField
} from '@headlessui/react'
import { type ReactNode, useId, useRef, useState } from 'react'

import { Flex, Icon } from '@/components/primitives'

import { textInputBoxRecipe } from '../TextInput/components/TextInputBox.css'
import { InputIcon } from '../shared/components/InputIcon'
import { InputLabel } from '../shared/components/InputLabel'
import { InputWrapper } from '../shared/components/InputWrapper'
import { choiceButton } from '../shared/components/choice.css'
import { useInputLabel } from '../shared/hooks/useInputLabel'
import type { InputVariants } from '../shared/types'
import { ComboboxOptions } from './components/ComboboxOptions'

interface ComboboxInputProps<T> {
  value: T
  onChange: (value: T) => void
  onQueryChanged: (query: string) => void
  displayValue: (value: T) => string
  children: ReactNode
  label?: string
  icon?: string
  required?: boolean
  disabled?: boolean
  autoFocus?: boolean
  forcedActiveWhen?: boolean
  className?: string
  namespace?: string | false
  errorMsg?: string
  onEnter?: () => void
}
export function ComboboxInput<T>({
  value,
  onChange,
  onQueryChanged,
  displayValue,
  children,
  label,
  icon,
  required,
  disabled,
  autoFocus,
  forcedActiveWhen,
  className,
  namespace,
  errorMsg,
  onEnter,
  variant = 'classic'
}: ComboboxInputProps<T> & InputVariants) {
  const id = useId()
  const ref = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const caption = useInputLabel({ label: label ?? '', namespace })
  const active =
    forcedActiveWhen ??
    (query.length > 0 ||
      (value !== undefined && value !== null && displayValue(value).length > 0))
  return (
    <Combobox
      value={value}
      disabled={disabled}
      onChange={next => {
        if (next !== null) onChange(next)
      }}
      onClose={() => {
        setQuery('')
        onQueryChanged('')
      }}
    >
      <InputWrapper
        className={className}
        variant={variant}
        inputRef={ref}
        disabled={disabled}
        errorMsg={errorMsg}
        errorId={id + '-error'}
      >
        {variant === 'classic' && icon && (
          <InputIcon icon={icon} active={active} hasError={!!errorMsg} />
        )}
        <Flex
          width="100%"
          minWidth="0"
          position="relative"
          align="center"
          gap="sm"
        >
          {variant === 'classic' && label && (
            <InputLabel
              htmlFor={id}
              label={caption}
              active={active}
              required={required}
              hasError={!!errorMsg}
            />
          )}
          <SearchField
            id={id}
            ref={ref}
            autoFocus={autoFocus}
            required={required}
            aria-label={caption || undefined}
            className={textInputBoxRecipe({ variant })}
            aria-invalid={!!errorMsg || undefined}
            aria-describedby={errorMsg ? id + '-error' : undefined}
            displayValue={(next: T) => (next == null ? '' : displayValue(next))}
            onChange={event => {
              const next = event.currentTarget.value
              setQuery(next)
              onQueryChanged(next)
              if (!next) onChange(undefined as T)
            }}
            onKeyDown={event => {
              if (event.key === 'Enter' && !event.nativeEvent.isComposing)
                onEnter?.()
            }}
          />
          <ComboboxButton
            aria-label={caption || 'Show options'}
            className={choiceButton}
            style={{ width: 'auto' }}
          >
            <Icon aria-hidden="true" icon="tabler:chevron-down" color="muted" />
          </ComboboxButton>
        </Flex>
      </InputWrapper>
      <ComboboxOptions>{children}</ComboboxOptions>
    </Combobox>
  )
}
