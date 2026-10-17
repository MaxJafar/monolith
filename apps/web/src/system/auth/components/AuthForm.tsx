import { type FormEvent, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import { useAuth } from '@monolith/api'
import { Stack, TextInput, toast, useModalStore } from '@monolith/ui'

import workspaceAPI from '@/core/utils/workspaceAPI'

import TwoFAModal from '../modals/TwoFAModal'
import SignInOptions from './SignInOptions'

export default function AuthForm({ providers }: { providers: string[] }) {
  const { authenticate, auth } = useAuth()
  const { open } = useModalStore()
  const { t } = useTranslation('common.auth')
  const [parameters] = useSearchParams()
  const [identity, setIdentity] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState<string | null>(null)
  const lock = useRef(false)
  const returning = Boolean(parameters.get('code') && parameters.get('state'))
  const disabled = auth || returning || pending !== null

  async function run(kind: string, action: () => Promise<boolean | void>) {
    if (lock.current || disabled) return
    lock.current = true
    setPending(kind)
    let navigating = false
    try {
      navigating = (await action()) === true
    } catch {
      toast.error(t('messages.invalidLoginAttempt'))
    } finally {
      if (!navigating) {
        lock.current = false
        setPending(null)
      }
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!identity.trim() || !password) {
      toast.error(t('messages.invalidFields'))
      return
    }
    void run('password', async () => {
      const result = await authenticate({ email: identity.trim(), password })
      if (result === '2fa_required') open(TwoFAModal, {})
      else if (result === 'invalid')
        toast.error(t('messages.invalidCredentials'))
      else if (result?.startsWith('success')) {
        toast.success(
          t('messages.welcomeBack', {
            name: result.replace(/^success:?\s*/, '')
          })
        )
      } else throw new Error('Sign-in did not finish')
    })
  }

  function authorize(provider: string) {
    void run(provider, async () => {
      const authorization = await workspaceAPI.auth.oauth.authorize
        .input({ provider })
        .queryRaw()
      const destination = new URL(authorization.url)
      if (!['https:', 'http:'].includes(destination.protocol))
        throw new Error('Invalid authorization address')
      sessionStorage.setItem('oauthState', authorization.state)
      sessionStorage.setItem('oauthProvider', provider)
      window.location.assign(destination.href)
      return true
    })
  }

  return (
    <Stack
      as="form"
      aria-busy={pending !== null}
      maxWidth={{ sm: '70%' }}
      mt={{ base: 'lg', sm: '2xl' }}
      onSubmit={submit}
    >
      <TextInput
        autoComplete="username"
        disabled={disabled}
        icon="tabler:user"
        label="emailOrUsername"
        name="username"
        namespace="common.auth"
        placeholder={t('inputs.emailOrUsername.placeholder')}
        value={identity}
        onChange={setIdentity}
      />
      <TextInput
        isPassword
        autoComplete="current-password"
        disabled={disabled}
        icon="tabler:key"
        label="password"
        name="password"
        namespace="common.auth"
        placeholder={t('inputs.password.placeholder')}
        value={password}
        onChange={setPassword}
      />
      <SignInOptions
        disabled={disabled}
        pending={pending}
        providers={providers}
        onProvider={authorize}
      />
    </Stack>
  )
}
