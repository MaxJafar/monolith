import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { Alert, FormModal, Text, TextField, toast } from '@monolith/ui'

import workspaceAPI from '@/core/utils/workspaceAPI'

export default function ModifyOAuthProviderModal({
  data,
  onClose
}: {
  data: { type: 'create' | 'update'; provider: string }
  onClose: () => void
}) {
  const { t } = useTranslation('common.account-settings')
  const cache = useQueryClient()

  const creating = data.type === 'create'
  const schema = z
    .object({
      clientId: z.string().trim().max(255),
      clientSecret: z.string().max(255)
    })
    .superRefine((value, context) => {
      for (const name of ['clientId', 'clientSecret'] as const) {
        if (creating && !value[name])
          context.addIssue({
            code: 'custom',
            path: [name],
            message: t('validation.required')
          })
      }

      if (!creating && !value.clientId && !value.clientSecret) {
        context.addIssue({
          code: 'custom',
          path: ['clientId'],
          message: t('validation.credentialChange')
        })
      }
    })
  const form = useForm({
    defaultValues: { clientId: '', clientSecret: '' },
    resolver: zodResolver(schema)
  })

  return (
    <FormModal
      form={form}
      submissionConfig={{
        template: data.type,
        handler: async values => {
          await workspaceAPI.auth.oauth.providers.upsert
            .input({ provider: data.provider })
            .mutateRaw(values)
          await cache.invalidateQueries({
            queryKey: workspaceAPI.auth.oauth.key
          })
          form.reset()
          toast.success(t('messages.oauth.saved'))
        }
      }}
      uiConfig={{
        title: 'oauthProvider.' + data.type,
        icon: 'tabler:login',
        namespace: 'common.account-settings',
        onClose
      }}
    >
      <Text as="h3" weight="medium">
        {data.provider}
      </Text>
      {!creating && (
        <Alert type="caution">{t('messages.oauth.keepBlank')}</Alert>
      )}
      <TextField
        autoComplete="off"
        control={form.control}
        disabled={form.formState.isSubmitting}
        icon="tabler:key"
        label="oauthProvider.clientId"
        name="clientId"
        placeholder=""
        required={creating}
      />
      <TextField
        isPassword
        autoComplete="new-password"
        control={form.control}
        disabled={form.formState.isSubmitting}
        icon="tabler:lock"
        label="oauthProvider.clientSecret"
        name="clientSecret"
        placeholder=""
        required={creating}
      />
    </FormModal>
  )
}
