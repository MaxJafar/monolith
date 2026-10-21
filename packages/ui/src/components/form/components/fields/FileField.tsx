// SPDX-License-Identifier: 0BSD
import type { ComponentProps } from 'react'
import type { FieldValues } from 'react-hook-form'

import { FileInput, type FileValue } from '@/components/inputs'

import { type FieldBinding, useFieldBinding } from './binding'

export function FileField<Form extends FieldValues>({
  control,
  name,
  onChange,
  onFileRemove,
  ...input
}: FieldBinding<Form, FileValue> &
  Omit<ComponentProps<typeof FileInput>, 'value' | 'onChange'> & {
    onChange?: (value: FileValue) => void
    onFileRemove?: () => void
  }) {
  const state = useFieldBinding(control, name, input.namespace)
  return (
    <FileInput
      {...input}
      namespace={state.namespace}
      errorMsg={input.errorMsg ?? state.errorMsg}
      value={state.value ?? { type: 'empty' }}
      onChange={value => {
        state.onChange(value)
        if (value.type === 'empty') onFileRemove?.()
        onChange?.(value)
      }}
    />
  )
}
