import {
  Box,
  Button,
  Flex,
  FloatingPopover,
  Stack,
  Text,
  TextAreaInput,
  TextInput
} from '@monolith/ui'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import workspaceAPI from '@/core/utils/workspaceAPI'

import { useRooms } from '../RoomsContext'
import type { Room } from '../types'

export default function RoomForm({
  anchor,
  onClose,
  room
}: {
  anchor: HTMLElement
  onClose: () => void
  room?: Room
}) {
  const { t } = useTranslation('common.rooms')
  const { actor, workspaceId, people, refresh, selectRoom } = useRooms()
  const [name, setName] = useState(room?.name ?? '')
  const [topic, setTopic] = useState(room?.topic ?? '')

  const [kind, setKind] = useState<'channel' | 'private' | 'direct'>(
    room?.kind ?? 'channel'
  )

  const [members, setMembers] = useState(room?.member_ids ?? [actor])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [id] = useState(() => crypto.randomUUID())

  async function save(archived = room?.archived ?? false) {
    setPending(true)
    setError('')

    try {
      if (room)
        await workspaceAPI.rooms.update
          .input({ workspace_id: workspaceId, room_id: room.id })
          .mutate({
            name,
            topic,
            expected_revision: room.revision,
            archived,
            member_ids: members
          })
      else {
        const result = await workspaceAPI.rooms.create.mutate({
          id,
          workspace_id: workspaceId,
          name:
            name.trim() ||
            people.data?.find(
              person => members.includes(person.id) && person.id !== actor
            )?.name ||
            t('direct'),
          topic,
          kind,
          member_ids: members
        })
        selectRoom(result.id)
      }
      void refresh()
      onClose()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('failed'))
    } finally {
      setPending(false)
    }
  }

  return (
    <FloatingPopover
      anchor={anchor}
      label={t(room ? 'roomSettings' : 'newRoom')}
      onClose={() => {
        if (!pending) onClose()
      }}
    >
      <Stack
        as="form"
        gap="md"
        width="min(23rem, calc(100vw - 3rem))"
        onSubmit={event => {
          event.preventDefault()
          void save()
        }}
      >
        <Text weight="semibold">{t(room ? 'roomSettings' : 'newRoom')}</Text>
        {!room && (
          <Stack gap="xs">
            <Text as="label" htmlFor="room-kind" size="sm">
              {t('kind')}
            </Text>
            <Box
              as="select"
              className="rooms-field"
              id="room-kind"
              p="sm"
              r="md"
              value={kind}
              onChange={event => {
                setKind(event.currentTarget.value as typeof kind)
                setMembers([actor])
              }}
            >
              <option value="channel">{t('channel')}</option>
              <option value="private">{t('private')}</option>
              <option value="direct">{t('direct')}</option>
            </Box>
          </Stack>
        )}
        <TextInput
          autoFocus
          icon="lucide:hash"
          label="name"
          namespace="common.rooms"
          placeholder={t('namePlaceholder')}
          value={name}
          onChange={setName}
        />
        <TextAreaInput
          icon="lucide:text"
          label="topic"
          namespace="common.rooms"
          placeholder={t('topicPlaceholder')}
          value={topic}
          onChange={setTopic}
        />
        {kind !== 'channel' && (
          <Stack gap="xs" maxHeight="12rem" overflowY="auto">
            <Text size="sm" weight="medium">
              {t('participants')}
            </Text>
            {people.error && (
              <Text color="dangerous" role="alert">
                {people.error.message}
              </Text>
            )}
            {people.data
              ?.filter(person => person.id !== actor)
              .map(person => (
                <Flex
                  key={person.id}
                  align="center"
                  as="label"
                  gap="sm"
                  py="xs"
                >
                  <input
                    checked={members.includes(person.id)}
                    disabled={
                      !!room &&
                      (kind === 'direct' || person.id === room.created_by)
                    }
                    name="room-members"
                    type={kind === 'direct' ? 'radio' : 'checkbox'}
                    onChange={event =>
                      setMembers(current =>
                        kind === 'direct'
                          ? [actor, person.id]
                          : event.target.checked
                            ? [...current, person.id]
                            : current.filter(id => id !== person.id)
                      )
                    }
                  />
                  <Text size="sm">{person.name}</Text>
                </Flex>
              ))}
          </Stack>
        )}
        <Text color="muted" size="sm">
          {t(kind === 'channel' ? 'channelHelp' : 'privateHelp')}
        </Text>
        {error && (
          <Text color="dangerous" role="alert" size="sm">
            {error}
          </Text>
        )}
        <Flex gap="sm" wrap="wrap">
          <Button
            disabled={kind !== 'direct' && !name.trim()}
            loading={pending}
            namespace="common.rooms"
            type="submit"
          >
            {room ? 'save' : 'create'}
          </Button>
          <Button
            disabled={pending}
            namespace="common.rooms"
            type="button"
            variant="plain"
            onClick={onClose}
          >
            cancel
          </Button>
          {room && (
            <Button
              disabled={pending}
              namespace="common.rooms"
              type="button"
              variant="plain"
              onClick={() => void save(!room.archived)}
            >
              {room.archived ? 'restore' : 'archive'}
            </Button>
          )}
        </Flex>
      </Stack>
    </FloatingPopover>
  )
}
