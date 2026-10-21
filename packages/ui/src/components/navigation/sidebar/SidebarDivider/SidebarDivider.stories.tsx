// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'

import { SidebarDivider } from './index'

const meta = {
  component: SidebarDivider,
  title: 'Navigation/Sidebar/SidebarDivider'
} satisfies Meta<typeof SidebarDivider>
export default meta
type Story = StoryObj<typeof meta>
export const SectionBreak: Story = {}
export const Compact: Story = { args: { noMargin: true } }
