import {
  Bordered,
  Box,
  Button,
  Flex,
  Icon,
  Stack,
  Text,
  TextInput
} from '@monolith/ui'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import workspaceAPI from '@/core/utils/workspaceAPI'

import { useRooms } from '../RoomsContext'
import { useRoomsEncryption } from '../RoomsEncryption'
import { useRoomCalls } from '../calls/RoomsCallProvider'
import { roomIcon } from '../types'
import MessageTimeline from './MessageTimeline'
import RoomForm from './RoomForm'
import RoomSecurity from './RoomSecurity'

export default function RoomConversation() {
  const { t } = useTranslation('common.rooms')
  const { room, scope, threadId, refresh, actor } = useRooms()
  const encryption = useRoomsEncryption()
  const calls = useRoomCalls()

  const callOptions = workspaceAPI.rooms.callState.input(scope).queryOptions()
  const call = useQuery({
    ...callOptions,
    queryKey: [...callOptions.queryKey, actor],
    enabled: !!room,
    refetchInterval: 5000
  })

  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [error, setError] = useState('')

  if (!room) return null

  async function mute() {
    try {
      await workspaceAPI.rooms.receipt.input(scope).mutate({ muted: !room!.muted })
      void refresh()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('failed'))
    }
  }

  return (
    <Stack
      aria-label={room.name}
      as="section"
      flex="1"
      gap="none"
      minHeight="0"
      minWidth="0"
      overflow="hidden"
    >
      <Bordered
        borderColor={{ base: 'bg-200', dark: 'bg-800' }}
        borderSide="bottom"
        px="lg"
        py="md"
      >
        <Flex align="center" gap="md" justify="between" wrap="wrap">
          <Flex align="center" flex="1" gap="sm" minWidth="0">
            <Icon color="muted" icon={roomIcon(room)} />
            <Stack gap="xs" minWidth="0">
              <Text truncate as="h2" weight="semibold">
                {room.name}
              </Text>
              {room.topic && (
                <Text color="muted" lineClamp={1} size="sm">
                  {room.topic}
                </Text>
              )}
            </Stack>
          </Flex>
          <Flex align="center" gap="xs">
            <RoomSecurity />
            <Button
              aria-label={t(call.data?.active ? 'joinCall' : 'voiceCall')}
              disabled={
                !room.can_write ||
                !encryption.ready ||
                calls.busy ||
                (calls.view !== null && calls.view.status !== 'ended')
              }
              icon="lucide:phone"
              variant="plain"
              onClick={() => {
                void calls.start(scope, room.name, false)
              }}
            />
            <Button
              aria-label={t('videoCall')}
              disabled={
                !room.can_write ||
                !encryption.ready ||
                calls.busy ||
                (calls.view !== null && calls.view.status !== 'ended')
              }
              icon="lucide:video"
              variant="plain"
              onClick={() => {
                void calls.start(scope, room.name, true)
              }}
            />
            <Button
              aria-label={t('searchMessages')}
              aria-pressed={showSearch}
              icon="lucide:search"
              variant="plain"
              onClick={() => {
                setShowSearch(value => !value)
                setSearch('')
              }}
            />
            <Button
              aria-label={t('pinned')}
              aria-pressed={pinned}
              icon="lucide:pin"
              variant="plain"
              onClick={() => setPinned(value => !value)}
            />
            <Button
              aria-label={t(room.muted ? 'unmute' : 'mute')}
              icon={room.muted ? 'lucide:bell-off' : 'lucide:bell'}
              variant="plain"
              onClick={() => void mute()}
            />
            {room.can_manage && (
              <Button
                aria-label={t('roomSettings')}
                icon="lucide:settings"
                variant="plain"
                onClick={event => setAnchor(event.currentTarget)}
              />
            )}
          </Flex>
        </Flex>
        {call.data?.active && (
          <Text color="muted" size="sm">
            {t('callParticipants', { count: call.data.participants })}
          </Text>
        )}
        {encryption.ready && call.data && !call.data.iceServers.length && (
          <Text color="muted" size="xs">
            {t('localCallsHelp')}
          </Text>
        )}
        {(calls.error || call.error) && (
          <Text color="dangerous" role="alert" size="sm">
            {calls.error || call.error?.message}
          </Text>
        )}
        {showSearch && (
          <Box mt="sm">
            <TextInput
              autoFocus
              icon="lucide:search"
              label="searchMessages"
              namespace="common.rooms"
              placeholder={t('searchMessages')}
              value={search}
              variant="plain"
              onChange={setSearch}
            />
          </Box>
        )}
        {error && (
          <Text color="dangerous" role="alert" size="sm">
            {error}
          </Text>
        )}
      </Bordered>
      {!encryption.ready && (
        <Flex
          align="center"
          gap="sm"
          justify="between"
          px="md"
          py="sm"
          wrap="wrap"
        >
          <Text color="muted" size="sm">
            {t('encryptionRequired')}
          </Text>
          <RoomSecurity setup />
        </Flex>
      )}
      <Flex
        className="rooms-panes"
        data-thread={!!threadId}
        flex="1"
        minHeight="0"
        minWidth="0"
      >
        <MessageTimeline
          key={`${room.id}:${search}:${pinned}`}
          pinned={pinned}
          query={search}
        />
        {threadId && (
          <Bordered
            asChild
            borderColor={{ base: 'bg-200', dark: 'bg-800' }}
            borderSide="left"
          >
            <Stack
              className="rooms-thread"
              flexShrink="0"
              gap="none"
              minHeight="0"
              minWidth="0"
              width={{ base: '100%', xl: '24rem' }}
            >
              <MessageTimeline key={threadId} threadId={threadId} />
            </Stack>
          </Bordered>
        )}
      </Flex>
      {anchor && (
        <RoomForm anchor={anchor} room={room} onClose={() => setAnchor(null)} />
      )}
    </Stack>
  )
}
