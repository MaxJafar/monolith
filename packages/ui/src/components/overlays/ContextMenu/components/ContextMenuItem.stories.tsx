// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'

import { ContextMenu } from '..'
import { ContextMenuItem } from './ContextMenuItem'

const meta = {
  title: 'Overlays/ContextMenu/ContextMenuItem',
  component: ContextMenuItem,
  args: {
    label: 'Open project',
    namespace: false,
    icon: 'tabler:external-link',
    onClick: () => {}
  },
  render: args => (
    <ContextMenu>
      <ContextMenuItem {...args} />
    </ContextMenu>
  )
} satisfies Meta<typeof ContextMenuItem>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Unavailable: Story = {
  args: { disabled: true, label: 'Read-only workspace' }
}
export const Pending: Story = { args: { loading: true, label: 'Exporting' } }
export const Selected: Story = {
  args: { checked: true, label: 'Gallery view', shouldCloseMenuOnClick: false }
}
export const Destructive: Story = {
  args: { dangerous: true, label: 'Delete draft', icon: 'tabler:trash' }
}
