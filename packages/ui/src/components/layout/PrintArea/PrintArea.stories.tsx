// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useRef } from 'react'

import { Stack, Text } from '@/components/primitives'

import { PrintArea } from './index'

const meta = {
  component: PrintArea,
  title: 'Layout/PrintArea',
  args: { children: null, contentRef: { current: null } }
} satisfies Meta<typeof PrintArea>
export default meta
type Story = StoryObj<typeof meta>
function Statement() {
  const contentRef = useRef<HTMLDivElement>(null)
  return (
    <PrintArea contentRef={contentRef}>
      <Stack p="lg" gap="md">
        <Text as="h1" size="2xl">
          Workspace statement
        </Text>
        <Text>October 2026 · MON-001</Text>
        <Text>Design services · 12 hours</Text>
        <Text weight="semibold">Total: 600.00 USD</Text>
      </Stack>
    </PrintArea>
  )
}
export const PrintableStatement: Story = { render: () => <Statement /> }
