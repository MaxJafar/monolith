// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'

import { Button } from '@/components/inputs'

import { ModalHeader } from './index'

const meta = {
  title: 'Overlays/ModalHeader',
  component: ModalHeader,
  args: {
    title: 'Project settings',
    namespace: false,
    icon: 'tabler:folder',
    onClose: () => {}
  }
} satisfies Meta<typeof ModalHeader>
export default meta
type Story = StoryObj<typeof meta>
export const Basic: Story = {}
export const Description: Story = {
  args: { subtitle: 'Control how this project appears in your workspace.' }
}
export const Action: Story = {
  args: {
    trailing: (
      <Button namespace={false} variant="secondary">
        Open page
      </Button>
    )
  }
}
export const LongTitle: Story = {
  args: {
    title:
      'A long project name that should fit inside a small editor without moving its close button.'
  },
  decorators: [
    Story => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    )
  ]
}
