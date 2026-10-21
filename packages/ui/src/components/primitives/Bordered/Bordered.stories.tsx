// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'

import { Bordered, Grid, Text } from '@/components/primitives'

const meta = {
  title: 'Primitives/Bordered',
  component: Bordered,
  args: {
    p: 'lg',
    r: 'lg',
    borderWidth: '1px',
    borderStyle: 'solid',
    children: 'A quiet boundary for your content.'
  }
} satisfies Meta<typeof Bordered>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Sides: Story = {
  render: () => (
    <Grid templateCols={{ base: 2, md: 4 }} gap="lg">
      {(
        ['all', 'top', 'right', 'bottom', 'left', 'x', 'y', 'none'] as const
      ).map(side => (
        <Bordered key={side} borderSide={side} p="md">
          <Text>{side}</Text>
        </Bordered>
      ))}
    </Grid>
  )
}
export const Styles: Story = {
  render: () => (
    <Grid templateCols={2} gap="lg">
      {(['solid', 'dashed', 'dotted', 'double'] as const).map(borderStyle => (
        <Bordered
          key={borderStyle}
          borderWidth="3px"
          borderStyle={borderStyle}
          p="lg"
          borderColor={{ base: 'custom-500', dark: 'custom-300' }}
        >
          {borderStyle}
        </Bordered>
      ))}
    </Grid>
  )
}
export const SemanticElement: Story = {
  render: () => (
    <Bordered
      as="aside"
      borderSide="left"
      borderWidth="3px"
      p="md"
      borderColor="custom-500"
    >
      <Text>Project decisions stay with the project.</Text>
    </Bordered>
  )
}
