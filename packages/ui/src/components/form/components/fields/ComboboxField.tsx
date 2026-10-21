// SPDX-License-Identifier: 0BSD
import { isEqual } from 'lodash'
import { useState } from 'react'
import type { FieldValues } from 'react-hook-form'

import { ComboboxInput, ComboboxOption } from '@/components/inputs'

import { type FieldBinding, useFieldBinding } from './binding'

export function ComboboxField<Form extends FieldValues, Value>({
  control,
  name,
  options,
  displayValue,
  onQueryChanged,
  ...input
}: FieldBinding<Form, Value> & {
  options: { value: Value; text: string; icon?: string; color?: string }[]
  label: string
  icon?: string
  disabled?: boolean
  namespace?: string | false
  required?: boolean
  autoFocus?: boolean
  forcedActiveWhen?: boolean
  className?: string
  onEnter?: () => void
  displayValue?: (value: Value) => string
  onQueryChanged?: (query: string) => void
}) {
  const field = useFieldBinding(control, name, input.namespace)
  const [search, setSearch] = useState('')
  const visible = onQueryChanged
    ? options
    : options.filter(option =>
        option.text.toLocaleLowerCase().includes(search.toLocaleLowerCase())
      )
  return (
    <ComboboxInput<Value>
      {...input}
      namespace={field.namespace}
      value={field.value}
      onChange={field.onChange}
      errorMsg={field.errorMsg}
      displayValue={
        displayValue ??
        (value =>
          options.find(option => isEqual(option.value, value))?.text ?? '')
      }
      onQueryChanged={query => {
        setSearch(query)
        onQueryChanged?.(query)
      }}
    >
      {visible.map((option, index) => (
        <ComboboxOption
          key={index}
          value={option.value}
          label={option.text}
          icon={option.icon}
          color={option.color}
        />
      ))}
    </ComboboxInput>
  )
}
