// SPDX-License-Identifier: 0BSD
import { isEqual } from 'lodash'
import type { FieldValues } from 'react-hook-form'

import { ListboxInput, ListboxOption } from '@/components/inputs'
import { Flex, Icon, Text } from '@/components/primitives'

import { type FieldBinding, useFieldBinding } from './binding'

type Choice<Value> = {
  value: Value
  text: string
  icon?: string
  color?: string
  disabled?: boolean
}
export function ListboxField<Form extends FieldValues, Value>({
  control,
  name,
  options,
  actionButtonOption,
  ...input
}: FieldBinding<Form, Value | Value[]> & {
  options: Choice<Value>[]
  icon: string
  label: string
  multiple?: boolean
  disabled?: boolean
  required?: boolean
  namespace?: string | false
  actionButtonOption?: { text: string; icon: string; onClick: () => void }
}) {
  const field = useFieldBinding(control, name, input.namespace)
  const selected =
    input.multiple && Array.isArray(field.value) ? field.value : [field.value]
  const choices = selected
    .map(value => options.find(option => isEqual(option.value, value)))
    .filter((option): option is Choice<Value> => !!option)
  return (
    <ListboxInput<unknown>
      {...input}
      namespace={field.namespace}
      errorMsg={field.errorMsg}
      value={field.value}
      onChange={value => {
        if (value === null) return
        field.onChange(
          Array.isArray(value) ? value.filter(item => item !== null) : value
        )
      }}
      renderContent={() => (
        <Flex align="center" gap="sm" wrap="wrap">
          {choices.length === 0 ? (
            <Text>None</Text>
          ) : (
            choices.map((choice, index) => (
              <Flex key={index} align="center" gap="xs" minWidth="0">
                {choice.icon ? (
                  <Icon icon={choice.icon} style={{ color: choice.color }} />
                ) : choice.color ? (
                  <Icon
                    icon="tabler:circle-filled"
                    size="sm"
                    style={{ color: choice.color }}
                  />
                ) : null}
                <Text truncate>{choice.text}</Text>
              </Flex>
            ))
          )}
        </Flex>
      )}
    >
      {options.map((option, index) => (
        <ListboxOption
          key={index}
          value={option.value}
          label={option.text}
          icon={option.icon}
          color={option.color}
          disabled={option.disabled}
          selected={selected.some(value => isEqual(value, option.value))}
        />
      ))}
      {actionButtonOption && (
        <ListboxOption
          value={null}
          selected={false}
          label={actionButtonOption.text}
          icon={actionButtonOption.icon}
          onClick={actionButtonOption.onClick}
        />
      )}
    </ListboxInput>
  )
}
