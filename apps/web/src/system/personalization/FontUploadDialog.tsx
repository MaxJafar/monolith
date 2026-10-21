// SPDX-License-Identifier: 0BSD
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Button,
  FileInput,
  type FileValue,
  Flex,
  Listbox,
  ListboxOption,
  ModalHeader,
  Stack,
  Text,
  TextInput
} from '@monolith/ui'

import workspaceAPI from '@/core/utils/workspaceAPI'

import { inspectFont } from './settingsModel'

const ns = 'common.personalization'
type FontRecord = Awaited<
  ReturnType<typeof workspaceAPI.fonts.custom.list.query>
>[number]
export default function FontUploadDialog({
  onClose,
  data
}: {
  onClose: () => void
  data: { font?: FontRecord; onSaved: () => Promise<unknown> }
}) {
  const { t } = useTranslation(ns)
  const [file, setFile] = useState<FileValue>({ type: 'empty' })
  const [name, setName] = useState(data.font?.displayName ?? ''),
    [family, setFamily] = useState(data.font?.family ?? ''),
    [weight, setWeight] = useState(data.font?.weight ?? 400)
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const generation = useRef(0)
  useEffect(
    () => () => {
      ++generation.current
    },
    []
  )
  async function detect(value: FileValue) {
    setFile(value)
    const request = ++generation.current
    if (value.type !== 'upload') return
    try {
      const meta = await inspectFont(value.file)
      if (request === generation.current) {
        setFamily(meta.family)
        setName(meta.family)
        setWeight(meta.weight)
      }
    } catch {
      if (request === generation.current) setError(t('monolith.metadataHelp'))
    }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    if (!name.trim() || !family.trim()) {
      setError(t('monolith.requiredNames'))
      return
    }
    setBusy(true)
    setError('')
    try {
      let upload = file.type === 'upload' ? file.file : undefined
      if (!upload && data.font?.file) {
        const previous = data.font.file
        const response = await fetch(
          workspaceAPI.getMedia({ key: previous.key }),
          { credentials: 'include' }
        )
        if (!response.ok) throw new Error(t('monolith.requestFailed'))
        upload = new File([await response.blob()], previous.originalName, {
          type: previous.mimeType
        })
      }
      if (!upload) throw new Error(t('monolith.chooseFont'))
      await workspaceAPI.fonts.custom.upload
        .input({ id: data.font?.id })
        .mutate({
          file: upload,
          displayName: name.trim(),
          family: family.trim(),
          weight
        })
      await data.onSaved()
      onClose()
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : t('monolith.requestFailed')
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <Stack
      as="form"
      onSubmit={submit}
      width="520px"
      maxWidth="100%"
      gap="md"
      aria-busy={busy}
    >
      <ModalHeader
        namespace={ns}
        icon="tabler:typography"
        title={data.font ? 'monolith.editFont' : 'monolith.uploadFont'}
        onClose={() => {
          if (!busy) onClose()
        }}
      />
      <Stack gap="md" inert={busy || undefined}>
        <FileInput
          namespace={ns}
          label="monolith.fontFile"
          icon="tabler:file"
          value={file}
          onChange={detect}
          mimeTypes={{ font: ['ttf', 'otf', 'woff', 'woff2'] }}
        />
        {data.font && (
          <Text color="muted" size="sm">
            {t('monolith.keepFontFile')}
          </Text>
        )}
        <TextInput
          placeholder=""
          namespace={ns}
          label="monolith.displayName"
          icon="tabler:tag"
          value={name}
          onChange={setName}
        />
        <TextInput
          placeholder=""
          namespace={ns}
          label="monolith.family"
          icon="tabler:typography"
          value={family}
          onChange={setFamily}
        />
        <Listbox
          aria-label={t('monolith.weight')}
          value={weight}
          onChange={setWeight}
        >
          {[100, 200, 300, 400, 500, 600, 700, 800, 900].map(value => (
            <ListboxOption key={value} value={value} label={String(value)} />
          ))}
        </Listbox>
      </Stack>
      {error && (
        <Text color="dangerous" role="alert">
          {error}
        </Text>
      )}
      <Flex gap="sm" justify="end">
        <Button
          namespace={ns}
          variant="plain"
          disabled={busy}
          onClick={onClose}
        >
          monolith.cancel
        </Button>
        <Button type="submit" namespace={ns} loading={busy}>
          monolith.save
        </Button>
      </Flex>
    </Stack>
  )
}
