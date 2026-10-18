import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { useAuth } from '@monolith/api'
import { ConfirmationModal, toast } from '@monolith/ui'

import workspaceAPI from '@/core/utils/workspaceAPI'

export default function DisableTwoFAModal({
  onClose
}: {
  onClose: () => void
}) {
  const { setUserData } = useAuth()
  const { t } = useTranslation('common.account-settings')
  const inFlight = useRef<Promise<void> | null>(null)

  function disable() {
    if (inFlight.current) return inFlight.current
    inFlight.current = workspaceAPI.auth['2fa'].disable
      .mutateRaw(undefined)
      .then(() => {
        setUserData(current =>
          current ? { ...current, twoFAEnabled: false } : current
        )
        toast.success(t('messages.twoFA.disableSuccess'))
      })
      .catch(error => {
        toast.error(t('messages.twoFA.disableFailed'))
        throw error
      })
      .finally(() => {
        inFlight.current = null
      })

    return inFlight.current
  }

  return (
    <ConfirmationModal
      data={{
        title: t('modals.disable2FA.title'),
        description: t('modals.disable2FA.description'),
        confirmationButton: 'confirm',
        onConfirm: disable
      }}
      onClose={onClose}
    />
  )
}
