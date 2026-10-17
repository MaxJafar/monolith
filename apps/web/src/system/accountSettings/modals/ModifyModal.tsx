import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { useAuth } from '@monolith/api'
import { FormModal, TextField, toast } from '@monolith/ui'

import workspaceAPI from '@/core/utils/workspaceAPI'

import { type ProfileField, profileFields, profileSchema } from '../profile'

export default function ModifyModal({
  data: { id },
  onClose
}: {
  data: { id: ProfileField }
  onClose: () => void
}) {
  const { userData, setUserData } = useAuth()
  const { t } = useTranslation('common.account-settings')

  const field = profileFields.find(item => item.id === id)!
  const raw = userData?.[id]
  const form = useForm({
    defaultValues: {
      value: raw
        ? String(raw).slice(0, id === 'dateOfBirth' ? 10 : undefined)
        : ''
    },
    resolver: zodResolver(
      profileSchema(
        id,
        t('validation.profile', { field: t('settings.title.' + field.label) })
      )
    )
  })

  return (
    <FormModal
      form={form}
      submissionConfig={{
        template: 'update',
        handler: async ({ value }) => {
          await workspaceAPI.user.settings.updateProfile.mutateRaw({
            data: { [id]: value }
          })
          setUserData(current =>
            current ? { ...current, [id]: value } : current
          )
          toast.success(t('messages.profileSaved'))
        }
      }}
      uiConfig={{
        title: field.label + '.update',
        icon: field.icon,
        namespace: 'common.account-settings',
        onClose
      }}
    >
      <TextField
        required
        autoComplete={id === 'dateOfBirth' ? 'bday' : id}
        control={form.control}
        disabled={form.formState.isSubmitting}
        icon={field.icon}
        label={field.label}
        name="value"
        placeholder=""
        type={field.type}
      />
    </FormModal>
  )
}
