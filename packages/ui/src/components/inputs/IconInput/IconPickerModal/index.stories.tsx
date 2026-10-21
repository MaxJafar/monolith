// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Button } from '@/components/inputs'
import { Stack, Text } from '@/components/primitives'
import { useModalStore } from '@/providers'

import { IconPickerModal } from './index'

const meta = {
  title: 'Inputs/IconInput/Catalog',
  component: IconPickerModal,
  args: { data: { setSelectedIcon: () => {} }, onClose: () => {} }
} satisfies Meta<typeof IconPickerModal>
export default meta
type Story = StoryObj<typeof meta>
export const Browse: Story = {
  render: function Browse() {
    const { open } = useModalStore()
    const [value, setValue] = useState('')
    return (
      <Stack gap="sm">
        <Button
          namespace={false}
          onClick={() => open(IconPickerModal, { setSelectedIcon: setValue })}
        >
          Browse icons
        </Button>
        <Text>{value}</Text>
      </Stack>
    )
  }
}
