// SPDX-License-Identifier: 0BSD
import type { FieldValues } from 'react-hook-form'

import {
  type Location,
  LocationInput,
  type LocationInputProps
} from '@/components/inputs'

import { type FieldBinding, useFieldBinding } from './binding'

export function LocationField<Form extends FieldValues>({
  control,
  name,
  ...input
}: FieldBinding<Form, Location> &
  Omit<LocationInputProps, 'value' | 'onChange'>) {
  const state = useFieldBinding(control, name, input.namespace)
  return (
    <LocationInput
      {...input}
      namespace={state.namespace}
      errorMsg={input.errorMsg ?? state.errorMsg}
      value={state.value ?? null}
      onChange={value =>
        state.onChange(
          value ?? {
            name: '',
            formattedAddress: '',
            location: { latitude: 0, longitude: 0 }
          }
        )
      }
    />
  )
}
