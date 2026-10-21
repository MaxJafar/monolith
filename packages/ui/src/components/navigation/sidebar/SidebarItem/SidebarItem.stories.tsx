// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { ContextMenuItem } from '@/components/overlays'
import { Stack } from '@/components/primitives'

import { SidebarItem } from './index'

const meta = {
  component: SidebarItem,
  title: 'Navigation/Sidebar/SidebarItem',
  args: { label: 'Project collections', namespace: false }
} satisfies Meta<typeof SidebarItem>
export default meta
type Story = StoryObj<typeof meta>
function Library() {
  const [selected, setSelected] = useState('Research')
  return (
    <Stack as="ul" maxWidth="22rem">
      {['Research', 'Design', 'Release'].map(label => (
        <SidebarItem
          key={label}
          label={label}
          namespace={false}
          active={selected === label}
          icon="tabler:folder"
          number={label.length}
          onClick={() => setSelected(label)}
          onCancelButtonClick={() => setSelected('')}
          contextMenuItems={
            <ContextMenuItem
              label="Rename"
              icon="tabler:pencil"
              onClick={() => {}}
            />
          }
        />
      ))}
      <SidebarItem
        label="Archived"
        namespace={false}
        icon="tabler:archive"
        onClick="expand"
        subsection={[
          {
            label: 'Completed',
            icon: 'tabler:check',
            active: false,
            onClick: () => {},
            namespace: false,
            amount: 3
          }
        ]}
      />
    </Stack>
  )
}
export const Collections: Story = { render: () => <Library /> }
export const ColorMarker: Story = {
  args: { sideStripColor: '#6086B8', number: 12, icon: 'tabler:folder' }
}
export const Tools: Story = {
  args: {
    actionButtonProps: { icon: 'tabler:plus', onClick: () => {} },
    number: 0
  }
}
