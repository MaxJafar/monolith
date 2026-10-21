// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'

import { Box, Flex, Text } from '@/components/primitives'

const meta = {
  title: 'Primitives/Box',
  component: Box,
  args: { p: 'md', r: 'md', bg: { base: 'bg-100', dark: 'bg-800' } }
} satisfies Meta<typeof Box>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  args: { children: 'A surface for a project note.' }
}
export const ResponsiveSpacing: Story = {
  render: () => (
    <Box
      as="article"
      p="sm"
      px={{ base: 'md', lg: '3xl' }}
      pl={{ lg: 'sm' }}
      r="lg"
      bg={{ base: 'bg-100', dark: 'bg-800' }}
    >
      <Text as="h2" weight="semibold">
        A workspace that fits
      </Text>
      <Text as="p">
        Resize this preview. Horizontal space changes at the wide breakpoint;
        the left edge has its own override.
      </Text>
    </Box>
  )
}
export const PositionAndOverflow: Story = {
  render: () => (
    <Box
      position="relative"
      height="140px"
      overflow="auto"
      r="lg"
      bg={{ base: 'bg-100', dark: 'bg-800' }}
    >
      <Box
        position="sticky"
        top="0px"
        p="sm"
        bg={{ base: 'bg-200', dark: 'bg-700' }}
      >
        Pinned project summary
      </Box>
      {Array.from({ length: 8 }, (_, index) => (
        <Box key={index} p="md">
          Milestone {index + 1}
        </Box>
      ))}
    </Box>
  )
}
export const ThemeStates: Story = {
  render: () => (
    <Flex gap="md" wrap="wrap">
      <Box
        shadow
        p="lg"
        r="md"
        bg={{
          base: 'bg-100',
          dark: 'bg-800',
          hover: 'custom-100',
          darkHover: 'custom-900'
        }}
      >
        Hover to inspect the accent surface
      </Box>
      <Box p="lg" display={{ base: 'none', md: 'block', print: 'none' }}>
        Visible from the medium breakpoint
      </Box>
    </Flex>
  )
}
export const AsChild: Story = {
  render: () => (
    <Box asChild p="md" r="md" bg={{ base: 'bg-100', dark: 'bg-800' }}>
      <a href="#project-notes">Open project notes</a>
    </Box>
  )
}
