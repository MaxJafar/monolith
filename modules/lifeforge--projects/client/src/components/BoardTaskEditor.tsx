import { useState } from 'react'

import { useModuleTranslation } from '@lifeforge/localization'
import {
  BlockEditor,
  Button,
  Flex,
  ModalHeader,
  Stack,
  Text,
  TextInput
} from '@lifeforge/ui'

export function BoardTaskEditor({
  onClose,
  data
}: {
  onClose: () => void
  data: {
    title?: string
    content?: string
    onSave: (title: string, content: string) => Promise<void>
  }
}) {
  const { t } = useModuleTranslation()
  const [title, setTitle] = useState(data.title ?? '')
  const [content, setContent] = useState(data.content ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [validContent, setValidContent] = useState(true)

  async function save() {
    if (busy || !title.trim() || !validContent) return
    setBusy(true)
    setError('')

    try {
      await data.onSave(title.trim(), content)
      onClose()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('saveFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack
      as="form"
      gap="md"
      width="min(480px, 100%)"
      onSubmit={event => {
        event.preventDefault()
        void save()
      }}
    >
      <ModalHeader
        icon="tabler:file-description"
        title={data.title === undefined ? 'newTask' : 'editTask'}
        onClose={() => {
          if (!busy) onClose()
        }}
      />
      <TextInput
        autoFocus
        required
        disabled={busy}
        label="inputs.title"
        maxLength={255}
        placeholder={t('inputs.title')}
        value={title}
        onChange={setTitle}
      />
      <BlockEditor
        readOnly={busy}
        value={content}
        onChange={setContent}
        onValidityChange={setValidContent}
      />
      {error && (
        <Text color="dangerous" role="alert">
          {error}
        </Text>
      )}
      <Flex gap="sm" justify="end">
        <Button disabled={busy} variant="plain" onClick={onClose}>
          cancel
        </Button>
        <Button
          disabled={!title.trim() || !validContent}
          loading={busy}
          type="submit"
        >
          save
        </Button>
      </Flex>
    </Stack>
  )
}
