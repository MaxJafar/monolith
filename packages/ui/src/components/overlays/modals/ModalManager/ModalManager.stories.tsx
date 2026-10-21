// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useId } from 'react'

import { Button } from '@/components/inputs'
import { Stack, Text } from '@/components/primitives'
import { useModalStore } from '@/providers'

import { ModalHeader } from '../ModalHeader'
import { ModalManager } from './index'

const meta = {
  title: 'Overlays/ModalManager',
  component: ModalManager
} satisfies Meta<typeof ModalManager>
export default meta
type Story = StoryObj<typeof meta>
function Preview({
  data,
  onClose
}: {
  data: { depth: number }
  onClose: () => void
}) {
  const { open } = useModalStore(),
    id = useId()
  return (
    <Stack
      className="monolith-form-dialog"
      role="dialog"
      aria-labelledby={id}
      width="320px"
      gap="md"
    >
      <ModalHeader
        namespace={false}
        titleId={id}
        title={'Editor ' + data.depth}
        icon="tabler:layers"
        onClose={onClose}
      />
      <Text>Only the active editor receives keyboard input.</Text>
      <Button
        namespace={false}
        onClick={() => open(Preview, { depth: data.depth + 1 })}
      >
        Open another editor
      </Button>
    </Stack>
  )
}
export const NestedEditors: Story = {
  render: function NestedEditors() {
    const { open } = useModalStore()
    return (
      <Button namespace={false} onClick={() => open(Preview, { depth: 1 })}>
        Open editor
      </Button>
    )
  }
}
