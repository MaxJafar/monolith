// SPDX-License-Identifier: 0BSD
import type { FieldValues } from 'react-hook-form'

import { Switch } from '@/components/inputs'
import { useInputLabel } from '@/components/inputs/shared/hooks/useInputLabel'
import { Flex, Icon, Text } from '@/components/primitives'

import { type FieldBinding, useFieldBinding } from './binding'

export function CheckboxField<Form extends FieldValues>({
  control,
  name,
  label,
  icon,
  disabled,
  namespace
}: FieldBinding<Form, boolean> & {
  label: string
  icon: string
  disabled?: boolean
  namespace?: string | false
}) {
  const field = useFieldBinding(control, name, namespace)
  const caption = useInputLabel({ label, namespace: field.namespace })
  return (
    <Flex direction="column" gap="xs" width="100%">
      <Flex align="center" gap="sm" justify="between" py="sm">
        <Flex align="center" gap="sm">
          <Icon icon={icon} />
          <Text>{caption}</Text>
        </Flex>
        <Switch
          aria-label={caption}
          value={Boolean(field.value)}
          onChange={field.onChange}
          disabled={disabled}
        />
      </Flex>
      {field.errorMsg && (
        <Text role="alert" color="dangerous" size="sm">
          {field.errorMsg}
        </Text>
      )}
    </Flex>
  )
}
