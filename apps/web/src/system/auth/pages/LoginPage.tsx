import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import { useAuth } from '@monolith/api'
import { ModalManager, Stack, toast, useModalStore } from '@monolith/ui'

import workspaceAPI from '@/core/utils/workspaceAPI'

import AuthFooter from '../components/AuthFooter'
import AuthForm from '../components/AuthForm'
import AuthHeader from '../components/AuthHeader'
import AuthSideImage from '../components/AuthSideImage'
import TwoFAModal from '../modals/TwoFAModal'

export default function LoginPage() {
  const { open } = useModalStore()
  const { verifyOAuth } = useAuth()
  const { t } = useTranslation('common.auth')
  const [parameters, setParameters] = useSearchParams()

  const callback = useRef<{
    identity: string
    result: Promise<string | false>
  } | null>(null)
  const code = parameters.get('code')
  const state = parameters.get('state')
  const providerError = parameters.get('error')
  const providers = useQuery({
    queryKey: workspaceAPI.auth.oauth.providers.listEnabled.key,
    queryFn: () => workspaceAPI.auth.oauth.providers.listEnabled.query()
  })

  useEffect(() => {
    if ((!code || !state) && !providerError) return
    let active = true

    const identity = JSON.stringify([code, state, providerError])

    if (callback.current?.identity !== identity) {
      callback.current = {
        identity,
        result:
          code && state && !providerError
            ? verifyOAuth(code, state)
            : Promise.resolve(false)
      }
    }
    void callback.current.result
      .catch(() => false as const)
      .then(result => {
        if (!active) return
        setParameters(
          previous => {
            const next = new URLSearchParams(previous)

            for (const key of ['code', 'state', 'error', 'error_description'])
              next.delete(key)

            return next
          },
          { replace: true }
        )
        if (result === '2fa_required') open(TwoFAModal, {})
        else if (result && result.startsWith('success')) {
          toast.success(
            t('messages.welcomeBack', {
              name: result.replace(/^success:?\s*/, '')
            })
          )
        } else toast.error(t('messages.invalidLoginAttempt'))
      })

    return () => {
      active = false
    }
  }, [code, state, providerError, verifyOAuth, open, t, setParameters])

  return (
    <>
      <Stack
        as="section"
        overflowY="auto"
        pb="lg"
        pt="2xl"
        px={{ base: 'xl', sm: '2xl' }}
        width={{ base: '100%', lg: '50%' }}
      >
        <Stack centered height="100%">
          <AuthHeader />
          <AuthForm
            providers={(providers.data ?? []).map(
              provider => provider.provider
            )}
          />
        </Stack>
        <AuthFooter />
      </Stack>
      <AuthSideImage />
      <ModalManager />
    </>
  )
}
