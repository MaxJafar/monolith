// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'

import { SidebarTitle } from './index'

const meta = {
  component: SidebarTitle,
  title: 'Navigation/Sidebar/SidebarTitle',
  args: { label: 'Collections', namespace: false }
} satisfies Meta<typeof SidebarTitle>
export default meta
type Story = StoryObj<typeof meta>
export const Heading: Story = {}
export const AddCollection: Story = {
  args: { actionButton: { icon: 'tabler:plus', onClick: () => {} } }
}
