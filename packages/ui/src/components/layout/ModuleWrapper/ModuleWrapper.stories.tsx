// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'

import { Box, Stack, Text } from '@/components/primitives'

import { ModuleHeader } from '../ModuleHeader'
import { ModuleWrapper } from './index'

const meta = {
  title: 'Layout/ModuleWrapper',
  component: ModuleWrapper
} satisfies Meta<typeof ModuleWrapper>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  args: {
    config: {
      name: 'preview',
      title: 'Project library',
      icon: 'tabler:stack-2',
      clearQueryOnUnmount: false,
      canvas: false
    },
    children: null
  },
  render: args => (
    <Box height="560px">
      <ModuleWrapper {...args}>
        <ModuleHeader namespace={false} />
        <Stack gap="md">
          {Array.from({ length: 8 }, (_, index) => (
            <Box
              key={index}
              p="lg"
              r="md"
              bg={{ base: 'bg-100', dark: 'bg-800' }}
            >
              <Text as="h2" weight="semibold">
                Project {index + 1}
              </Text>
              <Text color="muted">A focused place for the next milestone.</Text>
            </Box>
          ))}
        </Stack>
      </ModuleWrapper>
    </Box>
  )
}
