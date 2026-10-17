import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import {
  CheckboxField,
  FormModal,
  IconField,
  TextField,
  toast
} from '@monolith/ui'

import workspaceAPI from '@/core/utils/workspaceAPI'

import type { APIKeyEntry } from '..'
import { credentialSchema } from '../model'

export default function ModifyAPIKeyModal({
  data,
  onClose
}: {
  data: { type: 'create' | 'update'; initialData?: APIKeyEntry }
  onClose: () => void
}) {
  const { t } = useTranslation('common.api-keys')
  const cache = useQueryClient()

  const creating = data.type === 'create'
  const initial = data.initialData
  const form = useForm({
    defaultValues: {
      keyId: initial?.keyId ?? '',
      name: initial?.name ?? '',
      icon: initial?.icon ?? 'tabler:key',
      exposable: initial?.exposable ?? false,
      overrideKey: false,
      key: ''
    },
    resolver: zodResolver(
      credentialSchema(creating, {
        id: t('validation.id'),
        required: t('validation.required')
      })
    )
  })

  const replacing = useWatch({ control: form.control, name: 'overrideKey' })

  return (
    <FormModal
      form={form}
      submissionConfig={{
        template: data.type,
        handler: async values => {
          if (creating) {
            const { overrideKey: _ignored, ...entry } = values
            await workspaceAPI.apiKeys.entries.create.mutateRaw(entry)
          } else {
            if (!initial?.id) throw new Error(t('messages.missingEntry'))
            await workspaceAPI.apiKeys.entries.update
              .input({ id: initial.id })
              .mutateRaw({
                ...values,
                key: replacing ? values.key : ''
              })
          }
          await cache.invalidateQueries({ queryKey: workspaceAPI.apiKeys.key })
          form.reset()
          toast.success(t('messages.saved'))
        }
      }}
      uiConfig={{
        title: 'apiKey.' + data.type,
        namespace: 'common.api-keys',
        icon: 'tabler:key',
        onClose
      }}
    >
      <TextField
        required
        autoComplete="off"
        control={form.control}
        disabled={form.formState.isSubmitting}
        icon="tabler:id"
        label="keyId"
        name="keyId"
        placeholder=""
      />
      <TextField
        required
        control={form.control}
        disabled={form.formState.isSubmitting}
        icon="tabler:key"
        label="keyName"
        name="name"
        placeholder=""
      />
      <IconField required control={form.control} label="keyIcon" name="icon" />
      {!creating && (
        <CheckboxField
          control={form.control}
          icon="tabler:refresh"
          label="overrideKey"
          name="overrideKey"
        />
      )}
      {(creating || replacing) && (
        <TextField
          isPassword
          required
          autoComplete="new-password"
          control={form.control}
          disabled={form.formState.isSubmitting}
          icon="tabler:lock"
          label="apiKey"
          name="key"
          placeholder=""
        />
      )}
      <CheckboxField
        control={form.control}
        icon="tabler:world"
        label="isExposable"
        name="exposable"
      />
    </FormModal>
  )
}
