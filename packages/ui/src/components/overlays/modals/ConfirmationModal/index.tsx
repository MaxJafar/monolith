// SPDX-License-Identifier: 0BSD
import { type ComponentProps, type ReactNode, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button, TextInput } from '@/components/inputs'
import { Flex, Stack, Text } from '@/components/primitives'

import { useConfirmation } from './useConfirmation'

export interface ConfirmationData {
  title: string
  description: string
  confirmationButton?: 'delete' | 'confirm' | ComponentProps<typeof Button>
  confirmationPrompt?: string
  onConfirm?: () => void | Promise<void>
  onReject?: () => void
  renderChildren?: (dismiss: () => void) => ReactNode
}
const presets = {
  delete: { children: 'delete', icon: 'tabler:trash', dangerous: true },
  confirm: { children: 'confirm', icon: 'tabler:check' }
}
export function ConfirmationModal({
  data,
  onClose
}: {
  data: ConfirmationData
  onClose: () => void
}) {
  const { t } = useTranslation('common.modals')
  const heading = useId()
  const [answer, setAnswer] = useState('')
  const action: ComponentProps<typeof Button> =
    typeof data.confirmationButton === 'object'
      ? data.confirmationButton
      : presets[data.confirmationButton ?? 'confirm']
  const request = useConfirmation(
    data.onConfirm,
    onClose,
    t('confirmationFailed', {
      defaultValue: 'Unable to complete this action. Please try again.'
    })
  )
  const allowed =
    !action.disabled &&
    (!data.confirmationPrompt || answer === data.confirmationPrompt)
  const dismiss = () => {
    if (!request.canDismiss()) return
    data.onReject?.()
    onClose()
  }
  return (
    <Stack
      as="form"
      role="dialog"
      aria-labelledby={heading}
      aria-busy={request.pending}
      width="440px"
      maxWidth="100%"
      gap="md"
      onSubmit={event => {
        event.preventDefault()
        void request.submit(allowed)
      }}
    >
      <Text as="h1" id={heading} size="xl" weight="semibold">
        {data.title}
      </Text>
      <Text as="p" color="muted">
        {data.description}
      </Text>
      {data.confirmationPrompt && (
        <TextInput
          value={answer}
          onChange={setAnswer}
          label="deleteConfirmation.inputs.confirmation.label"
          namespace="common.modals"
          icon="tabler:alert-triangle"
          disabled={request.pending}
          placeholder={t('deleteConfirmation.inputs.confirmation.placeholder', {
            text: data.confirmationPrompt
          })}
        />
      )}
      {request.failure && (
        <Text role="alert" color="dangerous">
          {request.failure}
        </Text>
      )}
      {data.renderChildren ? (
        data.renderChildren(dismiss)
      ) : (
        <Flex justify="end" gap="sm" wrap="wrap">
          <Button
            variant="secondary"
            disabled={request.pending}
            onClick={dismiss}
          >
            cancel
          </Button>
          <Button
            {...action}
            type="submit"
            onClick={undefined}
            disabled={!allowed || request.pending}
            loading={request.pending}
          />
        </Flex>
      )}
    </Stack>
  )
}
