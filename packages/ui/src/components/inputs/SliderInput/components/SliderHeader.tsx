import { Button } from '@/components/inputs/Button'
import { useInputLabel } from '@/components/inputs/shared/hooks/useInputLabel'
import { Flex, Icon, Text } from '@/components/primitives'
import { useModalStore } from '@/providers'

import { SliderValueModal } from './SliderValueModal'

export function SliderHeader({
  icon,
  inputId,
  label,
  namespace,
  value,
  required,
  max = 100,
  min = 0,
  onChange,
  disabled,
  renderValue
}: {
  icon?: string
  inputId: string
  label?: string
  namespace?: string | false
  value: number
  required?: boolean
  max?: number
  min?: number
  onChange?: (value: number) => void
  disabled?: boolean
  renderValue?: (value: number) => string
}) {
  const { open } = useModalStore()
  const inputLabel = useInputLabel({ namespace, label: label ?? '' })
  if (!label) return null

  function handleValueClick() {
    if (disabled || !onChange) return
    open(SliderValueModal, {
      value,
      min,
      max,
      label: inputLabel,
      icon,
      onConfirm: onChange
    })
  }

  return (
    <Flex
      align="center"
      gap="xl"
      justify="between"
      mb="xs"
      minWidth="0"
      width="100%"
    >
      <Text asChild color="muted" weight="medium">
        <Flex as="label" htmlFor={inputId} align="center" gap="sm" minWidth="0">
          {icon && <Icon aria-hidden="true" icon={icon} />}
          <Flex align="center" gap="sm" minWidth="0" width="100%">
            <Text truncate as="div" style={{ width: '100%', minWidth: 0 }}>
              {inputLabel}
            </Text>
            {required && <span style={{ color: '#ef4444' }}>*</span>}
          </Flex>
        </Flex>
      </Text>
      <Flex align="center" gap="sm">
        <Button
          aria-label={`${inputLabel}: ${renderValue ? renderValue(value) : value}`}
          disabled={disabled || !onChange}
          namespace={false}
          px="sm"
          variant="plain"
          onClick={handleValueClick}
        >
          {renderValue ? renderValue(value) : value}
        </Button>
        <Text color="muted">/{renderValue ? renderValue(max) : max}</Text>
      </Flex>
    </Flex>
  )
}
