// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useRef, useState } from 'react'

import { Box, Stack, Text } from '@/components/primitives'

import { ContextMenuGroup } from './components/ContextMenuGroup'
import { ContextMenuItem } from './components/ContextMenuItem'
import { ContextMenu } from './index'

const meta = {
  title: 'Overlays/ContextMenu',
  component: ContextMenu
} satisfies Meta<typeof ContextMenu>
export default meta
type Story = StoryObj<typeof meta>
function Actions() {
  const target = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState('None')
  const [checked, setChecked] = useState(false)
  return (
    <Stack>
      <Box
        ref={target}
        tabIndex={0}
        p="lg"
        r="lg"
        bg={{ base: 'bg-100', dark: 'bg-800' }}
      >
        <Text>Right-click this project, or press Shift+F10.</Text>
        <ContextMenu contextTarget={target}>
          <ContextMenuGroup icon="tabler:adjustments" label="Project options">
            <ContextMenuItem
              label="Open project"
              namespace={false}
              icon="tabler:external-link"
              onClick={() => setSelected('Open project')}
            />
            <ContextMenuItem
              label="Pin project"
              namespace={false}
              checked={checked}
              shouldCloseMenuOnClick={false}
              onClick={() => setChecked(value => !value)}
            />
          </ContextMenuGroup>
          <ContextMenuItem
            disabled
            label="Managed by workspace"
            namespace={false}
            onClick={() => setSelected('Disabled')}
          />
          <ContextMenuItem
            dangerous
            label="Archive project"
            namespace={false}
            onClick={() => setSelected('Archive project')}
          />
        </ContextMenu>
      </Box>
      <Text role="status">Selected: {selected}</Text>
    </Stack>
  )
}
export const Default: Story = {
  args: { children: null },
  render: () => <Actions />
}
export const CustomTrigger: Story = {
  args: {
    buttonComponent: <button type="button">Project options</button>,
    align: 'start',
    children: (
      <ContextMenuItem
        label="Open notes"
        namespace={false}
        onClick={() => {}}
      />
    )
  }
}
