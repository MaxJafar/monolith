import { type ReactNode, useId, useState } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import {
  Button,
  ConfirmationModal,
  Flex,
  ModalHeader,
  Stack,
  Text,
  useModalStore
} from '@monolith/ui'

import type { FinanceState } from '../FinanceProvider'

export type SaveResult = { ok: true } | { ok: false; error: string }

/** What every editor receives: the provider's state at the moment it opened. */
export type EditorData<T = undefined, P = undefined> = {
  finance: FinanceState
  item?: T
  preset?: P
}

/**
 * The dialog frame shared by every editor: a heading, the fields, an inline
 * error that keeps the draft, and a save that disables itself while writing.
 */
export function EditorShell({
  title,
  icon,
  onClose,
  onSave,
  canSave,
  onDelete,
  deleteLabel,
  children,
  saveLabel = 'save',
  wide = false
}: {
  title: string
  icon: string
  onClose: () => void
  onSave: () => Promise<SaveResult>
  canSave: boolean
  onDelete?: () => Promise<SaveResult>
  deleteLabel?: string
  children: ReactNode
  saveLabel?: string
  wide?: boolean
}) {
  const { t } = useModuleTranslation()
  const { open } = useModalStore()
  const id = useId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function attempt(action: () => Promise<SaveResult>) {
    setBusy(true)
    setError('')

    const result = await action()

    setBusy(false)
    if (result.ok) onClose()
    else setError(result.error)
  }

  return (
    <Stack
      aria-labelledby={id}
      as="form"
      className="monolith-form-dialog finance-editor"
      data-wide={wide || undefined}
      gap="md"
      role="dialog"
      onSubmit={event => {
        event.preventDefault()
        if (canSave && !busy) void attempt(onSave)
      }}
    >
      <ModalHeader
        icon={icon}
        namespace={false}
        title={title}
        titleId={id}
        onClose={onClose}
      />
      {children}
      {error && (
        <Text color="dangerous" role="alert">
          {error}
        </Text>
      )}
      <Flex align="center" gap="sm" justify="between" wrap="wrap">
        <div>
          {onDelete && (
            <Button
              dangerous
              disabled={busy}
              icon="tabler:trash"
              variant="plain"
              onClick={() =>
                open(ConfirmationModal, {
                  title: t('messages.deleteTitle'),
                  description: deleteLabel ?? t('messages.deleteBody'),
                  confirmationButton: 'delete',
                  onConfirm: async () => {
                    const result = await onDelete()

                    if (!result.ok) throw new Error(result.error)
                    onClose()
                  }
                })
              }
            >
              delete
            </Button>
          )}
        </div>
        <Flex gap="sm">
          <Button disabled={busy} variant="secondary" onClick={onClose}>
            cancel
          </Button>
          <Button
            disabled={!canSave}
            icon="tabler:check"
            loading={busy}
            type="submit"
          >
            {saveLabel}
          </Button>
        </Flex>
      </Flex>
    </Stack>
  )
}

/** Run a write through the provider and report its outcome to the dialog. */
export async function save<T>(
  finance: FinanceState,
  operation: () => Promise<T>
): Promise<SaveResult> {
  const result = await finance.run(operation, { quiet: true })

  return result.ok ? { ok: true } : { ok: false, error: result.error }
}

/** A two-column field grid that collapses on phones. */
export function Fields({ children }: { children: ReactNode }) {
  return <div className="finance-fields">{children}</div>
}
