import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { FormModal, TextField, toast } from '@monolith/ui'

import workspaceAPI from '@/core/utils/workspaceAPI'

import { passwordSchema } from '../profile'

export default function ChangePasswordModal({
  onClose
}: {
  onClose: () => void
}) {
  const { t } = useTranslation('common.account-settings')
  const form = useForm({
    defaultValues: { oldPassword: '', password: '', passwordConfirm: '' },
    resolver: zodResolver(
      passwordSchema({
        required: t('validation.required'),
        length: t('validation.passwordLength'),
        mismatch: t('validation.passwordMismatch')
      })
    )
  })
  const fields = [
    {
      name: 'oldPassword',
      label: 'currentPassword',
      icon: 'tabler:lock',
      autocomplete: 'current-password'
    },
    {
      name: 'password',
      label: 'newPassword',
      icon: 'tabler:lock-open',
      autocomplete: 'new-password'
    },
    {
      name: 'passwordConfirm',
      label: 'confirmPassword',
      icon: 'tabler:lock-check',
      autocomplete: 'new-password'
    }
  ] as const

  return (
    <FormModal
      form={form}
      uiConfig={{
        title: 'changePassword.title',
        icon: 'tabler:key',
        namespace: 'common.account-settings',
        onClose
      }}
      submissionConfig={{
        template: 'update',
        handler: async values => {
          await workspaceAPI.user.settings.updatePassword.mutateRaw(values)
          form.reset()
          toast.success(t('messages.passwordSaved'))
        }
      }}
    >
      {fields.map(field => (
        <TextField
          key={field.name}
          control={form.control}
          name={field.name}
          label={field.label}
          icon={field.icon}
          autoComplete={field.autocomplete}
          placeholder=""
          required
          isPassword
          disabled={form.formState.isSubmitting}
        />
      ))}
    </FormModal>
  )
}
