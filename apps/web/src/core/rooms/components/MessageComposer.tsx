import { Bordered, Box, Button, Flex, Stack, Text } from '@monolith/ui'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import workspaceAPI from '@/core/utils/workspaceAPI'

import { useRooms } from '../RoomsContext'
import { messageContext, useRoomsEncryption } from '../RoomsEncryption'
import type { Draft, Entity } from '../types'
import { AttachmentPicker } from './Attachments'
import EntityChip from './EntityChip'
import EntityPicker from './EntityPicker'

export default function MessageComposer({
  threadId,
  onSent
}: {
  threadId?: string
  onSent: () => void
}) {
  const { t } = useTranslation('common.rooms')
  const { scope, actor, drafts, refresh, signalTyping } = useRooms()
  const encryption = useRoomsEncryption()
  const [params, setParams] = useSearchParams()

  const requestedMention = !threadId ? params.get('mention') : null
  const draftKey = `${scope.workspace_id}:${scope.room_id}:${threadId ?? ''}`
  const [draft, setDraft] = useState<Draft>(
    () =>
      drafts.current.get(draftKey) ?? {
        body: '',
        references: [],
        transactionId: crypto.randomUUID()
      }
  )

  const [pending, setPending] = useState(false)
  const sending = useRef(false)
  const [error, setError] = useState('')
  const [picker, setPicker] = useState<string | null>(null)
  const field = useRef<HTMLTextAreaElement>(null)
  const consumed = useRef<string | null>(null)

  useEffect(() => {
    drafts.current.set(draftKey, draft)
  }, [draft, draftKey, drafts])

  const source = useQuery({
    queryKey: [
      ...workspaceAPI.entities.resolve.key,
      scope.workspace_id,
      actor,
      requestedMention
    ],
    queryFn: () =>
      workspaceAPI.entities.resolve.mutate({
        workspace_id: scope.workspace_id,
        keys: [requestedMention!]
      }),
    enabled: !!requestedMention,
    retry: false
  })
  useEffect(() => {
    if (
      !requestedMention ||
      consumed.current === requestedMention ||
      (!source.data && !source.error)
    )
      return
    consumed.current = requestedMention
    const entity = source.data?.[0]

    if (
      entity?.available &&
      (draft.references.length < 20 ||
        draft.references.some(ref => ref.key === entity.key))
    ) {
      if (!draft.references.some(ref => ref.key === entity.key)) {
        const next = {
          ...draft,
          references: [...draft.references, entity],
          transactionId: crypto.randomUUID()
        }
        setDraft(next)
        drafts.current.set(draftKey, next)
      }
    } else setError(source.error?.message ?? t('itemUnavailable'))
    setParams(
      current => {
        const next = new URLSearchParams(current)
        next.delete('mention')

        return next
      },
      { replace: true }
    )
  }, [
    requestedMention,
    source.data,
    source.error,
    draft,
    draftKey,
    drafts,
    setParams,
    t
  ])

  function update(value: Pick<Draft, 'body' | 'references'>) {
    const next = { ...draft, ...value, transactionId: crypto.randomUUID() }
    setDraft(next)
    drafts.current.set(draftKey, next)
  }

  function mention(entity: Entity) {
    const references = draft.references.some(ref => ref.key === entity.key)
      ? draft.references
      : [...draft.references, entity]
    const body = draft.body.replace(
      /(^|\s)@([^@\n]*)$/,
      (_match, space: string) => `${space}@${entity.title} `
    )
    update({ body, references })
    setPicker(null)
    field.current?.focus()
  }

  async function send() {
    if (
      sending.current ||
      !encryption.ready ||
      (!draft.body.trim() &&
        !draft.references.length &&
        !draft.attachments?.length)
    )
      return
    sending.current = true
    setPending(true)
    setError('')

    try {
      const sealed = await encryption.seal(
        messageContext(
          scope,
          actor,
          draft.transactionId,
          threadId ?? null,
          draft.references,
          draft.attachments
        ),
        draft.body,
        draft.attachments
      )
      await workspaceAPI.rooms.send.input(scope).mutate({
        body: '',
        sealed,
        references: draft.references.map(entity => entity.key),
        transaction_id: draft.transactionId,
        thread_id: threadId ?? null
      })
      const empty = {
        body: '',
        references: [],
        transactionId: crypto.randomUUID()
      }
      drafts.current.delete(draftKey)
      setDraft(empty)
      setPicker(null)
      onSent()
      void refresh()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('failed'))
    } finally {
      sending.current = false
      setPending(false)
      field.current?.focus()
    }
  }

  return (
    <Box pb="md" pt="sm" px={{ base: 'sm', md: 'lg' }}>
      <Bordered borderColor={{ base: 'bg-200', dark: 'bg-700' }} r="lg">
        <Stack
          as="form"
          gap="none"
          onSubmit={event => {
            event.preventDefault()
            if (picker === null) void send()
          }}
        >
          {picker !== null && (
            <EntityPicker
              initialQuery={picker}
              onClose={() => {
                setPicker(null)
                field.current?.focus()
              }}
              onSelect={mention}
            />
          )}
          <Box
            ref={field}
            aria-label={t(threadId ? 'replyPlaceholder' : 'messagePlaceholder')}
            as="textarea"
            bg="transparent"
            className="rooms-composer-input"
            disabled={pending || !encryption.ready}
            maxHeight="14rem"
            maxLength={16000}
            minHeight="5rem"
            p="md"
            placeholder={t(
              threadId ? 'replyPlaceholder' : 'messagePlaceholder'
            )}
            rows={3}
            value={draft.body}
            width="100%"
            onChange={event => {
              const body = event.currentTarget.value
              update({ body, references: draft.references })
              signalTyping()
              const match = body
                .slice(0, event.currentTarget.selectionStart)
                .match(/(?:^|\s)@([^@\n]{0,100})$/)

              if (match && draft.references.length < 20)
                setPicker(match[1] ?? '')
            }}
            onKeyDown={event => {
              if (event.key === 'Escape') setPicker(null)

              if (
                event.key === 'Enter' &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing &&
                event.keyCode !== 229
              ) {
                event.preventDefault()
                if (picker === null) void send()
              }
            }}
          />
          {draft.references.length > 0 && (
            <Flex gap="xs" pb="sm" px="sm" wrap="wrap">
              {draft.references.map(entity => (
                <EntityChip
                  key={entity.key}
                  entity={entity}
                  onRemove={
                    pending
                      ? undefined
                      : () =>
                          update({
                            body: draft.body,
                            references: draft.references.filter(
                              ref => ref.key !== entity.key
                            )
                          })
                  }
                />
              ))}
            </Flex>
          )}
          {!!draft.attachments?.length && (
            <Flex gap="xs" pb="sm" px="sm" wrap="wrap">
              {draft.attachments.map(file => (
                <Button
                  key={file.id}
                  aria-label={t('removeAttachment', { name: file.name })}
                  disabled={pending}
                  icon="lucide:x"
                  namespace={false}
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setDraft(current => ({
                      ...current,
                      attachments: current.attachments?.filter(
                        f => f.id !== file.id
                      ),
                      transactionId: crypto.randomUUID()
                    }))
                    void workspaceAPI.rooms.discardUpload
                      .input({ ...scope, id: file.id })
                      .mutate(undefined)
                      .catch(() => {})
                  }}
                >
                  {file.name}
                </Button>
              ))}
            </Flex>
          )}
          <Flex align="center" gap="sm" justify="between" pb="sm" px="sm">
            <Flex align="center" gap="sm">
              <AttachmentPicker
                count={draft.attachments?.length ?? 0}
                disabled={pending || !encryption.ready}
                onUploaded={file =>
                  setDraft(current => ({
                    ...current,
                    attachments: [...(current.attachments ?? []), file],
                    transactionId: crypto.randomUUID()
                  }))
                }
              />
              <Button
                aria-label={t('mentionItem')}
                disabled={pending || draft.references.length >= 20}
                icon="lucide:at-sign"
                type="button"
                variant="plain"
                onClick={() => setPicker('')}
              />
              <Text className="rooms-composer-help" color="muted" size="sm">
                {t('composerHelp')}
              </Text>
            </Flex>
            <Button
              disabled={
                !encryption.ready ||
                (!draft.body.trim() &&
                  !draft.references.length &&
                  !draft.attachments?.length)
              }
              icon="lucide:send"
              loading={pending}
              namespace="common.rooms"
              type="submit"
            >
              send
            </Button>
          </Flex>
        </Stack>
      </Bordered>
      {error && (
        <Text as="p" color="dangerous" mt="sm" role="alert" size="sm">
          {error} {t('draftKept')}
        </Text>
      )}
    </Box>
  )
}
