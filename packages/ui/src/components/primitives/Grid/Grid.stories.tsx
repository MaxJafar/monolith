// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'

import { Box, Grid, Text } from '@/components/primitives'

const meta = {
  title: 'Primitives/Grid',
  component: Grid,
  args: { templateCols: { base: 1, md: 3 }, gap: 'md' }
} satisfies Meta<typeof Grid>
export default meta
type Story = StoryObj<typeof meta>
const names = [
  'Research notes',
  'Design review',
  'Release preparation',
  'Documentation',
  'Quality checks',
  'Follow-up'
]
export const Default: Story = {
  render: args => (
    <Grid {...args}>
      {names.map((name, index) => (
        <Box
          key={name}
          as="article"
          p="lg"
          r="lg"
          bg={{ base: 'bg-100', dark: 'bg-800' }}
        >
          <Text size="sm" color="muted">
            Project {index + 1}
          </Text>
          <Text as="h3" weight="semibold">
            {name}
          </Text>
        </Box>
      ))}
    </Grid>
  )
}
export const TracksAndSpans: Story = {
  render: () => (
    <Grid
      templateCols={{ base: 1, md: 'minmax(0, 2fr) minmax(0, 1fr)' }}
      gap="md"
    >
      <Box
        gridColumnSpan={{ base: 1, md: 2 }}
        p="md"
        bg={{ base: 'custom-100', dark: 'custom-900' }}
      >
        Quarter overview
      </Box>
      <Box gridRowSpan={2} p="md" bg={{ base: 'bg-100', dark: 'bg-800' }}>
        Timeline
      </Box>
      <Box p="md">In progress</Box>
      <Box p="md">Waiting for review</Box>
    </Grid>
  )
}
export const DenseFlow: Story = {
  render: () => (
    <Grid templateCols={3} flow="row dense" gapX="sm" gapY="lg">
      {names.map((name, index) => (
        <Box
          key={name}
          gridColumnSpan={index === 1 ? 2 : 1}
          p="md"
          bg={{ base: 'bg-100', dark: 'bg-800' }}
        >
          {name}
        </Box>
      ))}
    </Grid>
  )
}
export const AsChild: Story = {
  render: () => (
    <Grid asChild templateCols={2} gap="md">
      <section aria-label="Project stages">
        <Text>Planning</Text>
        <Text>Delivery</Text>
      </section>
    </Grid>
  )
}
