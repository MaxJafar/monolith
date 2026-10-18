import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import z from 'zod'

import { useApiMutation } from '@monolith/api'
import {
  DateField,
  FormModal,
  ListboxField,
  LocationField,
  RRuleField,
  TextAreaField,
  TextField,
  createDefaultValues
} from '@monolith/ui'

import { workspaceAPI } from '@/manifest'
import { getRRuleStart, setRRuleStart } from '@/utils/recurrence'

import type { CalendarEvent } from '../Calendar'

const schema = z
  .object({
    title: z.string().min(1, 'Event title is required'),
    category: z.string().min(1, 'Category is required'),
    calendar: z.string().min(1, 'Calendar is required'),
    location: z
      .object({
        name: z.string(),
        formattedAddress: z.string(),
        location: z.object({
          latitude: z.number(),
          longitude: z.number()
        })
      })
      .optional(),
    reference_link: z.string().optional(),
    description: z.string().optional(),
    type: z.enum(['single', 'recurring']),
    start: z.date().optional(),
    end: z.date().optional(),
    rrule: z.string().optional()
  })
  .superRefine((value, ctx) => {
    if (value.type === 'single') {
      if (!value.start)
        ctx.addIssue({
          code: 'custom',
          path: ['start'],
          message: 'Start time is required'
        })
      if (!value.end || (value.start && value.end < value.start))
        ctx.addIssue({
          code: 'custom',
          path: ['end'],
          message: 'End time must be on or after start'
        })
    } else if (!value.rrule) {
      ctx.addIssue({
        code: 'custom',
        path: ['rrule'],
        message: 'A recurring rule is required'
      })
    }
  })

function ModifyEventModal({
  data: { type, initialData },
  onClose
}: {
  data: {
    type: 'create' | 'update'
    initialData?: Partial<CalendarEvent>
  }
  onClose: () => void
}) {
  const calendarsQuery = useQuery(workspaceAPI.calendars.list.queryOptions())
  const categoriesQuery = useQuery(workspaceAPI.categories.list.queryOptions())

  const createMutation = useApiMutation(workspaceAPI.events.create, {
    action: 'create',
    queryKey: workspaceAPI.key
  })

  const updateMutation = useApiMutation(
    workspaceAPI.events.update.input({
      id: initialData?.id?.replace(/-\d{8}_\d{2}:\d{2}:\d{2}$/, '') || ''
    }),
    { action: 'update', queryKey: workspaceAPI.key }
  )

  const form = useForm({
    defaultValues: (() => {
      if (!initialData) return createDefaultValues(schema)

      const base: Record<string, unknown> = {
        title: initialData.title,
        category: initialData.category,
        calendar: initialData.calendar,
        location: initialData.location
          ? {
              name: initialData.location || '',
              location: {
                longitude: initialData.location_coords?.lon || 0,
                latitude: initialData.location_coords?.lat || 0
              },
              formattedAddress: initialData.location || ''
            }
          : undefined,
        reference_link: initialData.reference_link,
        description: initialData.description,
        type: initialData.type
      }

      if (initialData.type === 'recurring') {
        base.rrule = initialData.rrule
      } else {
        base.start = initialData.start
          ? dayjs(initialData.start).toDate()
          : undefined
        base.end = initialData.end ? dayjs(initialData.end).toDate() : undefined
      }

      return { ...createDefaultValues(schema), ...base }
    })(),
    mode: 'all',
    resolver: zodResolver(schema)
  })

  const eventType = useWatch({ control: form.control, name: 'type' })

  const isRecurring = eventType === 'recurring'

  useEffect(() => {
    const { unsubscribe } = form.watch((_, { name }) => {
      if (name !== 'type') return

      if (form.getValues('type') === 'recurring') {
        const start = form.getValues('start')

        if (start) {
          form.setValue(
            'rrule',
            setRRuleStart(form.getValues('rrule') ?? '', start)
          )
        }
      } else {
        const rrule = form.getValues('rrule')

        if (rrule) {
          const start = getRRuleStart(rrule)

          if (start) {
            form.setValue('start', start)
          }
        }
      }
    })

    return unsubscribe
  }, [form])

  return (
    <FormModal
      form={form}
      submissionConfig={{
        handler: async data => {
          if (data.type === 'recurring') {
            await (
              type === 'create' ? createMutation : updateMutation
            ).mutateAsync({
              ...(type === 'update'
                ? { expected_updated: initialData?.updated }
                : {}),
              title: data.title,
              category: data.category,
              calendar: data.calendar,
              location: data.location ?? undefined,
              reference_link: data.reference_link ?? '',
              description: data.description ?? '',
              type: 'recurring' as const,
              rrule: data.rrule ?? ''
            })
          } else {
            await (
              type === 'create' ? createMutation : updateMutation
            ).mutateAsync({
              ...(type === 'update'
                ? { expected_updated: initialData?.updated }
                : {}),
              title: data.title,
              category: data.category,
              calendar: data.calendar,
              location: data.location ?? undefined,
              reference_link: data.reference_link ?? '',
              description: data.description ?? '',
              type: 'single' as const,
              start: data.start!.toISOString(),
              end: data.end!.toISOString()
            })
          }
        },
        template: type
      }}
      uiConfig={{
        icon: {
          create: 'tabler:plus',
          update: 'tabler:pencil'
        }[type],
        loading:
          categoriesQuery.status === 'pending' ||
          calendarsQuery.status === 'pending',

        title: `event.${type}`,
        onClose
      }}
    >
      <TextField
        required
        control={form.control}
        icon="tabler:calendar"
        label="Event title"
        name="title"
        placeholder="My event"
      />
      <ListboxField
        required
        control={form.control}
        icon="tabler:list"
        label="Event Category"
        name="category"
        options={
          categoriesQuery.isSuccess
            ? categoriesQuery.data?.map(({ name, color, icon, id }) => ({
                value: id,
                text: name,
                icon,
                color
              }))
            : []
        }
      />
      <ListboxField
        required
        control={form.control}
        icon="tabler:calendar"
        label="Calendar"
        name="calendar"
        options={
          calendarsQuery.isSuccess
            ? calendarsQuery.data?.map(({ name, color, id }) => ({
                value: id,
                text: name,
                color
              }))
            : []
        }
      />
      <LocationField control={form.control} label="Location" name="location" />
      <TextField
        control={form.control}
        icon="tabler:link"
        label="Reference link"
        name="reference_link"
        placeholder="https://example.com"
      />
      <TextAreaField
        control={form.control}
        icon="tabler:file-text"
        label="Description"
        name="description"
        placeholder="Event description"
      />
      <ListboxField
        required
        control={form.control}
        disabled={type === 'update'}
        icon="tabler:calendar"
        label="Event Type"
        name="type"
        options={[
          {
            value: 'single',
            text: 'Single Event',
            icon: 'tabler:calendar'
          },
          {
            value: 'recurring',
            text: 'Recurring Event',
            icon: 'tabler:repeat'
          }
        ]}
      />
      {isRecurring ? (
        <RRuleField hasDuration control={form.control} name="rrule" />
      ) : (
        <>
          <DateField
            hasTime
            control={form.control}
            icon="tabler:clock"
            label="Start Time"
            name="start"
          />
          <DateField
            hasTime
            control={form.control}
            icon="tabler:clock"
            label="End Time"
            name="end"
          />
        </>
      )}
    </FormModal>
  )
}

export default ModifyEventModal
