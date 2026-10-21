// SPDX-License-Identifier: 0BSD
import { type Dispatch, type SetStateAction, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { EndpointClient } from '@monolith/api'

import { Button, TextInput } from '@/components/inputs'
import { Stack, Text } from '@/components/primitives'

import { useCredentialAction } from '../../useCredentialAction'
import { protectPassword } from '../password'
import { PasswordPanel } from './PasswordPanel'

export function LockedScreen({
  challengeController,
  verifyController,
  onRecoveryRequested,
  setMasterPassword
}: {
  challengeController: EndpointClient
  verifyController: EndpointClient
  onRecoveryRequested?: () => void
  setMasterPassword: Dispatch<SetStateAction<string>>
}) {
  const { t } = useTranslation('common.vault')
  const [password, setPassword] = useState('')
  const action = useCredentialAction()
  async function unlock() {
    if (!password.trim()) return
    const submitted = password
    await action.run(async active => {
      const payload = await protectPassword(submitted, challengeController)
      if (!active()) return
      if ((await verifyController.mutate(payload as never)) !== true)
        throw new Error('Unlock rejected')
      if (!active()) return
      setPassword('')
      setMasterPassword(submitted)
    })
  }
  return (
    <PasswordPanel
      title={t('vault.lockedMessage')}
      description={t('vault.passwordRequired')}
      icon="tabler:lock"
    >
      <Stack
        as="form"
        gap="md"
        aria-busy={action.pending}
        onSubmit={event => {
          event.preventDefault()
          void unlock()
        }}
      >
        <TextInput
          isPassword
          autoComplete="current-password"
          label="vault.inputs.masterPassword"
          namespace="common.vault"
          placeholder="••••••••"
          value={password}
          disabled={action.pending}
          onChange={value => {
            setPassword(value)
            action.clearError()
          }}
        />
        {action.failed && (
          <Text role="alert" color="dangerous">
            {t('vault.failedToUnlock')}
          </Text>
        )}
        <Button
          type="submit"
          icon="tabler:lock-open"
          loading={action.pending}
          disabled={!password.trim()}
          namespace="common.vault"
        >
          vault.buttons.unlock
        </Button>
        {onRecoveryRequested && (
          <Button
            type="button"
            variant="plain"
            namespace="common.vault"
            disabled={action.pending}
            onClick={() => {
              setPassword('')
              onRecoveryRequested()
            }}
          >
            vault.buttons.recoverAccount
          </Button>
        )}
      </Stack>
    </PasswordPanel>
  )
}
