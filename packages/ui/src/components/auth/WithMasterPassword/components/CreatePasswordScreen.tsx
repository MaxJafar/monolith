// SPDX-License-Identifier: 0BSD
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { EndpointClient } from '@monolith/api'

import { Button, TextInput } from '@/components/inputs'
import { Stack, Text } from '@/components/primitives'

import { useCredentialAction } from '../../useCredentialAction'
import {
  generateVaultPassword,
  passwordIssue,
  protectPassword
} from '../password'
import { PasswordPanel } from './PasswordPanel'

export function CreatePasswordScreen({
  controller,
  challengeController,
  onCreate
}: {
  controller: EndpointClient
  challengeController: EndpointClient
  onCreate?: (data: any) => void
}) {
  const { t } = useTranslation('common.vault')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [review, setReview] = useState(false)
  const [validation, setValidation] = useState('')
  const action = useCredentialAction()
  function proceed() {
    const issue = passwordIssue(password, confirmation)
    setValidation(issue ? t('vault.errors.' + issue) : '')
    if (!issue) setReview(true)
  }
  function generate() {
    try {
      const value = generateVaultPassword()
      setPassword(value)
      setConfirmation(value)
      setValidation('')
    } catch {
      setValidation(t('vault.errors.random'))
    }
  }
  async function save() {
    if (passwordIssue(password, confirmation) || !review) return
    await action.run(async active => {
      const payload = await protectPassword(password, challengeController)
      if (!active()) return
      const result = await controller.mutate(payload as never)
      if (!active()) return
      setPassword('')
      setConfirmation('')
      onCreate?.(result)
      window.location.reload()
    })
  }
  return (
    <PasswordPanel
      title={t('vault.createPassword.title')}
      description={t('vault.createPassword.desc')}
      icon="tabler:shield-lock"
    >
      <Stack
        as="form"
        gap="md"
        aria-busy={action.pending}
        onSubmit={event => {
          event.preventDefault()
          if (review) void save()
          else proceed()
        }}
      >
        <TextInput
          isPassword
          autoComplete="new-password"
          label="vault.inputs.newPassword"
          namespace="common.vault"
          placeholder="••••••••"
          value={password}
          disabled={action.pending || review}
          onChange={setPassword}
          actionButtonProps={{
            icon: 'tabler:dice',
            'aria-label': t('vault.generate'),
            onClick: generate
          }}
        />
        <TextInput
          isPassword
          autoComplete="new-password"
          label="vault.inputs.confirmPassword"
          namespace="common.vault"
          placeholder="••••••••"
          value={confirmation}
          disabled={action.pending || review}
          onChange={setConfirmation}
        />
        {validation && (
          <Text role="alert" color="dangerous">
            {validation}
          </Text>
        )}
        {action.failed && (
          <Text role="alert" color="dangerous">
            {t('vault.errors.create')}
          </Text>
        )}
        {review && (
          <Text role="note">{t('vault.confirmSetNewPassword.desc')}</Text>
        )}
        {review && (
          <Button
            type="button"
            variant="secondary"
            disabled={action.pending}
            namespace="common.vault"
            onClick={() => {
              setReview(false)
              action.clearError()
            }}
          >
            vault.edit
          </Button>
        )}
        <Button type="submit" loading={action.pending} namespace="common.vault">
          {review ? 'vault.confirmCreate' : 'vault.review'}
        </Button>
      </Stack>
    </PasswordPanel>
  )
}
