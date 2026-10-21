// SPDX-License-Identifier: 0BSD
import { Box } from '@/components/primitives'

export function SidebarDivider({ noMargin = false }: { noMargin?: boolean }) {
  return (
    <Box
      as="li"
      role="separator"
      aria-orientation="horizontal"
      height="1px"
      bg={{ base: 'bg-200', dark: 'bg-800' }}
      my={noMargin ? 'none' : 'sm'}
      mx="md"
      flexShrink="0"
    />
  )
}
