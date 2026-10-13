import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { useModuleTranslation } from '@lifeforge/localization'
import {
  Button,
  FileInput,
  type FileValue,
  Flex,
  Stack,
  Text
} from '@lifeforge/ui'

import { forgeAPI } from '@/manifest'

export default function AttachmentControl({
  id,
  file
}: {
  id: string
  file: string | null
}) {
  const { t } = useModuleTranslation()
  const client = useQueryClient()
  const [upload, setUpload] = useState<FileValue>({ type: 'empty' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(remove: boolean) {
    setBusy(true)
    setError('')

    try {
      if (remove) await forgeAPI.entries.detach.input({ id }).mutate(undefined)
      else if (upload.type === 'upload')
        await forgeAPI.entries.attach
          .input({ id })
          .mutate({ file: upload.file })
      setUpload({ type: 'empty' })
      await client.invalidateQueries({ queryKey: forgeAPI.entries.key })
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('saveFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack gap="md">
      {file && (
        <Flex gap="sm" wrap="wrap">
          <Button
            as="a"
            href={forgeAPI.getMedia({ key: file, download: 'true' })}
            namespace={false}
            variant="secondary"
          >
            {t('download')}
          </Button>
          <Button
            dangerous
            disabled={busy}
            namespace={false}
            variant="tertiary"
            onClick={() => submit(true)}
          >
            {t('removeAttachment')}
          </Button>
        </Flex>
      )}
      <FileInput
        disabled={busy}
        icon="tabler:paperclip"
        label="inputs.attachment"
        value={upload}
        onChange={setUpload}
      />
      <Button
        disabled={upload.type !== 'upload'}
        icon="tabler:upload"
        loading={busy}
        namespace={false}
        onClick={() => submit(false)}
      >
        {t('upload')}
      </Button>
      {error && (
        <Text color="dangerous" role="alert">
          {error}
        </Text>
      )}
    </Stack>
  )
}
