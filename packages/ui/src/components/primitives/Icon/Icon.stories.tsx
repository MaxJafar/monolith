// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'

import { Flex, Grid, Icon, Text } from '@/components/primitives'

const meta = {
  title: 'Primitives/Icon',
  component: Icon,
  args: { icon: 'tabler:calendar', size: '1.5rem' }
} satisfies Meta<typeof Icon>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Navigation: Story = {
  render: () => (
    <Grid templateCols={{ base: 2, md: 4 }} gap="lg">
      {[
        ['calendar', 'Calendar'],
        ['stack-2', 'Projects'],
        ['circle-check', 'Actions'],
        ['files', 'Documents']
      ].map(([name, label]) => (
        <Flex key={name} align="center" gap="sm">
          <Icon icon={'tabler:' + name} aria-hidden="true" />
          <Text>{label}</Text>
        </Flex>
      ))}
    </Grid>
  )
}
export const SizeAndColor: Story = {
  render: () => (
    <Flex align="center" gap="lg">
      {[16, 24, 40, 64].map(size => (
        <Icon
          key={size}
          icon="tabler:bookmark"
          size={size + 'px'}
          color={{ base: 'custom-600', dark: 'custom-300' }}
          aria-label={size + ' pixel bookmark'}
          role="img"
        />
      ))}
    </Flex>
  )
}
export const Responsive: Story = {
  args: {
    size: { base: '24px', md: '40px', print: '16px' },
    icon: 'tabler:layout-dashboard',
    color: 'muted'
  }
}
