// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'

import { Box, Stack, Text } from '@/components/primitives'

const meta = {
  title: 'Primitives/Text',
  component: Text,
  args: { children: 'A little focus. Meaningful progress.', size: 'base' }
} satisfies Meta<typeof Text>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Scale: Story = {
  render: () => (
    <Stack>
      {(['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'] as const).map(
        size => (
          <Text key={size} size={size}>
            Monolith · {size}
          </Text>
        )
      )}
    </Stack>
  )
}
export const Emphasis: Story = {
  render: () => (
    <Stack>
      {(['normal', 'medium', 'semibold', 'bold'] as const).map(weight => (
        <Text key={weight} weight={weight}>
          {weight}: Write with clarity.
        </Text>
      ))}
      <Text tracking="wide" transform="uppercase" color="muted">
        Workspace
      </Text>
      <Text decoration="underline">Open the project brief</Text>
    </Stack>
  )
}
export const Wrapping: Story = {
  render: () => (
    <Box width="240px">
      <Stack gap="lg">
        <Text truncate display="block">
          A very long project title that needs a compact single line
        </Text>
        <Text as="p" lineClamp={2}>
          A project brings together your notes, actions and decisions. Keep the
          summary concise while the full page holds all the detail your team
          needs.
        </Text>
        <Text overflowWrap="anywhere">
          a-continuous-identifier-without-natural-spaces-for-wrapping
        </Text>
        <Text whiteSpace="pre-wrap">{'First line\n  Indented note'}</Text>
      </Stack>
    </Box>
  )
}
export const ResponsiveHeading: Story = {
  render: () => (
    <Text
      as="h1"
      size={{ base: '2xl', md: '4xl' }}
      leading="tight"
      weight="bold"
      align={{ base: 'left', md: 'center' }}
    >
      Your next chapter
    </Text>
  )
}
export const ThemeAndComposition: Story = {
  render: () => (
    <Stack>
      <Text color={{ base: 'bg-700', dark: 'bg-200', hover: 'custom-500' }}>
        Hover to highlight this label
      </Text>
      <Text asChild weight="medium">
        <a href="#notes">Read the notes</a>
      </Text>
      <Text bg={{ base: 'custom-100', dark: 'custom-900' }} p="sm" trim="both">
        Saved for later
      </Text>
    </Stack>
  )
}
