// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'

import { ContextMenu } from '..'
import { ContextMenuGroup } from './ContextMenuGroup'
import { ContextMenuItem } from './ContextMenuItem'

const meta = {
  title: 'Overlays/ContextMenu/ContextMenuGroup',
  component: ContextMenuGroup
} satisfies Meta<typeof ContextMenuGroup>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  args: {
    icon: 'tabler:layout',
    label: 'View',
    children: (
      <>
        <ContextMenuItem
          namespace={false}
          label="Gallery"
          checked
          onClick={() => {}}
        />
        <ContextMenuItem namespace={false} label="List" onClick={() => {}} />
      </>
    )
  },
  render: args => (
    <ContextMenu>
      <ContextMenuGroup {...args} />
      <ContextMenuGroup icon="tabler:share" label="Sharing">
        <ContextMenuItem
          namespace={false}
          label="Copy link"
          onClick={() => {}}
        />
      </ContextMenuGroup>
    </ContextMenu>
  )
}
