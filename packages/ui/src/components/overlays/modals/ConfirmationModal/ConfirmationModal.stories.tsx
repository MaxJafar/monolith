// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Button } from '@/components/inputs'
import { Stack, Text } from '@/components/primitives'
import { useModalStore } from '@/providers'

import { ConfirmationModal } from './index'

const meta = {
  title: 'Overlays/ConfirmationModal',
  component: ConfirmationModal,
  args: {
    data: { title: 'Delete this draft?', description: 'Preview only' },
    onClose: () => {}
  }
} satisfies Meta<typeof ConfirmationModal>
export default meta
type Story = StoryObj<typeof meta>
function Demo({
  prompt = false,
  retry = false
}: {
  prompt?: boolean
  retry?: boolean
}) {
  const { open } = useModalStore()
  const [result, setResult] = useState('No action taken')
  return (
    <Stack>
      <Button
        namespace={false}
        onClick={() => {
          let failed = false
          open(ConfirmationModal, {
            title: 'Delete this draft?',
            description: 'This example changes only its preview state.',
            confirmationPrompt: prompt ? 'DELETE' : undefined,
            confirmationButton: {
              children: 'Delete draft',
              namespace: false,
              dangerous: true
            },
            onConfirm: async () => {
              if (retry && !failed) {
                failed = true
                throw new Error('The preview request failed. Try again.')
              }
              setResult('Draft deleted in preview')
            },
            onReject: () => setResult('Kept the draft')
          })
        }}
      >
        Review deletion
      </Button>
      <Text role="status">{result}</Text>
    </Stack>
  )
}
export const Default: Story = { render: () => <Demo /> }
export const TypedConfirmation: Story = { render: () => <Demo prompt /> }
export const RecoverableFailure: Story = { render: () => <Demo retry /> }
