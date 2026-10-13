import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import z from 'zod'

import { useForgeMutation } from '@lifeforge/api'
import {
  CheckboxField,
  ColorField,
  FileField,
  FormModal,
  convertFormFileFieldData,
  createDefaultValues,
  fileValueSchema,
  getFormFileFieldInitialData
} from '@lifeforge/ui'

import { forgeAPI } from '@/manifest'
import { type PomodoroSettings } from '@/providers/PomodoroSettingsProvider'

const schema = z.object({
  workColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  shortBreakColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  longBreakColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  autoStartBreak: z.boolean(),
  autoStartWork: z.boolean(),
  notificationSound: fileValueSchema
})

export default function SettingsModal({
  onClose,
  data: { initialData }
}: {
  onClose: () => void
  data: {
    initialData: PomodoroSettings
  }
}) {
  const updateMutation = useForgeMutation(forgeAPI.settings.update, {
    action: 'update',
    queryKey: forgeAPI.settings.get.key,
    onSuccess: () => onClose()
  })

  const form = useForm({
    defaultValues: {
      ...createDefaultValues(schema),
      ...initialData,
      notificationSound: getFormFileFieldInitialData(
        forgeAPI,
        initialData,
        initialData.notificationSound
      )
    },
    resolver: zodResolver(schema)
  })

  return (
    <FormModal
      form={form}
      submissionConfig={{
        template: 'update',
        handler: async formData => {
          await updateMutation.mutateAsync({
            ...formData,
            notificationSound: convertFormFileFieldData(
              formData.notificationSound
            )
          })
        }
      }}
      uiConfig={{
        icon: 'tabler:settings',
        namespace: 'apps.pomodoro-timer',
        title: 'Settings',
        onClose
      }}
    >
      <ColorField
        control={form.control}
        icon="tabler:flame"
        label="workColor"
        name="workColor"
      />
      <ColorField
        control={form.control}
        icon="tabler:coffee"
        label="shortBreakColor"
        name="shortBreakColor"
      />
      <ColorField
        control={form.control}
        icon="tabler:beach"
        label="longBreakColor"
        name="longBreakColor"
      />
      <CheckboxField
        control={form.control}
        icon="tabler:player-stop"
        label="autoStartBreaks"
        name="autoStartBreak"
      />
      <CheckboxField
        control={form.control}
        icon="tabler:player-skip-forward"
        label="autoStartWork"
        name="autoStartWork"
      />
      <FileField
        control={form.control}
        icon="tabler:bell"
        label="notificationSound"
        mimeTypes={{ audio: ['mpeg', 'mp3', 'wav', 'ogg', 'webm'] }}
        name="notificationSound"
      />
    </FormModal>
  )
}
