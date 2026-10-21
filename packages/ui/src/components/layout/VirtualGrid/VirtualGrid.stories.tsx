// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'

import { Box, Text } from '@/components/primitives'

import { VirtualGrid } from './index'

const projects = Array.from({ length: 1000 }, (_, index) => ({
  id: String(index),
  name: 'Project ' + (index + 1),
  notes:
    index % 4 === 0
      ? 'Planning, research, review and the next iteration. '.repeat(8)
      : 'Ready for review.'
}))
const meta = {
  title: 'DataDisplay/VirtualGrid',
  component: VirtualGrid,
  args: { items: [], getItemKey: () => '', renderItem: () => null }
} satisfies Meta<typeof VirtualGrid>
export default meta
type Story = StoryObj<typeof meta>
function Gallery({ width = '100%' }) {
  return (
    <Box height="32rem" width={width}>
      <VirtualGrid
        items={projects}
        getItemKey={project => project.id}
        renderItem={project => (
          <Box p="md" r="md" bg={{ base: 'bg-100', dark: 'bg-800' }}>
            <Text as="h3" weight="semibold">
              {project.name}
            </Text>
            <Text as="p">{project.notes}</Text>
          </Box>
        )}
      />
    </Box>
  )
}
export const ThousandProjects: Story = { render: () => <Gallery /> }
export const NarrowViewport: Story = { render: () => <Gallery width="20rem" /> }
