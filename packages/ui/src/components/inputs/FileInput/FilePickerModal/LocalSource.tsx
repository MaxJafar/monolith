// SPDX-License-Identifier: 0BSD
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/inputs/Button'
import { Stack, Text } from '@/components/primitives'

import {
  type FileSelection,
  type FileTypes,
  acceptedTypes,
  acceptsFile,
  readFilePreview
} from '../model'

export function LocalSource({
  types,
  onSelect
}: {
  types?: FileTypes
  onSelect: (value: FileSelection | null) => void
}) {
  const { t } = useTranslation('common.modals')
  const input = useRef<HTMLInputElement>(null),
    reading = useRef<AbortController | null>(null),
    mounted = useRef(true)
  const [error, setError] = useState(''),
    [loading, setLoading] = useState(false),
    [dragging, setDragging] = useState(false)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      reading.current?.abort()
    }
  }, [])
  async function choose(file: File | undefined) {
    if (!file || !mounted.current) return
    reading.current?.abort()
    const active = new AbortController()
    reading.current = active
    setError('')
    onSelect(null)
    if (!acceptsFile(file, types)) {
      setError(t('imagePicker.unsupported'))
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const preview = await readFilePreview(file, active.signal)
      if (!active.signal.aborted) onSelect({ file, preview })
    } catch {
      if (!active.signal.aborted) setError(t('imagePicker.readError'))
    } finally {
      if (!active.signal.aborted) setLoading(false)
    }
  }
  async function paste() {
    try {
      if (!navigator.clipboard?.read)
        throw new Error('Clipboard is unavailable')
      const items = await navigator.clipboard.read()
      const entry = items.flatMap(item =>
        item.types
          .filter(type => type.startsWith('image/'))
          .map(type => ({ item, type }))
      )[0]
      if (!entry) throw new Error('No image')
      const blob = await entry.item.getType(entry.type)
      await choose(
        new File([blob], 'clipboard.' + (entry.type.split('/')[1] || 'png'), {
          type: blob.type
        })
      )
    } catch {
      if (mounted.current) setError(t('imagePicker.clipboardError'))
    }
  }
  return (
    <Stack gap="sm">
      <input
        ref={input}
        type="file"
        hidden
        accept={acceptedTypes(types).join(',')}
        onChange={event => {
          void choose(event.currentTarget.files?.[0])
          event.currentTarget.value = ''
        }}
      />
      <button
        type="button"
        className="monolith-file-drop"
        data-dragging={dragging}
        disabled={loading}
        onClick={() => input.current?.click()}
        onDragOver={event => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={event => {
          event.preventDefault()
          setDragging(false)
          void choose(event.dataTransfer.files[0])
        }}
      >
        {t(loading ? 'imagePicker.reading' : 'imagePicker.drop')}
      </button>
      <Button
        namespace="common.modals"
        variant="plain"
        icon="tabler:clipboard"
        disabled={loading}
        onClick={paste}
      >
        imagePicker.paste
      </Button>
      {error && (
        <Text role="alert" color="dangerous" size="sm">
          {error}
        </Text>
      )}
    </Stack>
  )
}
