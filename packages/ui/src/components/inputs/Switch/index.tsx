import { Switch as HeadlessSwitch } from '@headlessui/react'

import { Box, Flex, Transition } from '@/components/primitives'

interface SwitchProps {
  /** Whether the switch is currently checked (on) or unchecked (off). */
  value: boolean
  /** Callback function called when the switch state changes. */
  onChange: (value: boolean) => void
  /** Whether the switch is disabled and non-interactive. */
  disabled?: boolean
  /** Accessible name for switches without a separate visible label. */
  'aria-label'?: string
}

/**
 * A switch component for toggling between two states.
 */
export function Switch({
  value,
  onChange,
  disabled,
  'aria-label': ariaLabel
}: SwitchProps) {
  return (
    <Transition duration={200} property="background-color">
      <Flex
        asChild
        align="center"
        bg={
          value
            ? {
                base: 'custom-500'
              }
            : disabled
              ? {
                  base: 'bg-300',
                  dark: 'bg-700'
                }
              : {
                  base: 'bg-300',
                  hover: 'bg-400',
                  dark: 'bg-700',
                  darkHover: 'bg-500'
                }
        }
        display="inline-flex"
        flexShrink="0"
        height="1.5em"
        justify="center"
        position="relative"
        r="full"
        style={disabled ? { cursor: 'not-allowed', opacity: 0.5 } : undefined}
        width="3em"
      >
        <HeadlessSwitch
          aria-label={ariaLabel}
          checked={value}
          disabled={disabled}
          onChange={!disabled ? onChange : undefined}
        >
          <Transition
            duration="var(--motion-standard)"
            easing="var(--motion-ease-expressive)"
            property={['transform', 'background-color']}
          >
            <Box
              as="span"
              display="inline-block"
              height="1em"
              r="full"
              style={{
                transform: value
                  ? 'translateX(calc(100% - var(--spacing)))'
                  : 'translateX(calc(-100% + var(--spacing)))',
                backgroundColor: value
                  ? 'var(--interactive-on-primary)'
                  : 'var(--bg-surface)',
                boxShadow: '0 1px 3px #0003'
              }}
              width="1em"
            />
          </Transition>
        </HeadlessSwitch>
      </Flex>
    </Transition>
  )
}
