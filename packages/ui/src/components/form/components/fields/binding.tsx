// SPDX-License-Identifier: 0BSD
import { type ComponentType, createElement } from 'react'
import {
  type Control,
  type ControllerRenderProps,
  type FieldPath,
  type FieldPathByValue,
  type FieldValues,
  useController
} from 'react-hook-form'

import { useNamespace } from '../FormModal'

export type FieldBinding<Form extends FieldValues, Value> = {
  control: Control<Form>
  name: FieldPathByValue<Form, Value | null | undefined>
}
export function useFieldBinding<Form extends FieldValues>(
  control: Control<Form>,
  name: FieldPath<Form>,
  namespace?: string | false
): ControllerRenderProps<Form, FieldPath<Form>> & {
  namespace: string | false | undefined
  errorMsg: string | undefined
} {
  const inheritedNamespace = useNamespace()
  const controller = useController({ control, name })
  return {
    ...controller.field,
    namespace: namespace ?? inheritedNamespace,
    errorMsg: controller.fieldState.error?.message
  }
}

/** One binding policy for all scalar fields, without copying input implementations. */
export function bindField<Value, Props extends object>(
  Input: ComponentType<Props>,
  read: (value: unknown) => unknown
) {
  return function BoundField<Form extends FieldValues>({
    control,
    name,
    ...presentation
  }: FieldBinding<Form, Value> &
    Omit<Props, 'value' | 'onChange'> & {
      namespace?: string | false
      errorMsg?: string
    }) {
    const binding = useFieldBinding(control, name, presentation.namespace)
    return createElement(Input, {
      ...presentation,
      namespace: binding.namespace,
      errorMsg: presentation.errorMsg ?? binding.errorMsg,
      value: read(binding.value),
      onChange: binding.onChange
    } as Props)
  }
}
