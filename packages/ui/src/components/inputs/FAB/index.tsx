// SPDX-License-Identifier: 0BSD
import type { ComponentProps, ReactNode } from 'react'

import { ContextMenu } from '@/components/overlays/ContextMenu'
import { Box } from '@/components/primitives'

import { Button } from '../Button'

type FloatingProps = Omit<ComponentProps<typeof Button>, 'children'> & {
  children?: ReactNode
  visibilityBreakpoint?: false | 'sm' | 'md' | 'lg' | 'xl'
  menuProps?: Omit<
    ComponentProps<typeof ContextMenu>,
    'buttonComponent' | 'children'
  >
}
export function FAB({
  children,
  visibilityBreakpoint = 'md',
  menuProps,
  icon = 'tabler:plus',
  ...button
}: FloatingProps) {
  const trigger = <Button shadow r="full" p="md" {...button} icon={icon} />
  return (
    <Box
      position="fixed"
      bottom="max(1.5rem, env(safe-area-inset-bottom))"
      right="max(1.5rem, env(safe-area-inset-right))"
      zIndex="10"
      display={
        visibilityBreakpoint
          ? { base: 'block', [visibilityBreakpoint]: 'none' }
          : 'block'
      }
    >
      {children ? (
        <ContextMenu side="top" {...menuProps} buttonComponent={trigger}>
          {children}
        </ContextMenu>
      ) : (
        trigger
      )}
    </Box>
  )
}
