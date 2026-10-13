import type { Session } from '@'
import { zodResolver } from '@hookform/resolvers/zod'
import dayjs from 'dayjs'
import { useForm } from 'react-hook-form'
import z from 'zod'

import { useForgeMutation } from '@lifeforge/api'
import {
  FormModal,
  SliderField,
  TextField,
  createDefaultValues
} from '@lifeforge/ui'

import DEFAULT_OPTIONS from '@/constants/default_durations'
import { forgeAPI } from '@/manifest'

const schema = z.object({
  name: z.string().min(1, 'Required'),
  workDuration: z.number().min(1).max(120),
  shortBreakDuration: z.number().min(1).max(60),
  longBreakDuration: z.number().min(1).max(120),
  sessionUntilLongBreak: z.number().min(1).max(10)
})

function ModifySessionModal({
  onClose,
  data: { openType, initialData }
}: {
  onClose: () => void
  data: {
    openType: 'create' | 'update'
    initialData?: Session
  }
}) {
  const createMutation = useForgeMutation(forgeAPI.sessions.create, {
    action: 'create',
    queryKey: forgeAPI.sessions.list.key
  })

  const updateMutation = useForgeMutation(
    forgeAPI.sessions.update.input({ id: initialData?.id || '' }),
    {
      action: 'update',
      queryKey: forgeAPI.sessions.list.key
    }
  )

  const form = useForm({
    defaultValues: {
      ...createDefaultValues(schema),
      ...(initialData ?? {
        name: `Productive Session on ${dayjs().format('MMM D')}`,
        workDuration: DEFAULT_OPTIONS.work,
        shortBreakDuration: DEFAULT_OPTIONS.short_break,
        longBreakDuration: DEFAULT_OPTIONS.long_break,
        sessionUntilLongBreak: DEFAULT_OPTIONS.sessionUntilLongBreak
      })
    },
    resolver: zodResolver(schema)
  })

  return (
    <FormModal
      form={form}
      submissionConfig={{
        template: openType,
        handler: async data => {
          await (
            openType === 'create' ? createMutation : updateMutation
          ).mutateAsync(data)
        }
      }}
      uiConfig={{
        icon: openType === 'create' ? 'tabler:plus' : 'tabler:pencil',
        namespace: 'apps.pomodoro-timer',
        title: `session.${openType}`,
        onClose
      }}
    >
      <TextField
        autoFocus
        required
        control={form.control}
        icon="tabler:tag"
        label="Session Name"
        name="name"
        placeholder="My Productive Session"
      />
      {openType === 'create' && (
        <>
          <SliderField
            required
            control={form.control}
            icon="tabler:flame"
            label="Work Duration"
            max={120}
            min={1}
            name="workDuration"
          />
          <SliderField
            required
            control={form.control}
            icon="tabler:coffee"
            label="Short Break Duration"
            max={60}
            min={1}
            name="shortBreakDuration"
          />
          <SliderField
            required
            control={form.control}
            icon="tabler:beach"
            label="Long Break Duration"
            max={120}
            min={1}
            name="longBreakDuration"
          />
          <SliderField
            required
            control={form.control}
            icon="tabler:rotate-clockwise-2"
            label="Sessions Until Long Break"
            max={10}
            min={1}
            name="sessionUntilLongBreak"
          />
        </>
      )}
    </FormModal>
  )
}

export default ModifySessionModal
