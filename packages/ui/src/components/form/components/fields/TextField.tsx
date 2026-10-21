// SPDX-License-Identifier: 0BSD
import type { FieldValues } from 'react-hook-form'

import {
  QRCodeScanner,
  TextInput,
  type TextInputProps
} from '@/components/inputs'
import { useModalStore } from '@/providers'

import { type FieldBinding, useFieldBinding } from './binding'

export function TextField<Form extends FieldValues>({
  control,
  name,
  qrScanner,
  ...input
}: FieldBinding<Form, string> &
  Omit<TextInputProps, 'value' | 'onChange'> & { qrScanner?: boolean }) {
  const state = useFieldBinding(control, name, input.namespace)
  const modals = useModalStore()
  const scanner = qrScanner
    ? {
        icon: 'tabler:qrcode',
        onClick: () => modals.open(QRCodeScanner, { onScanned: state.onChange })
      }
    : undefined
  const presentation = {
    ...input,
    namespace: state.namespace,
    errorMsg: input.errorMsg ?? state.errorMsg,
    value: state.value ?? '',
    onChange: state.onChange,
    actionButtonProps: input.actionButtonProps ?? scanner
  } as TextInputProps
  return <TextInput {...presentation} />
}
