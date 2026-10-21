// SPDX-License-Identifier: 0BSD
import { Listbox, ListboxButton } from '@headlessui/react'
import { type ReactNode, useId } from 'react'

import { Box, Flex, Icon } from '@/components/primitives'

import { InputIcon } from '../shared/components/InputIcon'
import { InputLabel } from '../shared/components/InputLabel'
import { InputWrapper } from '../shared/components/InputWrapper'
import { choiceButton } from '../shared/components/choice.css'
import { useInputLabel } from '../shared/hooks/useInputLabel'
import type { InputVariants } from '../shared/types'
import { ListboxOptions } from './components/ListboxOptions'
import { ListboxMultipleContext } from './contexts/ListboxMultipleContext'

interface ListboxInputProps<T> {
  value: T
  onChange: (value: T) => void
  children: ReactNode
  label?: string
  icon?: string
  required?: boolean
  disabled?: boolean
  multiple?: boolean
  className?: string
  customActive?: boolean
  renderContent?: (value: T) => ReactNode
  namespace?: string | false
  errorMsg?: string
}
export function ListboxInput<T>({
  value,
  onChange,
  children,
  label,
  icon,
  required,
  disabled,
  multiple,
  className,
  customActive,
  renderContent,
  namespace,
  errorMsg,
  variant = 'classic',
  size = 'default'
}: ListboxInputProps<T> & InputVariants<true>) {
  const id = useId()
  const caption = useInputLabel({ label: label ?? '', namespace })
  const active =
    customActive ??
    (Array.isArray(value)
      ? value.length > 0
      : value !== '' && value !== null && value !== undefined)
  const fallback = Array.isArray(value)
    ? value
        .map(item => (typeof item === 'object' ? '' : String(item)))
        .filter(Boolean)
        .join(', ')
    : typeof value === 'string' || typeof value === 'number'
      ? String(value)
      : ''
  return (
    <ListboxMultipleContext value={!!multiple}>
      <Listbox
        value={value}
        onChange={onChange}
        multiple={multiple}
        disabled={disabled}
      >
        <InputWrapper
          variant={variant}
          size={size}
          className={className}
          disabled={disabled}
          errorMsg={errorMsg}
          errorId={id + '-error'}
        >
          <ListboxButton
            id={id}
            className={choiceButton}
            aria-label={caption || undefined}
            aria-required={required}
            aria-invalid={!!errorMsg || undefined}
            aria-describedby={errorMsg ? id + '-error' : undefined}
          >
            {icon && (
              <InputIcon icon={icon} active={active} hasError={!!errorMsg} />
            )}
            <Flex position="relative" minWidth="0" width="100%" align="center">
              {variant === 'classic' && label && (
                <InputLabel
                  label={caption}
                  active={active}
                  required={required}
                  hasError={!!errorMsg}
                />
              )}
              <Box
                width="100%"
                minWidth="0"
                minHeight="1.5em"
                pt={variant === 'classic' ? 'lg' : undefined}
                pb={variant === 'classic' ? 'xs' : undefined}
              >
                {renderContent
                  ? renderContent(value)
                  : fallback || (variant === 'plain' ? caption : '')}
              </Box>
            </Flex>
            <Icon
              aria-hidden="true"
              icon="tabler:chevron-down"
              color="muted"
              mx="sm"
            />
          </ListboxButton>
        </InputWrapper>
        <ListboxOptions>{children}</ListboxOptions>
      </Listbox>
    </ListboxMultipleContext>
  )
}
