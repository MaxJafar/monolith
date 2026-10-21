// SPDX-License-Identifier: 0BSD
import type { ReactNode } from 'react'

import { Scrollbar } from '@/components/layout/Scrollbar'
import { Box, Stack } from '@/components/primitives'
import { useModuleSidebarState } from '@/providers'

import { GoBackButton } from '../../GoBackButton'
import '../sidebar.css'

export function SidebarWrapper({ children }: { children: ReactNode }) {
  const { isSidebarOpen, setIsSidebarOpen } = useModuleSidebarState()
  return (
    <Box
      as="aside"
      className="monolith-module-sidebar"
      data-open={isSidebarOpen}
      r="md"
      flexShrink="0"
      py="sm"
    >
      <Scrollbar usePaddingRight={false}>
        <Box className="monolith-sidebar-back" p="sm">
          <GoBackButton onClick={() => setIsSidebarOpen(false)} />
        </Box>
        <Stack as="ul" gap="xs">
          {children}
        </Stack>
      </Scrollbar>
    </Box>
  )
}
