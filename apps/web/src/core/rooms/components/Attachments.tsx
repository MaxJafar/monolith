import {
  type RoomAttachment,
  decryptRoomFile,
  encryptRoomFile,
  roomsBase64,
  roomsBytes
} from '@monolith/api'
import { Box, Button, Flex, Stack, Text } from '@monolith/ui'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import workspaceAPI from '@/core/utils/workspaceAPI'

import { useRooms } from '../RoomsContext'

const CHUNK = 256 * 1024

export function AttachmentPicker({
  count,
  disabled,
  onUploaded
}: {
  count: number
  disabled: boolean
  onUploaded: (file: RoomAttachment) => void
}) {
  const { t } = useTranslation('common.rooms')
  const { scope } = useRooms()
  const input = useRef<HTMLInputElement>(null)
  const generation = useRef(0)
  const busy = useRef(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState('')

  useEffect(
    () => () => {
      generation.current++
    },
    []
  )

  async function upload(file: File) {
    if (busy.current) return
    busy.current = true
    const version = ++generation.current
    const id = crypto.randomUUID()

    let committed = false
    setProgress(0)
    setError('')

    try {
      if (file.size > 20 * 1024 * 1024) throw Error(t('fileTooLarge'))

      const { encrypted, file: attachment } = await encryptRoomFile(
        id,
        await file.arrayBuffer(),
        file.name,
        file.type
      )

      if (version !== generation.current) return
      await workspaceAPI.rooms.beginUpload
        .input(scope)
        .mutate({ id, size: encrypted.length, hash: attachment.hash })

      for (let offset = 0; offset < encrypted.length; offset += CHUNK) {
        if (version !== generation.current) return
        await workspaceAPI.rooms.putChunk.input({ ...scope, id }).mutate({
          part: offset / CHUNK,
          data: roomsBase64(encrypted.subarray(offset, offset + CHUNK))
        })
        if (version === generation.current)
          setProgress(
            Math.round(
              (Math.min(offset + CHUNK, encrypted.length) / encrypted.length) *
                100
            )
          )
      }
      if (version !== generation.current) return
      await workspaceAPI.rooms.finishUpload
        .input({ ...scope, id })
        .mutate(undefined)
      if (version !== generation.current) return
      onUploaded(attachment)
      committed = true
    } catch (error) {
      if (version === generation.current)
        setError(error instanceof Error ? error.message : t('failed'))
    } finally {
      if (!committed)
        void workspaceAPI.rooms.discardUpload
          .input({ ...scope, id })
          .mutate(undefined)
          .catch(() => {})
      busy.current = false
      if (version === generation.current) setProgress(null)
    }
  }

  return (
    <Flex align="center" gap="xs" wrap="wrap">
      <Box
        ref={input}
        aria-label={t('attachFile')}
        as="input"
        display="none"
        type="file"
        onChange={event => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void upload(file)
        }}
      />
      <Button
        aria-label={t('attachFile')}
        disabled={disabled || count >= 4 || progress !== null}
        icon="lucide:paperclip"
        type="button"
        variant="plain"
        onClick={() => input.current?.click()}
      />
      {progress !== null && (
        <>
          <Text role="status" size="sm">
            {t('uploadProgress', { percent: progress })}
          </Text>
          <Button
            aria-label={t('cancelUpload')}
            icon="lucide:x"
            type="button"
            variant="plain"
            onClick={() => {
              generation.current++
              setProgress(null)
            }}
          />
        </>
      )}
      {error && (
        <Text color="dangerous" role="alert" size="sm">
          {error}
        </Text>
      )}
    </Flex>
  )
}

export function AttachmentDownload({ file }: { file: RoomAttachment }) {
  const { scope } = useRooms()
  const { t } = useTranslation('common.rooms')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const current = useRef(true)

  useEffect(() => {
    current.current = true

    return () => {
      current.current = false
    }
  }, [])

  async function download() {
    if (pending) return
    setPending(true)
    setError('')

    try {
      const encrypted = new Uint8Array(file.size + 16)

      for (let offset = 0; offset < encrypted.length; offset += CHUNK) {
        if (!current.current) return

        const part = await workspaceAPI.rooms.getChunk
          .input({ ...scope, id: file.id, part: offset / CHUNK })
          .query()

        if (part.size !== encrypted.length || part.hash !== file.hash)
          throw Error(t('attachmentChanged'))

        const bytes = roomsBytes(part.data)

        if (bytes.length !== Math.min(CHUNK, encrypted.length - offset))
          throw Error(t('attachmentChanged'))
        encrypted.set(bytes, offset)
      }

      const plaintext = await decryptRoomFile(file, encrypted)

      if (!current.current) return

      const url = URL.createObjectURL(
        new Blob([plaintext], { type: 'application/octet-stream' })
      )
      const link = document.createElement('a')
      link.href = url
      // Strip path separators and control characters from untrusted file names.

      link.download =
        // eslint-disable-next-line no-control-regex
        file.name.replace(/[\\/\u0000-\u001f]/g, '_') || 'attachment'
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      if (current.current)
        setError(error instanceof Error ? error.message : t('failed'))
    } finally {
      if (current.current) setPending(false)
    }
  }

  return (
    <Stack gap="xs">
      <Button
        icon="lucide:file-down"
        loading={pending}
        namespace={false}
        variant="secondary"
        onClick={() => {
          void download()
        }}
      >
        <Text truncate size="sm">
          {file.name} · {Math.ceil(file.size / 1024)} KiB
        </Text>
      </Button>
      {error && (
        <Text color="dangerous" role="alert" size="sm">
          {error}
        </Text>
      )}
    </Stack>
  )
}
