import { Box, Button, Flex, Stack, Text } from '@monolith/ui'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import workspaceAPI from '@/core/utils/workspaceAPI'

import { useRooms } from '../RoomsContext'
import { useRoomsEncryption } from '../RoomsEncryption'
import type { Message } from '../types'
import MessageComposer from './MessageComposer'
import MessageItem from './MessageItem'

export default function MessageTimeline({
  threadId,
  query = '',
  pinned = false
}: {
  threadId?: string
  query?: string
  pinned?: boolean
}) {
  const { t } = useTranslation('common.rooms')

  const {
    scope,
    actor,
    room,
    openThread,
    typing,
    threadId: activeThread
  } = useRooms()

  const [params] = useSearchParams()
  const cache = useQueryClient()
  const encryption = useRoomsEncryption()

  const [decrypted, setDecrypted] = useState<{
    source: unknown
    identity: unknown
    messages: Map<string, Message>
  } | null>(null)

  const highlighted = params.get('message')
  const focusId =
    highlighted && (!activeThread || threadId) ? highlighted : undefined
  const input = {
    ...scope,
    thread_id: threadId,
    message_id: focusId,
    q: '',
    all_threads: query ? ('true' as const) : ('false' as const),
    pinned: pinned ? ('true' as const) : ('false' as const)
  }
  const options = workspaceAPI.rooms.timeline.input(input).queryOptions()
  const timeline = useInfiniteQuery({
    queryKey: [...options.queryKey, actor],
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) =>
      workspaceAPI.rooms.timeline.input({ ...input, before: pageParam }).query(),
    getNextPageParam: page => page.next_cursor ?? undefined,
    refetchInterval: 6000,
    retry: 1
  })

  const container = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)
  const heightBeforePage = useRef<number | null>(null)
  const previousLast = useRef<string | undefined>(undefined)
  const [newMessages, setNewMessages] = useState(false)
  const [reading, setReading] = useState(true)
  const acknowledged = useRef(0)
  const scrolledTo = useRef<string | null>(null)

  const pages = timeline.data?.pages ?? []
  const decoded =
    decrypted &&
    decrypted.source === timeline.data &&
    decrypted.identity === encryption.identity
      ? decrypted.messages
      : null
  const convert = (message: Message): Message =>
    decoded?.get(message.id) ??
    (message.sealed
      ? {
          ...message,
          body: '',
          references: [],
          attachments: [],
          encryptionError: t(encryption.ready ? 'decrypting' : 'restoreToRead')
        }
      : message)
  const allMessages = [...pages]
    .reverse()
    .flatMap(page => page.messages)
    .map(convert)
  const messages = query
    ? allMessages.filter(
        m =>
          !m.encryptionError &&
          (
            m.body +
            ' ' +
            m.references.map(r => r.title).join(' ') +
            ' ' +
            (m.attachments ?? []).map(f => f.name).join(' ')
          )
            .toLocaleLowerCase()
            .includes(query.toLocaleLowerCase())
      )
    : allMessages
  const page = pages[0]
  const latest = page
    ? {
        ...page,
        root: page.root ? convert(page.root) : null,
        focus: page.focus ? convert(page.focus) : null
      }
    : undefined
  const last = messages[messages.length - 1]
  const linked =
    latest?.focus &&
    !messages.some(message => message.id === latest.focus?.id) &&
    latest.root?.id !== latest.focus.id
      ? latest.focus
      : null
  const canWrite = latest?.room.can_write ?? room?.can_write ?? false
  const unreadable = allMessages.some(message => !!message.encryptionError)

  useEffect(() => {
    let current = true

    if (!timeline.data || timeline.error || !encryption.ready) {
      setDecrypted(null)

      return
    }

    const source = timeline.data
    void encryption
      .roster(scope)
      .then(async keys => {
        const rows = new Map<string, Message>()

        for (const page of source.pages)
          for (const message of [...page.messages, page.root, page.focus])
            if (message) rows.set(message.id, message)

        const values = await Promise.all(
          [...rows.values()].map(message =>
            encryption.decrypt(message, scope.workspace_id, [
              ...keys.identities,
              ...keys.historical
            ])
          )
        )

        if (current)
          setDecrypted({
            source,
            identity: encryption.identity,
            messages: new Map(values.map(m => [m.id, m]))
          })
      })
      .catch(error => {
        if (current)
          setDecrypted({
            source,
            identity: encryption.identity,
            messages: new Map(
              source.pages
                .flatMap(p => [...p.messages, p.root, p.focus])
                .filter((m): m is Message => !!m)
                .map(m => [
                  m.id,
                  m.sealed
                    ? {
                        ...m,
                        body: '',
                        references: [],
                        encryptionError: String(error)
                      }
                    : m
                ])
            )
          })
      })

    return () => {
      current = false
    }
  }, [
    timeline.data,
    timeline.error,
    encryption.identity,
    encryption.ready,
    scope.workspace_id,
    scope.room_id
  ])

  useLayoutEffect(() => {
    const pane = container.current

    if (
      !pane ||
      (encryption.ready && allMessages.some(m => m.sealed) && !decoded)
    )
      return

    const target = focusId
      ? document.getElementById(
          `${threadId ? 'room-thread-message' : 'room-message'}-${focusId}`
        )
      : null

    if (target && pane.contains(target) && scrolledTo.current !== focusId) {
      target.scrollIntoView({ block: 'center' })
      scrolledTo.current = focusId ?? null
      stickToBottom.current = false
      setReading(false)
    } else if (heightBeforePage.current !== null) {
      pane.scrollTop += pane.scrollHeight - heightBeforePage.current
      heightBeforePage.current = null
    } else if (stickToBottom.current) pane.scrollTop = pane.scrollHeight
    else if (previousLast.current && previousLast.current !== last?.id)
      setNewMessages(true)
    previousLast.current = last?.id
  }, [messages.length, last?.id, latest?.focus?.id, focusId, threadId, decoded])

  useEffect(() => {
    const visible = () => {
      const seq = latest?.room.last_seq ?? 0

      if (
        !seq ||
        unreadable ||
        !reading ||
        query ||
        pinned ||
        threadId ||
        focusId ||
        document.visibilityState !== 'visible' ||
        !document.hasFocus() ||
        acknowledged.current >= seq
      )
        return
      acknowledged.current = seq
      void workspaceAPI.rooms.receipt
        .input(scope)
        .mutate({ read_seq: seq })
        .then(() =>
          cache.invalidateQueries({ queryKey: workspaceAPI.rooms.list.key })
        )
        .catch(() => {
          acknowledged.current = 0
        })
    }
    visible()
    window.addEventListener('focus', visible)
    document.addEventListener('visibilitychange', visible)

    return () => {
      window.removeEventListener('focus', visible)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [
    latest?.room.last_seq,
    scope.room_id,
    scope.workspace_id,
    reading,
    query,
    pinned,
    threadId,
    focusId,
    cache,
    unreadable
  ])

  return (
    <Stack
      className={threadId ? 'rooms-thread-timeline' : 'rooms-main-timeline'}
      flex="1"
      gap="none"
      minHeight="0"
      minWidth="0"
    >
      {threadId && (
        <Flex align="center" justify="between" px="md" py="sm">
          <Text weight="semibold">{t('thread')}</Text>
          <Button
            aria-label={t('closeThread')}
            icon="lucide:x"
            variant="plain"
            onClick={() => openThread()}
          />
        </Flex>
      )}
      {pinned && (
        <Text pt="sm" px="lg" size="sm" weight="medium">
          {t('pinned')}
        </Text>
      )}
      {!!query && (
        <Text color="muted" px="lg" py="xs" size="sm">
          {t('encryptedSearchHelp')}
        </Text>
      )}
      <Stack
        ref={container}
        aria-label={t(threadId ? 'thread' : 'messages')}
        aria-live="polite"
        className="rooms-timeline-scroll"
        flex="1"
        gap="none"
        minHeight="0"
        overflowY="auto"
        px={{ base: 'sm', md: 'lg' }}
        py="md"
        role="log"
        onScroll={event => {
          const pane = event.currentTarget
          const bottom =
            pane.scrollHeight - pane.scrollTop - pane.clientHeight < 80
          stickToBottom.current = bottom
          setReading(bottom)
          if (bottom) setNewMessages(false)
        }}
      >
        {timeline.hasNextPage && (
          <Button
            loading={timeline.isFetchingNextPage}
            namespace="common.rooms"
            variant="plain"
            onClick={() => {
              heightBeforePage.current = container.current?.scrollHeight ?? null
              void timeline.fetchNextPage().catch(() => {
                heightBeforePage.current = null
              })
            }}
          >
            olderMessages
          </Button>
        )}
        {latest?.root && !timeline.error && (
          <Box mb="md">
            <MessageItem
              inThread
              highlighted={highlighted === latest.root.id}
              message={latest.root}
            />
          </Box>
        )}
        {linked && !timeline.error && (
          <Box mb="lg">
            <Text color="muted" mb="sm" size="sm">
              {t('linkedMessage')}
            </Text>
            <MessageItem highlighted inThread={!!threadId} message={linked} />
            <Text color="muted" mt="md" size="sm">
              {t('recentMessages')}
            </Text>
          </Box>
        )}
        {timeline.isLoading && (
          <Text color="muted" p="md" role="status">
            {t('loading')}
          </Text>
        )}
        {timeline.error && (
          <Stack p="md">
            <Text color="dangerous" role="alert">
              {timeline.error.message}
            </Text>
            <Button
              namespace="common.rooms"
              variant="plain"
              onClick={() => void timeline.refetch()}
            >
              retry
            </Button>
          </Stack>
        )}
        {!timeline.isLoading && !timeline.error && !messages.length && (
          <Stack centered flex="1" gap="sm" p="lg">
            <Text weight="medium">
              {t(
                query || pinned
                  ? 'noMessages'
                  : threadId
                    ? 'startThread'
                    : 'startConversation'
              )}
            </Text>
            <Text align="center" color="muted" size="sm">
              {t('mentionHint')}
            </Text>
          </Stack>
        )}
        {!timeline.error &&
          messages.map(message => (
            <MessageItem
              key={message.id}
              highlighted={highlighted === message.id}
              inThread={!!threadId}
              message={message}
            />
          ))}
      </Stack>
      {newMessages && (
        <Button
          namespace="common.rooms"
          variant="secondary"
          onClick={() => {
            if (container.current)
              container.current.scrollTop = container.current.scrollHeight
            stickToBottom.current = true
            setReading(true)
            setNewMessages(false)
          }}
        >
          newMessages
        </Button>
      )}
      {!threadId && typing.length > 0 && (
        <Text color="muted" px="lg" py="xs" role="status" size="sm">
          {t('typing', { names: typing.join(', ') })}
        </Text>
      )}
      {canWrite && !timeline.error ? (
        <MessageComposer
          key={threadId ?? 'room'}
          threadId={threadId}
          onSent={() => {
            stickToBottom.current = true
          }}
        />
      ) : (
        <Text color="muted" px="lg" py="md" size="sm">
          {t(room?.archived ? 'archivedHelp' : 'readOnly')}
        </Text>
      )}
    </Stack>
  )
}
