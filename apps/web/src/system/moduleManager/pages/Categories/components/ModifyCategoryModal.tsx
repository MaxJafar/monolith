import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { type UseFormReturn, useFieldArray, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import {
  Box,
  Button,
  Flex,
  FormModal,
  Stack,
  TextField,
  WithQuery,
  toast
} from '@monolith/ui'

import workspaceAPI from '@/core/utils/workspaceAPI'

import type { Category } from '../model'

type EditorValues = {
  categories: {
    key: string
    translations: { language: string; label: string }[]
  }[]
}
type Options = {
  openType: 'create' | 'update'
  category?: Category
  initialKeys?: string[]
  onSubmit(categories: Category[]): Promise<void> | void
}
const namespace = 'common.module-manager'

function CategoryFields({
  form,
  index,
  canRemove,
  remove
}: {
  form: UseFormReturn<EditorValues>
  index: number
  canRemove: boolean
  remove(): void
}) {
  const { t } = useTranslation(namespace)
  const {
    fields,
    append,
    remove: removeTranslation
  } = useFieldArray({
    control: form.control,
    name: `categories.${index}.translations`
  })
  const available = useQuery(
    workspaceAPI.checkAPIKeys({ keys: 'deepseek' }).queryOptions()
  )
  const [translating, setTranslating] = useState(false)
  const active = useRef(true)
  const generation = useRef(0)
  useEffect(() => {
    generation.current++
  }, [index])
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])
  const disabled = form.formState.isSubmitting || translating
  async function translate() {
    const snapshot = structuredClone(form.getValues(`categories.${index}`))
    if (!snapshot.key.trim() || !snapshot.translations.length) return
    setTranslating(true)
    const requestGeneration = generation.current
    try {
      const result = await workspaceAPI.modules.categories.aiTranslate.mutate({
        key: snapshot.key,
        languages: snapshot.translations.map(row => row.language)
      })
      if (!result) throw new Error(t('categoryEditor.translationFailed'))
      if (
        !active.current ||
        generation.current !== requestGeneration ||
        JSON.stringify(form.getValues(`categories.${index}`)) !==
          JSON.stringify(snapshot)
      )
        return
      for (let row = 0; row < snapshot.translations.length; row++) {
        const language = snapshot.translations[row]!.language
        if (typeof result[language] === 'string')
          form.setValue(
            `categories.${index}.translations.${row}.label`,
            result[language],
            { shouldDirty: true, shouldValidate: true }
          )
      }
    } catch (error) {
      if (active.current)
        toast.error(
          error instanceof Error
            ? error.message
            : t('categoryEditor.translationFailed')
        )
    } finally {
      if (active.current) setTranslating(false)
    }
  }
  return (
    <Stack gap="sm">
      <Flex gap="sm" align="center">
        <TextField
          control={form.control}
          name={`categories.${index}.key`}
          label="categoryKey"
          placeholder="work"
          required
          disabled={disabled}
          icon="tabler:category"
          actionButtonProps={
            available.data
              ? {
                  icon: 'tabler:sparkles',
                  loading: translating,
                  disabled: form.formState.isSubmitting,
                  'aria-label': t('categoryEditor.translate'),
                  onClick: translate
                }
              : undefined
          }
        />
        {canRemove && (
          <Button
            variant="plain"
            dangerous
            icon="tabler:trash"
            disabled={disabled}
            onClick={remove}
            aria-label={t('categoryEditor.removeEntry')}
          />
        )}
      </Flex>
      {fields.map((field, row) => (
        <Flex key={field.id} gap="xs" align="center" wrap="wrap">
          <Box width="7em">
            <TextField
              control={form.control}
              name={`categories.${index}.translations.${row}.language`}
              label="translationKey"
              placeholder="en"
              disabled={disabled}
              required
            />
          </Box>
          <Box flex="1" minWidth="10em">
            <TextField
              control={form.control}
              name={`categories.${index}.translations.${row}.label`}
              label="translationLabel"
              placeholder=""
              disabled={disabled}
              required
            />
          </Box>
          <Button
            variant="plain"
            dangerous
            icon="tabler:x"
            disabled={disabled}
            onClick={() => removeTranslation(row)}
            aria-label={t('categoryEditor.removeTranslation')}
          />
        </Flex>
      ))}
      <Button
        namespace={namespace}
        variant="plain"
        icon="tabler:plus"
        disabled={disabled}
        onClick={() => append({ language: '', label: '' })}
      >
        addTranslation
      </Button>
    </Stack>
  )
}

function CategoryEditor({
  data,
  languages,
  onClose
}: {
  data: Options
  languages: string[]
  onClose(): void
}) {
  const { t } = useTranslation(namespace)
  const required = t('categoryEditor.required')
  const schema = z
    .object({
      categories: z
        .array(
          z.object({
            key: z.string().trim().min(1, required).max(128),
            translations: z.array(
              z.object({
                language: z
                  .string()
                  .trim()
                  .regex(
                    /^[a-z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/,
                    t('categoryEditor.invalidLanguage')
                  ),
                label: z.string().trim().min(1, required).max(255)
              })
            )
          })
        )
        .min(1)
    })
    .superRefine((values, context) => {
      const keys = new Set<string>()
      values.categories.forEach((category, index) => {
        if (
          keys.has(category.key) ||
          ['__proto__', 'prototype', 'constructor'].includes(category.key)
        )
          context.addIssue({
            code: 'custom',
            message: t('categoryEditor.duplicate'),
            path: ['categories', index, 'key']
          })
        keys.add(category.key)
        const labels = new Set<string>()
        category.translations.forEach((row, rowIndex) => {
          if (labels.has(row.language))
            context.addIssue({
              code: 'custom',
              message: t('categoryEditor.duplicateLanguage'),
              path: ['categories', index, 'translations', rowIndex, 'language']
            })
          labels.add(row.language)
        })
      })
    })
  const makeEntry = (key = '') => ({
    key,
    translations: languages.map(language => ({ language, label: '' }))
  })
  const form = useForm<EditorValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      categories: data.category
        ? [
            {
              key: data.category.key,
              translations: Object.entries(data.category.value).map(
                ([language, label]) => ({ language, label })
              )
            }
          ]
        : (data.initialKeys?.length ? data.initialKeys : ['']).map(makeEntry)
    }
  })
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'categories'
  })
  return (
    <FormModal
      form={form}
      uiConfig={{
        namespace,
        icon: 'tabler:category',
        title: `category.${data.openType}`,
        onClose
      }}
      submissionConfig={{
        template: data.openType,
        handler: values =>
          data.onSubmit(
            values.categories.map(category => ({
              key: category.key,
              value: Object.fromEntries(
                category.translations.map(row => [row.language, row.label])
              )
            }))
          )
      }}
    >
      <Stack gap="lg">
        {fields.map((field, index) => (
          <CategoryFields
            key={field.id}
            form={form}
            index={index}
            canRemove={fields.length > 1}
            remove={() => remove(index)}
          />
        ))}
        {data.openType === 'create' && (
          <Button
            namespace={namespace}
            variant="secondary"
            icon="tabler:plus"
            disabled={form.formState.isSubmitting}
            onClick={() => append(makeEntry())}
          >
            addCategory
          </Button>
        )}
      </Stack>
    </FormModal>
  )
}

export default function ModifyCategoryModal(props: {
  onClose(): void
  data: Options
}) {
  const languages = useQuery(workspaceAPI.locales.listLanguages.queryOptions())
  return (
    <WithQuery query={languages}>
      {rows => (
        <CategoryEditor {...props} languages={rows.map(row => row.name)} />
      )}
    </WithQuery>
  )
}
