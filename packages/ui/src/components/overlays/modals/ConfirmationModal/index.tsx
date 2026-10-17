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
      aria-busy={pending}
      aria-labelledby={titleId}
      gap="md"
      maxWidth="100%"
      role="dialog"
      width="440px"
    >
      <Text as="h1" id={titleId} size="xl" weight="semibold">
        {data.title}
      </Text>
      <Text color="muted">{data.description}</Text>
      {data.confirmationPrompt && (
        <TextInput
          disabled={pending}
          icon="tabler:alert-triangle"
          label="deleteConfirmation.inputs.confirmation.label"
          namespace="common.modals"
          placeholder={t('deleteConfirmation.inputs.confirmation.placeholder', {
            text: data.confirmationPrompt
          })}
          value={text}
          onChange={setText}
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
          <Button disabled={pending} variant="secondary" onClick={cancel}>
            cancel
          </Button>
          <Button
            {...action}
            disabled={pending || !matches || action.disabled}
            loading={pending}
            onClick={confirm}
          />
        </Flex>
      )}
    </Stack>
  )
}
