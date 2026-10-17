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
      uiConfig={{
        title: 'apiKey.' + data.type,
        namespace: 'common.api-keys',
        icon: 'tabler:key',
        onClose
      }}
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
    >
      <TextField
        control={form.control}
        name="keyId"
        icon="tabler:id"
        label="keyId"
        placeholder=""
        required
        disabled={form.formState.isSubmitting}
        autoComplete="off"
      />
      <TextField
        control={form.control}
        name="name"
        icon="tabler:key"
        label="keyName"
        placeholder=""
        required
        disabled={form.formState.isSubmitting}
      />
      <IconField control={form.control} name="icon" label="keyIcon" required />
      {!creating && (
        <CheckboxField
          control={form.control}
          name="overrideKey"
          icon="tabler:refresh"
          label="overrideKey"
        />
      )}
      {(creating || replacing) && (
        <TextField
          control={form.control}
          name="key"
          icon="tabler:lock"
          label="apiKey"
          placeholder=""
          required
          isPassword
          autoComplete="new-password"
          disabled={form.formState.isSubmitting}
        />
      )}
      <CheckboxField
        control={form.control}
        name="exposable"
        icon="tabler:world"
        label="isExposable"
      />
    </FormModal>
  )
}
