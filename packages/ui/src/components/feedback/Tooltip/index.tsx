// SPDX-License-Identifier: 0BSD
import type { ComponentProps, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Tooltip as Bubble } from 'react-tooltip'

import { Box, Text } from '@/components/primitives'
import { useMainSidebarState } from '@/providers'

import { tooltip } from './Tooltip.css'

export function Tooltip({
  id,
  children,
  contentProps,
  render,
  zIndex = '10',
  ...options
}: ComponentProps<typeof Bubble> & {
  id: string
  children?: ReactNode
  contentProps?: ComponentProps<typeof Box>
  zIndex?: string
}) {
  const { sidebarExpanded } = useMainSidebarState()
  if (typeof document === 'undefined') return null
  const body = (
    <Box zIndex={{ base: sidebarExpanded ? '-1' : zIndex, lg: zIndex }}>
      <Bubble
        id={id}
        noArrow
        opacity={1}
        positionStrategy="fixed"
        className={tooltip}
        {...options}
        style={{ background: 'transparent', ...options.style }}
        render={
          render ??
          (({ content }) => {
            const value = children ?? content
            if (value === null || value === undefined || value === '')
              return null
            return (
              <Box
                p="sm"
                r="md"
                shadow
                maxWidth="24rem"
                maxHeight="24rem"
                overflowY="auto"
                bg={{ base: 'bg-50', dark: 'bg-700' }}
                {...contentProps}
              >
                <Text as="div" whiteSpace="normal">
                  {value}
                </Text>
              </Box>
            )
          })
        }
      />
    </Box>
  )
  return createPortal(body, document.getElementById('app') ?? document.body)
}
