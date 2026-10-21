// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'

import { Box, Flex, Text } from '@/components/primitives'

const meta = {
  title: 'Primitives/Flex',
  component: Flex,
  args: { gap: 'md', align: 'center', justify: 'between', wrap: 'wrap' }
} satisfies Meta<typeof Flex>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  render: args => (
    <Flex {...args}>
      <Text weight="semibold">Release checklist</Text>
      <Text color="muted">4 actions remaining</Text>
    </Flex>
  )
}
export const ResponsiveDirection: Story = {
  render: () => (
    <Flex direction={{ base: 'column', md: 'row' }} gap="lg" align="stretch">
      <Box flex="2" p="lg" bg={{ base: 'bg-100', dark: 'bg-800' }} r="lg">
        Project overview
      </Box>
      <Box flex="1" p="lg" bg={{ base: 'bg-200', dark: 'bg-700' }} r="lg">
        Next action
      </Box>
    </Flex>
  )
}
export const Distribution: Story = {
  render: () => (
    <Flex direction="column" gap="lg">
      {(['start', 'center', 'end', 'between', 'around', 'evenly'] as const).map(
        justify => (
          <Flex
            key={justify}
            justify={justify}
            gap="sm"
            bg={{ base: 'bg-100', dark: 'bg-800' }}
            p="md"
          >
            <Text>{justify}</Text>
            <Text>Plan</Text>
            <Text>Review</Text>
          </Flex>
        )
      )}
    </Flex>
  )
}
export const WrappingAndGaps: Story = {
  render: () => (
    <Flex wrap="wrap" gapX="lg" gapY="sm" width="260px">
      {['Calendar', 'Projects', 'Actions', 'Documents', 'Dashboard'].map(
        label => (
          <Box
            key={label}
            p="sm"
            bg={{ base: 'bg-100', dark: 'bg-800' }}
            r="sm"
          >
            {label}
          </Box>
        )
      )}
    </Flex>
  )
}
export const Centered: Story = {
  render: () => (
    <Flex centered minHeight="160px" bg={{ base: 'bg-100', dark: 'bg-800' }}>
      <Text>Nothing scheduled yet</Text>
    </Flex>
  )
}
