import {
  type ComponentProps,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState
} from 'react'
import { useTranslation } from 'react-i18next'

import { Button, TextInput } from '@/components/inputs'
import { Flex, Stack, Text } from '@/components/primitives'

type ConfirmationData = {
  title: string
  description: string
  confirmationButton?: 'delete' | 'confirm' | ComponentProps<typeof Button>
  confirmationPrompt?: string
  onConfirm?: () => Promise<void> | void
  onReject?: () => void
  renderChildren?: (onClose: () => void) => ReactNode
}

export function ConfirmationModal({
  data,
  onClose
}: {
  data: ConfirmationData
  onClose: () => void
}) {
  const { t } = useTranslation('common.modals')
  const titleId = useId()
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const locked = useRef(false)
  const active = useRef(false)
  const specification = data.confirmationButton ?? 'confirm'
  const action =
    typeof specification === 'string'
      ? {
          children: specification,
          dangerous: specification === 'delete',
          icon: specification === 'delete' ? 'tabler:trash' : 'tabler:check'
        }
      : specification
  const matches = !data.confirmationPrompt || data.confirmationPrompt === text

  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])

  function cancel() {
    if (locked.current) return
    data.onReject?.()
    onClose()
  }

  async function confirm() {
    if (locked.current || !matches || action.disabled) return
    locked.current = true
    setPending(true)
    setError('')
    try {
      await data.onConfirm?.()
      if (active.current) onClose()
    } catch (reason) {
      if (active.current)
        setError(
          reason instanceof Error
            ? reason.message
            : t('confirmationFailed', {
                defaultValue:
                  'Unable to complete this action. Please try again.'
              })
        )
    } finally {
      locked.current = false
      if (active.current) setPending(false)
    }
  }

  return (
    <Stack
      width="440px"
      maxWidth="100%"
      gap="md"
      role="dialog"
      aria-labelledby={titleId}
      aria-busy={pending}
    >
      <Text as="h1" id={titleId} size="xl" weight="semibold">
        {data.title}
      </Text>
      <Text color="muted">{data.description}</Text>
      {data.confirmationPrompt && (
        <TextInput
          value={text}
          onChange={setText}
          disabled={pending}
          icon="tabler:alert-triangle"
          label="deleteConfirmation.inputs.confirmation.label"
          namespace="common.modals"
          placeholder={t('deleteConfirmation.inputs.confirmation.placeholder', {
            text: data.confirmationPrompt
          })}
        />
      )}
      {error && (
        <Text color="dangerous" role="alert">
          {error}
        </Text>
      )}
      {data.renderChildren ? (
        data.renderChildren(cancel)
      ) : (
        <Flex gap="sm" justify="end" wrap="wrap">
          <Button variant="secondary" disabled={pending} onClick={cancel}>
            cancel
          </Button>
          <Button
            {...action}
            loading={pending}
            disabled={pending || !matches || action.disabled}
            onClick={confirm}
          />
        </Flex>
      )}
    </Stack>
  )
}
