// SPDX-License-Identifier: 0BSD
import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Flex, Icon, Stack, Text } from '@/components/primitives'
import { useModalStore } from '@/providers'

import { Button } from '../Button'
import { useInputLabel } from '../shared/hooks/useInputLabel'
import { FilePickerModal } from './FilePickerModal'
import { FilePreview } from './Preview'
import './fileInput.css'
import {
  type FilePickerSourceConfig,
  type FileValue,
  isLocalFile,
  selectedName
} from './model'

export {
  fileValueSchema,
  type FileValue,
  type FilePickerSourceConfig
} from './model'

export function FileInput({
  icon,
  label,
  reminderText,
  value,
  onChange,
  required,
  namespace,
  disabled,
  sources = {},
  mimeTypes,
  errorMsg
}: {
  icon: string
  label: string
  reminderText?: string
  value: FileValue
  onChange: (value: FileValue) => void
  required?: boolean
  namespace?: string | false
  disabled?: boolean
  sources?: FilePickerSourceConfig
  mimeTypes?: Record<string, string[]>
  errorMsg?: string
}) {
  const { open } = useModalStore(),
    id = useId()
  const caption = useInputLabel({ label, namespace })
  const { t } = useTranslation('common.modals')
  const [localPreview, setLocalPreview] = useState<{
    file: File
    url: string
  } | null>(null)
  const file = value.type === 'upload' ? value.file : null
  const supplied = value.type !== 'empty' ? value.preview : undefined
  useEffect(() => {
    if (!file || supplied || !file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    setLocalPreview({ file, url })
    return () => URL.revokeObjectURL(url)
  }, [file, supplied])
  const preview =
    supplied ?? (localPreview?.file === file ? localPreview?.url : undefined)
  const choose = () => {
    if (disabled) return
    open(FilePickerModal, {
      sources,
      mimeTypes,
      onSelect: async (selected, preview) => {
        onChange(
          isLocalFile(selected)
            ? { type: 'upload', file: selected, preview: preview ?? undefined }
            : { type: 'url', url: selected, preview: preview ?? undefined }
        )
      }
    })
  }
  return (
    <Stack
      role="group"
      aria-labelledby={id}
      aria-invalid={!!errorMsg || undefined}
      aria-describedby={errorMsg ? id + '-error' : undefined}
      inert={disabled || undefined}
      className="monolith-file-input"
      gap="md"
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Flex align="center" gap="sm">
        <Icon icon={icon} color="muted" />
        <Text id={id} size="sm" weight="medium">
          {caption}
          {required ? ' *' : ''}
        </Text>
      </Flex>
      {value.type !== 'empty' && (
        <FilePreview
          name={
            value.type === 'existing'
              ? value.filename
              : selectedName(value.type === 'upload' ? value.file : value.url)
          }
          preview={preview}
        />
      )}
      {reminderText && (
        <Text color="muted" size="sm">
          {reminderText}
        </Text>
      )}
      <Flex gap="sm">
        <Button
          namespace="common.modals"
          variant="secondary"
          icon="tabler:upload"
          disabled={disabled}
          aria-label={t('imagePicker.choose') + ' · ' + caption}
          onClick={choose}
        >
          imagePicker.choose
        </Button>
        {value.type !== 'empty' && (
          <Button
            variant="plain"
            icon="tabler:x"
            disabled={disabled}
            onClick={() => onChange({ type: 'empty' })}
          >
            remove
          </Button>
        )}
      </Flex>
      {errorMsg && (
        <Text id={id + '-error'} color="dangerous" role="alert" size="sm">
          {errorMsg}
        </Text>
      )}
    </Stack>
  )
}
