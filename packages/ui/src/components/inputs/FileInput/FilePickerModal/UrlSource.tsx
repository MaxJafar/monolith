// SPDX-License-Identifier: 0BSD
import { useState } from 'react'

import { TextInput } from '@/components/inputs/TextInput'

import { type FileSelection, remoteFileURL } from '../model'

export function UrlSource({
  onSelect
}: {
  onSelect: (value: FileSelection | null) => void
}) {
  const [url, setUrl] = useState('')
  return (
    <TextInput
      namespace="common.modals"
      label="imagePicker.inputs.imageLink"
      icon="tabler:link"
      placeholder="https://example.com/image.png"
      value={url}
      onChange={value => {
        setUrl(value)
        const normalized = remoteFileURL(value)
        onSelect(normalized ? { file: normalized, preview: normalized } : null)
      }}
    />
  )
}
