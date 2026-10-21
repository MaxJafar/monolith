// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'

import { Flex, Stack, Text, WithDivide } from '@/components/primitives'

const meta = {
  title: 'Primitives/WithDivide',
  component: WithDivide,
  args: { axis: 'y', children: null }
} satisfies Meta<typeof WithDivide>
export default meta
type Story = StoryObj<typeof meta>
const stages = ['Inbox', 'In progress', 'Completed']
export const Default: Story = {
  render: args => (
    <Stack gap="none">
      {stages.map(stage => (
        <WithDivide {...args} key={stage}>
          <Flex p="md" justify="between">
            <Text>{stage}</Text>
            <Text color="muted">3 actions</Text>
          </Flex>
        </WithDivide>
      ))}
    </Stack>
  )
}
export const Horizontal: Story = {
  render: () => (
    <Flex>
      {stages.map(stage => (
        <WithDivide axis="x" key={stage}>
          <Flex p="md">
            <Text>{stage}</Text>
          </Flex>
        </WithDivide>
      ))}
    </Flex>
  )
}
export const Themed: Story = {
  render: () => (
    <Stack gap="none">
      {stages.map(stage => (
        <WithDivide
          key={stage}
          color={{ base: 'custom-200', dark: 'custom-700' }}
        >
          <Flex p="lg">{stage}</Flex>
        </WithDivide>
      ))}
    </Stack>
  )
}
