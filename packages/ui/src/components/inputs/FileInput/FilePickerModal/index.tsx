// SPDX-License-Identifier: 0BSD
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/inputs/Button'
import { Tabs } from '@/components/navigation/Tabs'
import { ModalHeader } from '@/components/overlays'
import { Flex, Stack, Text } from '@/components/primitives'

import { FilePreview } from '../Preview'
import '../fileInput.css'
import {
  type FilePickerSourceConfig,
  type FileSelection,
  selectedName
} from '../model'
import { LocalSource } from './LocalSource'
import { GeneratedSource, PixabaySource } from './RemoteSources'
import { UrlSource } from './UrlSource'

export function FilePickerModal({
  data,
  onClose
}: {
  data: {
    sources: FilePickerSourceConfig
    mimeTypes?: Record<string, string[]>
    onSelect: (file: File | string, preview: string | null) => Promise<void>
  }
  onClose: () => void
}) {
  const { t } = useTranslation('common.modals'),
    titleId = useId()
  const [tab, setTab] = useState('local'),
    [selection, setSelection] = useState<FileSelection | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const items = [
    { id: 'local', name: t('imagePicker.local') },
    ...(data.sources.url ? [{ id: 'url', name: t('imagePicker.url') }] : []),
    ...(data.sources.pixabay ? [{ id: 'pixabay', name: 'Pixabay' }] : []),
    ...(data.sources.ai ? [{ id: 'ai', name: t('imagePicker.ai') }] : [])
  ]
  async function confirm() {
    if (!selection || busy) return
    setBusy(true)
    setError('')
    try {
      await data.onSelect(selection.file, selection.preview)
      onClose()
    } catch {
      setError(t('imagePicker.saveError'))
    } finally {
      setBusy(false)
    }
  }
  const dismiss = () => {
    if (!busy) onClose()
  }
  return (
    <Stack
      className="monolith-form-dialog"
      role="dialog"
      aria-labelledby={titleId}
      aria-busy={busy}
      width="560px"
      maxWidth="100%"
      gap="md"
    >
      <ModalHeader
        titleId={titleId}
        title="imagePicker.title"
        icon="tabler:file"
        onClose={dismiss}
      />
      <Stack gap="md" inert={busy || undefined}>
        {items.length > 1 && (
          <Tabs
            items={items}
            enabled={items.map(item => item.id)}
            currentTab={tab}
            onTabChange={id => {
              setTab(id)
              setSelection(null)
              setError('')
            }}
          />
        )}
        {tab === 'local' && (
          <LocalSource types={data.mimeTypes} onSelect={setSelection} />
        )}
        {tab === 'url' && <UrlSource onSelect={setSelection} />}
        {tab === 'pixabay' && (
          <PixabaySource selected={selection} onSelect={setSelection} />
        )}
        {tab === 'ai' && data.sources.ai && (
          <GeneratedSource
            defaultPrompt={data.sources.ai.defaultPrompt}
            onSelect={setSelection}
          />
        )}
        {selection && (
          <FilePreview
            name={selectedName(selection.file)}
            preview={selection.preview}
          />
        )}
      </Stack>
      {error && (
        <Text color="dangerous" role="alert" size="sm">
          {error}
        </Text>
      )}
      <Flex gap="sm" justify="end">
        <Button variant="plain" disabled={busy} onClick={dismiss}>
          cancel
        </Button>
        <Button
          disabled={!selection}
          loading={busy}
          icon="tabler:check"
          onClick={confirm}
        >
          select
        </Button>
      </Flex>
    </Stack>
  )
}
