// SPDX-License-Identifier: 0BSD
import { useMutation } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button, Flex, Stack, Text, TextInput } from '@monolith/ui'

import MonolithLogo from '@/core/components/MonolithLogo'
import workspaceAPI from '@/core/utils/workspaceAPI'

import { initialAccount, validateAccount } from '../utils/initialAccount'

const fields = [
  { key: 'name', icon: 'tabler:user', autocomplete: 'name' },
  { key: 'username', icon: 'tabler:at', autocomplete: 'username' },
  { key: 'email', icon: 'tabler:mail', autocomplete: 'email' },
  { key: 'password', icon: 'tabler:lock', autocomplete: 'new-password' },
  {
    key: 'confirmPassword',
    icon: 'tabler:lock-check',
    autocomplete: 'new-password'
  }
] as const

export default function UserCreationPage() {
  const { t } = useTranslation('common.auth')
  const [draft, setDraft] = useState(initialAccount)
  const [issues, setIssues] = useState<
    Partial<Record<keyof typeof draft, string>>
  >({})
  const submitting = useRef(false)
  const create = useMutation(
    workspaceAPI.user.auth.createFirstUser.mutationOptions()
  )
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    const validation = validateAccount(draft)
    setIssues(validation.errors)
    if (!validation.account) return
    submitting.current = true
    try {
      await create.mutateAsync(validation.account)
      window.location.reload()
    } catch {
      // The mutation state keeps the server error visible while the user edits or retries.
    } finally {
      submitting.current = false
    }
  }
  return (
    <Stack
      as="form"
      onSubmit={submit}
      noValidate
      gap="md"
      width="100%"
      maxWidth="36rem"
      p="lg"
    >
      <Flex align="center" justify="center" gap="sm">
        <MonolithLogo size={36} />
        <Text size="2xl" weight="semibold">
          monolith
        </Text>
      </Flex>
      <Text as="h1" size="3xl" align="center" weight="semibold">
        {t('welcome.header')}
      </Text>
      <Text as="p" color="muted" align="center" mb="md">
        {t('welcome.desc')}
      </Text>
      {fields.map(field => (
        <TextInput
          key={field.key}
          name={field.key}
          autoComplete={field.autocomplete}
          label={field.key}
          namespace="common.auth"
          icon={field.icon}
          placeholder={t('inputs.' + field.key + '.placeholder')}
          required
          disabled={create.isPending}
          type={field.key === 'email' ? 'email' : 'text'}
          isPassword={field.autocomplete === 'new-password'}
          value={draft[field.key]}
          errorMsg={
            issues[field.key] ? t('validation.' + issues[field.key]) : undefined
          }
          onChange={value => {
            setDraft(previous => ({ ...previous, [field.key]: value }))
            setIssues(previous => ({ ...previous, [field.key]: undefined }))
          }}
        />
      ))}
      {create.error && (
        <Text role="alert" color="dangerous">
          {create.error.message}
        </Text>
      )}
      <Button
        type="submit"
        loading={create.isPending}
        icon="tabler:arrow-right"
        iconPosition="end"
        namespace="common.auth"
      >
        {t('buttons.proceed')}
      </Button>
    </Stack>
  )
}
