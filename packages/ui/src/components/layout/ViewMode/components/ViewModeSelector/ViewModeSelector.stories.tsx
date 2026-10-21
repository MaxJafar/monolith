// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { ViewModeSelector } from './index'

const modes = [
  { value: 'list', text: 'List', icon: 'tabler:list' },
  { value: 'gallery', text: 'Gallery', icon: 'tabler:layout-grid' }
] as const
const meta = {
  title: 'DataDisplay/ViewModeSelector',
  component: ViewModeSelector,
  args: { modes, currentMode: 'list', onModeChange: () => {} }
} satisfies Meta<typeof ViewModeSelector>
export default meta
type Story = StoryObj<typeof meta>
export const ProjectViews: Story = {
  render: function Views() {
    const [mode, setMode] = useState<'list' | 'gallery'>('list')
    return (
      <ViewModeSelector
        modes={modes}
        currentMode={mode}
        onModeChange={setMode}
      />
    )
  }
}
