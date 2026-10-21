// SPDX-License-Identifier: 0BSD
import { ListboxButton, Listbox as Selection } from '@headlessui/react'
import type { ReactNode } from 'react'

import { Flex, type FlexProps, Icon, Text } from '@/components/primitives'
import { surface } from '@/system/colors/surfaces'

import { ListboxOptions } from '../ListboxInput/components/ListboxOptions'
import { ListboxMultipleContext } from '../ListboxInput/contexts/ListboxMultipleContext'
import './listbox.css'

type SelectionProps<Value> = {
  value: Value
  onChange: (next: Value) => void
  renderContent?: (value: Value) => ReactNode
}
export type ListboxProps<T> = Omit<FlexProps, 'onChange' | 'value'> & {
  disabled?: boolean
  compact?: boolean
} & (
    | (SelectionProps<T[]> & { multiple: true })
    | (SelectionProps<T> & { multiple?: never })
  )

function readable(value: unknown): string {
  if (Array.isArray(value))
    return value.map(readable).filter(Boolean).join(', ')
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : ''
}

export function Listbox<T>(props: ListboxProps<T>) {
  const {
    multiple,
    value,
    onChange,
    renderContent,
    children,
    compact,
    disabled,
    className,
    ...button
  } = props
  function choose(next: T | T[]) {
    if (multiple) onChange(next as T[])
    else onChange(next as T)
  }
  return (
    <ListboxMultipleContext value={!!multiple}>
      <Selection
        multiple={multiple}
        value={value}
        onChange={choose}
        disabled={disabled}
      >
        <Flex
          asChild
          align="center"
          justify="between"
          gap="sm"
          minWidth="0"
          p="sm"
          r="md"
          bg={surface.lightInteractive}
          {...button}
          className={['monolith-listbox-trigger', className]
            .filter(Boolean)
            .join(' ')}
        >
          <ListboxButton>
            {renderContent ? (
              renderContent(value as never)
            ) : (
              <Text truncate align="left">
                {readable(value)}
              </Text>
            )}
            <Icon icon="tabler:chevron-down" color="muted" aria-hidden />
          </ListboxButton>
        </Flex>
        <ListboxOptions compact={compact}>{children}</ListboxOptions>
      </Selection>
    </ListboxMultipleContext>
  )
}
