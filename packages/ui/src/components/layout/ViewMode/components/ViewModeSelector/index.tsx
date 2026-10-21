// SPDX-License-Identifier: 0BSD
import { Button } from '@/components/inputs/Button'
import { Flex, type FlexProps } from '@/components/primitives'

export interface ViewModeSelectorProps<
  T extends readonly { value: string; icon?: string; text?: string }[],
  TKey = T[number]['value']
> extends FlexProps<'div'> {
  currentMode: TKey
  onModeChange: (value: TKey) => void
  modes: T
  size?: 'small' | 'default'
}
export function ViewModeSelector<
  T extends readonly { value: string; icon?: string; text?: string }[],
  TKey = T[number]['value']
>({
  currentMode,
  onModeChange,
  modes,
  size = 'default',
  ...layout
}: ViewModeSelectorProps<T, TKey>) {
  return (
    <Flex role="group" aria-label="View" align="center" gap="xs" {...layout}>
      {modes.map(mode => (
        <Button
          key={mode.value}
          namespace={false}
          icon={mode.icon}
          aria-label={mode.text || mode.value}
          aria-pressed={mode.value === currentMode}
          variant={mode.value === currentMode ? 'secondary' : 'plain'}
          p={size === 'small' ? 'xs' : 'sm'}
          onClick={() => onModeChange(mode.value as TKey)}
        >
          {mode.text}
        </Button>
      ))}
    </Flex>
  )
}
