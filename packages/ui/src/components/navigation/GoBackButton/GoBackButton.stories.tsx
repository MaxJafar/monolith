// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { GoBackButton } from './index'

const meta = {
  title: 'Navigation/GoBackButton',
  component: GoBackButton,
  args: { onClick: () => {} }
} satisfies Meta<typeof GoBackButton>
export default meta
type Story = StoryObj<typeof meta>
export const ReturnToList: Story = {
  render: function ReturnToList() {
    const [page, setPage] = useState('Project details')
    return (
      <div>
        <GoBackButton onClick={() => setPage('Projects')} />
        <p>{page}</p>
      </div>
    )
  }
}
