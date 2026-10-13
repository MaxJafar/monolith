import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useParams } from 'react-router'
import z from 'zod'

import type { InferOutput } from '@lifeforge/api'
import { useModuleTranslation } from '@lifeforge/localization'
import {
  FileField,
  FormModal,
  ListboxField,
  TextAreaField,
  TextField,
  convertFormFileFieldData,
  createDefaultValues,
  fileValueSchema,
  getFormFileFieldInitialData,
  toast
} from '@lifeforge/ui'

import { forgeAPI } from '@/manifest'

const schema = z
  .object({
    type: z.enum(['text', 'link', 'image']),
    content: z.string(),
    link: z.string(),
    image: fileValueSchema,
    folder: z.string(),
    container: z.string(),
    tags: z.array(z.string())
  })
  .superRefine((data, ctx) => {
    if (data.type === 'text' && !data.content.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Content is required',
        path: ['content']
      })
    }

    if (data.type === 'link' && !data.link.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Link is required',
        path: ['link']
      })
    }
  })

function ModifyIdeaModal({
  data: { type, initialData },
  onClose
}: {
  data: {
    type: 'create' | 'update'
    initialData?: Partial<InferOutput<typeof forgeAPI.ideas.list>[number]> & {
      isPasted?: boolean
    }
  }
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const { t } = useModuleTranslation()
  const { id, '*': path } = useParams<{ id: string; '*': string }>()

  const tagsQuery = useQuery(
    forgeAPI.tags.list
      .input({
        container: id || ''
      })
      .queryOptions()
  )

  const mutation = useMutation(
    (type === 'create'
      ? forgeAPI.ideas.create
      : forgeAPI.ideas.update.input({
          id: initialData?.id || ''
        })
    ).mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['ideaBox', 'ideas']
        })
        queryClient.invalidateQueries({
          queryKey: ['ideaBox', 'misc', 'search']
        })
      },
      onError: error => {
        toast.error('Failed to modify idea:', error)
      }
    })
  )

  const initialImage =
    initialData && 'image' in initialData
      ? (initialData.image as string | File | null | undefined)
      : undefined

  const form = useForm({
    defaultValues: {
      ...createDefaultValues(schema),
      type: (initialData?.type as 'text' | 'link' | 'image') ?? 'text',
      content: initialData?.type === 'text' ? initialData.content || '' : '',
      link: initialData?.type === 'link' ? initialData.link || '' : '',
      image: getFormFileFieldInitialData(forgeAPI, initialData, initialImage),
      tags:
        initialData?.tags?.map(
          tag => tagsQuery.data?.find(t => t.name === tag)?.id || tag
        ) || []
    },
    resolver: zodResolver(schema)
  })

  const watchedType = useWatch({ control: form.control, name: 'type' })

  const typeOptions = [
    {
      value: 'text' as const,
      text: t('entryType.text'),
      icon: 'tabler:text-size'
    },
    { value: 'link' as const, text: t('entryType.link'), icon: 'tabler:link' },
    {
      value: 'image' as const,
      text: t('entryType.image'),
      icon: 'tabler:photo'
    }
  ]

  const tagOptions = (tagsQuery.data || []).map(tag => ({
    text: tag.name,
    value: tag.id,
    icon: tag.icon || 'tabler:tag',
    color: tag.color || 'gray'
  }))

  useEffect(() => {
    if (initialData?.isPasted && mutation.isIdle) {
      mutation
        .mutateAsync({
          type: 'image',
          folder: path?.split('/').pop() ?? '',
          container: id ?? '',
          tags: initialData.tags || [],
          image: initialImage instanceof File ? initialImage : undefined
        })
        .then(() => {
          onClose()
        })
    }
  }, [initialData])

  return (
    <FormModal
      form={form}
      submissionConfig={{
        template: type,
        handler: async formData => {
          const tags =
            formData.tags.map(
              tag => tagsQuery.data?.find(t => t.id === tag)?.name || tag
            ) || []

          const payload = {
            folder: path?.split('/').pop() ?? '',
            container: id ?? '',
            tags,
            image: convertFormFileFieldData(formData.image)
          }

          switch (formData.type) {
            case 'text':
              await mutation.mutateAsync({
                ...payload,
                type: 'text',
                content: formData.content.trim()
              })
              break
            case 'link':
              await mutation.mutateAsync({
                ...payload,
                type: 'link',
                link: formData.link.trim()
              })
              break
            case 'image':
              await mutation.mutateAsync({ ...payload, type: 'image' })
          }
        }
      }}
      uiConfig={{
        icon: type === 'create' ? 'tabler:plus' : 'tabler:pencil',
        title: `idea.${type}`,
        namespace: 'apps.ideaBox',
        loading: tagsQuery.isLoading,
        onClose
      }}
    >
      <ListboxField
        required
        control={form.control}
        disabled={type === 'update'}
        icon="tabler:category"
        label="ideaType"
        name="type"
        options={typeOptions}
      />
      {watchedType === 'text' && (
        <TextAreaField
          required
          control={form.control}
          icon="tabler:text-wrap"
          label="ideaContent"
          name="content"
          placeholder="Idea content"
        />
      )}
      {watchedType === 'link' && (
        <TextField
          required
          control={form.control}
          icon="tabler:link"
          label="ideaLink"
          name="link"
          placeholder="https://example.com/your-idea"
        />
      )}
      {watchedType === 'image' && (
        <FileField
          control={form.control}
          icon="tabler:photo"
          label="ideaImage"
          name="image"
          sources={{ url: true }}
        />
      )}
      <ListboxField
        multiple
        control={form.control}
        icon="tabler:tags"
        label="ideaTags"
        name="tags"
        options={tagOptions}
      />
    </FormModal>
  )
}

export default ModifyIdeaModal
