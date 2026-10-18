import { Box, Button, Flex, Stack, Text } from '@monolith/ui'
import dayjs from 'dayjs'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import workspaceAPI from '@/core/utils/workspaceAPI'

import { useRooms } from '../RoomsContext'
import { messageContext, useRoomsEncryption } from '../RoomsEncryption'
import { type Message, reactions } from '../types'
import { AttachmentDownload } from './Attachments'
import EntityChip from './EntityChip'

export default function MessageItem({
  message,
  inThread = false,
  highlighted = false
}: {
  message: Message
  inThread?: boolean
  highlighted?: boolean
}) {
  const { t } = useTranslation('common.rooms')
  const { actor, room, scope, openThread, refresh } = useRooms()
  const encryption = useRoomsEncryption()
  const [editing, setEditing] = useState(false)
  const [body, setBody] = useState(message.body)
  const [refs, setRefs] = useState(message.references)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showReactions, setShowReactions] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    const params = new URLSearchParams({
      workspace: scope.workspace_id,
      room: scope.room_id,
      message: message.id,
      ...(message.thread_id ? { thread: message.thread_id } : {})
    })

    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/rooms?${params}`
      )
      setCopied(true)
    } catch {
      setError(t('failed'))
    }
  }

  const mine = message.author_id === actor

  async function act(action: () => Promise<unknown>) {
    setPending(true)
    setError('')

    try {
      await action()
      setEditing(false)
      setConfirmDelete(false)
      setShowReactions(false)
      void refresh()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('failed'))
    } finally {
      setPending(false)
    }
  }

  function edit(deleted = false) {
    return act(async () => {
      const sealed = deleted
        ? undefined
        : await encryption.seal(
            messageContext(
              scope,
              actor,
              message.transaction_id,
              message.thread_id,
              refs,
              message.attachments,
              (message.sealed?.context.content_revision ?? 0) + 1
            ),
            body,
            message.attachments
          )

      return workspaceAPI.rooms.edit.input(scope).mutate({
        id: message.id,
        expected_revision: message.revision,
        body: '',
        sealed,
        references: deleted ? [] : refs.map(ref => ref.key),
        deleted
      })
    })
  }

  const canWrite = room?.can_write && !message.deleted

  return (
    <Box
      as="article"
      className="rooms-message"
      data-highlighted={highlighted}
      id={`${inThread ? 'room-thread-message' : 'room-message'}-${message.id}`}
      px="sm"
      py="sm"
      r="md"
    >
      <Flex align="start" className="rooms-message-row" gap="sm">
        <Flex
          centered
          aria-hidden="true"
          bg={{ base: 'bg-100', dark: 'bg-800' }}
          className="rooms-avatar"
          flexShrink="0"
          height="2rem"
          r="md"
          width="2rem"
        >
          <Text size="sm" weight="semibold">
            {message.author_name.slice(0, 2).toUpperCase()}
          </Text>
        </Flex>
        <Stack flex="1" gap="xs" minWidth="0">
          <Flex align="baseline" gap="sm" wrap="wrap">
            <Text size="sm" weight="semibold">
              {message.author_name}
            </Text>
            <Text
              as="time"
              color="muted"
              dateTime={message.created}
              size="sm"
              title={dayjs(message.created).format('LLL')}
            >
              {dayjs(message.created).format('MMM D, HH:mm')}
            </Text>
            {message.edited && !message.deleted && (
              <Text color="muted" size="sm">
                {t('edited')}
              </Text>
            )}
            {message.pinned && (
              <Text color="muted" size="sm">
                {t('pinned')}
              </Text>
            )}
          </Flex>
          {!message.deleted && (
            <Text color="muted" size="xs">
              {t(message.sealed ? 'encryptedMessage' : 'legacyMessage')}
            </Text>
          )}
          {editing ? (
            <Stack gap="sm">
              <Box
                aria-label={t('editMessage')}
                as="textarea"
                className="rooms-field"
                disabled={pending}
                maxLength={16000}
                minHeight="5rem"
                p="sm"
                value={body}
                width="100%"
                onChange={event => setBody(event.target.value)}
              />
              <Flex gap="xs" wrap="wrap">
                {refs.map(entity => (
                  <EntityChip
                    key={entity.key}
                    entity={entity}
                    onRemove={() =>
                      setRefs(current =>
                        current.filter(ref => ref.key !== entity.key)
                      )
                    }
                  />
                ))}
              </Flex>
              <Flex gap="sm">
                <Button
                  loading={pending}
                  namespace="common.rooms"
                  onClick={() => void edit()}
                >
                  save
                </Button>
                <Button
                  disabled={pending}
                  namespace="common.rooms"
                  variant="plain"
                  onClick={() => setEditing(false)}
                >
                  cancel
                </Button>
              </Flex>
            </Stack>
          ) : (
            <>
              <Text
                as="p"
                className="rooms-message-body"
                color={message.deleted ? 'muted' : undefined}
                leading="relaxed"
                whiteSpace="pre-wrap"
              >
                {message.deleted
                  ? t('deletedMessage')
                  : message.encryptionError || message.body}
              </Text>
              {message.references.length > 0 && (
                <Flex gap="xs" wrap="wrap">
                  {message.references.map(entity => (
                    <EntityChip key={entity.key} entity={entity} />
                  ))}
                </Flex>
              )}
              {!!message.attachments?.length && (
                <Flex gap="sm" wrap="wrap">
                  {message.attachments.map(file => (
                    <AttachmentDownload key={file.id} file={file} />
                  ))}
                </Flex>
              )}
            </>
          )}
          {message.reactions.length > 0 && (
            <Flex gap="xs" wrap="wrap">
              {message.reactions.map(reaction => (
                <Button
                  key={reaction.emoji}
                  aria-label={t('reactionCount', {
                    emoji: reaction.emoji,
                    count: reaction.count
                  })}
                  aria-pressed={reaction.mine}
                  className="rooms-reaction"
                  disabled={!canWrite || pending}
                  namespace={false}
                  px="sm"
                  py="xs"
                  variant={reaction.mine ? 'secondary' : 'plain'}
                  onClick={() =>
                    void act(() =>
                      workspaceAPI.rooms.react.input(scope).mutate({
                        id: message.id,
                        emoji: reaction.emoji as (typeof reactions)[number],
                        active: !reaction.mine
                      })
                    )
                  }
                >
                  {reaction.emoji} {reaction.count}
                </Button>
              ))}
            </Flex>
          )}
          {!inThread && message.replies > 0 && (
            <Button
              icon="lucide:messages-square"
              justify="start"
              namespace={false}
              px="none"
              py="xs"
              variant="plain"
              onClick={() => openThread(message.thread_id ?? message.id)}
            >
              <Text size="sm">{t('replies', { count: message.replies })}</Text>
            </Button>
          )}
          {showReactions && (
            <Flex gap="xs" wrap="wrap">
              {reactions.map(emoji => (
                <Button
                  key={emoji}
                  aria-label={t('reactWith', { emoji })}
                  disabled={pending}
                  namespace={false}
                  variant="plain"
                  onClick={() =>
                    void act(() =>
                      workspaceAPI.rooms.react.input(scope).mutate({
                        id: message.id,
                        emoji,
                        active: !message.reactions.find(
                          reaction => reaction.emoji === emoji
                        )?.mine
                      })
                    )
                  }
                >
                  {emoji}
                </Button>
              ))}
            </Flex>
          )}
          {confirmDelete && (
            <Stack gap="sm">
              <Text size="sm">{t('deleteConfirm')}</Text>
              <Flex gap="sm">
                <Button
                  dangerous
                  loading={pending}
                  namespace="common.rooms"
                  onClick={() => void edit(true)}
                >
                  delete
                </Button>
                <Button
                  disabled={pending}
                  namespace="common.rooms"
                  variant="plain"
                  onClick={() => setConfirmDelete(false)}
                >
                  cancel
                </Button>
              </Flex>
            </Stack>
          )}
          {error && (
            <Text color="dangerous" role="alert" size="sm">
              {error}
            </Text>
          )}
          {copied && (
            <Text color="muted" role="status" size="sm">
              {t('copied')}
            </Text>
          )}
        </Stack>
        {!editing && (
          <Flex
            align="center"
            className="rooms-message-actions"
            flexShrink="0"
            gap="none"
          >
            <Button
              aria-label={t('copyLink')}
              icon="lucide:link"
              variant="plain"
              onClick={() => void copyLink()}
            />
            {!inThread && (
              <Button
                aria-label={t('reply')}
                icon="lucide:reply"
                variant="plain"
                onClick={() => openThread(message.thread_id ?? message.id)}
              />
            )}
            {canWrite && (
              <Button
                aria-label={t('react')}
                icon="lucide:smile"
                variant="plain"
                onClick={() => setShowReactions(value => !value)}
              />
            )}
            {canWrite &&
              mine &&
              encryption.ready &&
              !message.encryptionError && (
                <Button
                  aria-label={t('editMessage')}
                  icon="lucide:pencil"
                  variant="plain"
                  onClick={() => {
                    setBody(message.body)
                    setRefs(message.references)
                    setEditing(true)
                  }}
                />
              )}
            {canWrite && room?.can_manage && (
              <Button
                aria-label={t(message.pinned ? 'unpin' : 'pin')}
                disabled={pending}
                icon="lucide:pin"
                variant="plain"
                onClick={() =>
                  void act(() =>
                    workspaceAPI.rooms.pin.input(scope).mutate({
                      id: message.id,
                      expected_revision: message.revision,
                      pinned: !message.pinned
                    })
                  )
                }
              />
            )}
            {canWrite && (mine || room?.can_manage) && (
              <Button
                aria-label={t('delete')}
                icon="lucide:trash-2"
                variant="plain"
                onClick={() => setConfirmDelete(true)}
              />
            )}
          </Flex>
        )}
      </Flex>
    </Box>
  )
}
