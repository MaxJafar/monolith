// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Pagination } from './index'

const meta = {
  title: 'Navigation/Pagination',
  component: Pagination,
  args: { page: 1, totalPages: 24, onPageChange: () => {} }
} satisfies Meta<typeof Pagination>
export default meta
type Story = StoryObj<typeof meta>
export const Browse: Story = {
  render: function Browse(args) {
    const [page, setPage] = useState(args.page)
    return <Pagination {...args} page={page} onPageChange={setPage} />
  }
}
export const OnePage: Story = { args: { totalPages: 1 } }
export const Empty: Story = { args: { totalPages: 0 } }
