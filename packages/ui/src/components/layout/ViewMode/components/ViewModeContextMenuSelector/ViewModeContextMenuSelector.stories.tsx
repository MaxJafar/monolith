// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { ContextMenu } from '@/components/overlays'

import { ViewModeContextMenuSelector } from './index'

const modes = [
  { value: 'list', text: 'List', icon: 'tabler:list' },
  { value: 'gallery', text: 'Gallery', icon: 'tabler:layout-grid' }
] as const
const meta = {
  title: 'DataDisplay/ViewModeContextMenuSelector',
  component: ViewModeContextMenuSelector,
  args: { modes, currentMode: 'list', onModeChange: () => {}, namespace: false }
} satisfies Meta<typeof ViewModeContextMenuSelector>
export default meta
type Story = StoryObj<typeof meta>
export const ProjectViews: Story = {
  render: function Views() {
    const [mode, setMode] = useState<'list' | 'gallery'>('list')
    return (
      <ContextMenu>
        <ViewModeContextMenuSelector
          modes={modes}
          currentMode={mode}
          onModeChange={setMode}
          namespace={false}
        />
      </ContextMenu>
    )
  }
}
