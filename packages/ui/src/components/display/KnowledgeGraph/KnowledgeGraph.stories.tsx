import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { KnowledgeGraph } from './index'

const meta = {
  component: KnowledgeGraph,
  title: 'Display/KnowledgeGraph'
} satisfies Meta<typeof KnowledgeGraph>

export default meta

type Story = StoryObj<typeof meta>

const graph = {
  edges: [
    {
      id: '1',
      kind: 'mention' as const,
      label: 'Mentions',
      source: 'document:1',
      target: 'record:2'
    },
    {
      id: '2',
      kind: 'related' as const,
      label: 'Inspires',
      source: 'document:1',
      target: 'note:3'
    }
  ],
  nodes: [
    {
      id: '1',
      key: 'document:1',
      kind: 'document' as const,
      title: 'Second brain'
    },
    { id: '2', key: 'record:2', kind: 'record' as const, title: 'Launch plan' },
    { id: '3', key: 'note:3', kind: 'note' as const, title: 'New ideas' }
  ],
  unresolved: 0
}

function Example() {
  const [selected, onSelect] = useState('')

  return (
    <KnowledgeGraph graph={graph} selected={selected} onSelect={onSelect} />
  )
}

export const Connected: Story = {
  args: { graph, onSelect: () => {} },
  render: () => <Example />
}
