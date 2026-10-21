// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'

import { Box, Stack, Text } from '@/components/primitives'

const meta = {
  title: 'Primitives/Stack',
  component: Stack,
  args: { gap: 'md' }
} satisfies Meta<typeof Stack>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  render: args => (
    <Stack {...args}>
      <Text as="h2" weight="semibold">
        Today
      </Text>
      {['Review the proposal', 'Write the first draft', 'Share progress'].map(
        label => (
          <Box
            key={label}
            p="md"
            r="md"
            bg={{ base: 'bg-100', dark: 'bg-800' }}
          >
            {label}
          </Box>
        )
      )}
    </Stack>
  )
}
export const NestedStacks: Story = {
  render: () => (
    <Stack gap="lg">
      <Stack gap="xs">
        <Text weight="semibold">Morning focus</Text>
        <Text color="muted">Make room for one important action.</Text>
      </Stack>
      <Stack direction="row" gap="lg">
        <Text>25 minutes</Text>
        <Text>Quiet mode</Text>
      </Stack>
    </Stack>
  )
}
