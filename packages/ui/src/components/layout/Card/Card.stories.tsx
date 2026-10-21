// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Grid, Stack, Text } from '@/components/primitives'

import { Card } from './index'

const meta = {
  title: 'Layout/Card',
  component: Card,
  args: { children: 'A surface for related workspace information.' }
} satisfies Meta<typeof Card>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
function ProjectLibrary() {
  const [selected, select] = useState('')
  return (
    <Stack gap="md">
      <Grid templateCols={{ base: 1, md: 2 }} gap="sm">
        {['Launch checklist', 'Product documentation'].map(title => (
          <Card
            as="button"
            type="button"
            key={title}
            isInteractive
            gap="sm"
            aria-pressed={title === selected}
            onClick={() => select(title)}
          >
            <Text weight="semibold">{title}</Text>
            <Text color="muted">Open project</Text>
          </Card>
        ))}
      </Grid>
      <Text role="status">
        {selected ? 'Selected: ' + selected : 'Choose a project'}
      </Text>
    </Stack>
  )
}
export const Interactive: Story = { render: () => <ProjectLibrary /> }
export const Link: Story = {
  render: () => (
    <Card as="a" href="#workspace" isInteractive>
      Open workspace
    </Card>
  )
}
export const Nested: Story = {
  render: () => (
    <Card gap="sm" p="md">
      <Text as="h2" weight="semibold">
        Weekly review
      </Text>
      <Card bg="surface-container" r="sm" p="sm">
        Three actions completed
      </Card>
    </Card>
  )
}
