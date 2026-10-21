// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'

import { Flex, Ring, Text } from '@/components/primitives'

const meta = {
  title: 'Primitives/Ring',
  component: Ring,
  args: {
    p: 'md',
    r: 'lg',
    ringWidth: '2px',
    ringOffsetWidth: '3px',
    children: 'Selected workspace'
  }
} satisfies Meta<typeof Ring>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const WidthAndOffset: Story = {
  render: () => (
    <Flex gap="xl" wrap="wrap">
      {['1px', '3px', '5px'].map(width => (
        <Ring key={width} ringWidth={width} ringOffsetWidth="4px" p="lg" r="md">
          <Text>{width}</Text>
        </Ring>
      ))}
    </Flex>
  )
}
export const ResponsiveAndTheme: Story = {
  render: () => (
    <Ring
      p="lg"
      ringWidth={{ base: '1px', lg: '4px' }}
      ringColor={{ base: 'custom-500', dark: 'custom-300' }}
    >
      <Text>Resize the preview to inspect the outline.</Text>
    </Ring>
  )
}
export const AsChild: Story = {
  render: () => (
    <Ring asChild ringWidth="2px" p="md" r="md">
      <button type="button">Selected collection</button>
    </Ring>
  )
}
