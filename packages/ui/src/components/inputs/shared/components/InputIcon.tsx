// SPDX-License-Identifier: 0BSD
import { Box, Icon } from '@/components/primitives'

import { useInputFocused } from '../contexts/InputFocusContext'

export function InputIcon({
  icon,
  active,
  hasError
}: {
  icon: string
  active: boolean
  hasError?: boolean
}) {
  const focused = useInputFocused()
  return (
    <Box asChild flexShrink="0" mr="md">
      <Icon
        aria-hidden="true"
        icon={icon}
        className="monolith-input-icon"
        size="1.25em"
        color={
          hasError
            ? 'dangerous'
            : focused
              ? 'primary'
              : active
                ? 'inherit'
                : 'muted'
        }
      />
    </Box>
  )
}
