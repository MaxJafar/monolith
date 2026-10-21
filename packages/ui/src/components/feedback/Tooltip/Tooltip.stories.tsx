// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'

import { Tooltip } from './index'

const meta = {
  title: 'Feedback/Tooltip',
  component: Tooltip,
  args: { id: 'save-help', children: 'Save the current document' }
} satisfies Meta<typeof Tooltip>
export default meta
type Story = StoryObj<typeof meta>
export const KeyboardAndPointer: Story = {
  render: args => (
    <>
      <button type="button" data-tooltip-id={args.id}>
        Save
      </button>
      <Tooltip {...args} />
    </>
  )
}
