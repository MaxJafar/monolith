// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Tabs } from './index'

const items = [
  { id: 'inbox', name: 'Inbox', amount: 4 },
  { id: 'today', name: 'Today', amount: 2 },
  { id: 'complete', name: 'Completed', amount: 12 }
] as const
const meta = {
  title: 'Navigation/Tabs',
  component: Tabs,
  args: {
    items,
    enabled: ['inbox', 'today', 'complete'],
    currentTab: 'inbox',
    onTabChange: () => {}
  }
} satisfies Meta<typeof Tabs>
export default meta
type Story = StoryObj<typeof meta>
export const ActionViews: Story = {
  render: function Views() {
    const [active, setActive] = useState<(typeof items)[number]['id']>('inbox')
    return (
      <Tabs
        items={items}
        enabled={['inbox', 'today', 'complete']}
        currentTab={active}
        onTabChange={setActive}
      />
    )
  }
}
export const RestrictedViews: Story = { args: { enabled: ['inbox', 'today'] } }
