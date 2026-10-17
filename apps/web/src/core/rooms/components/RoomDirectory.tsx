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
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useRooms } from '../RoomsContext'
import { roomIcon } from '../types'
import RoomForm from './RoomForm'

export default function RoomDirectory() {
  const { t } = useTranslation('common.rooms')
  const { rooms, roomId, active, selectRoom, connected } = useRooms()
  const [query, setQuery] = useState('')
  const [archived, setArchived] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)

  const filtered = rooms.filter(
    room =>
      room.archived === archived &&
      room.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())
  )

  return (
    <Bordered
      asChild
      borderColor={{ base: 'bg-200', dark: 'bg-800' }}
      borderSide="right"
    >
      <Stack
        as="aside"
        bg={{ base: 'bg-50', dark: 'bg-900' }}
        className="rooms-directory"
        flexShrink="0"
        gap="none"
        minHeight="0"
        width={{ base: '100%', md: '16rem' }}
      >
        <Flex
          align="center"
          justify="between"
          px="md"
          py={{ base: 'xs', md: 'md' }}
        >
          <Text as="h1" size="lg" weight="semibold">
            {t('title')}
          </Text>
          <Flex gap="xs">
            <Button
              aria-label={t('findRoom')}
              aria-pressed={showFilter}
              display={{ base: 'flex', md: 'none' }}
              icon="lucide:search"
              variant="plain"
              onClick={() => setShowFilter(value => !value)}
            />
            {active?.role !== 'viewer' && (
              <Button
                aria-label={t('newRoom')}
                icon="lucide:plus"
                variant="plain"
                onClick={event => setAnchor(event.currentTarget)}
              />
            )}
          </Flex>
        </Flex>
        <Box
          display={{ base: showFilter ? 'block' : 'none', md: 'block' }}
          pb="sm"
          px="sm"
        >
          <TextInput
            icon="lucide:search"
            label="findRoom"
            namespace="common.rooms"
            placeholder={t('findRoom')}
            value={query}
            variant="plain"
            onChange={setQuery}
          />
        </Box>
        <Flex gap="xs" pb="sm" px="sm">
          <Button
            namespace="common.rooms"
            variant={archived ? 'plain' : 'secondary'}
            onClick={() => setArchived(false)}
          >
            channels
          </Button>
          <Button
            namespace="common.rooms"
            variant={archived ? 'secondary' : 'plain'}
            onClick={() => setArchived(true)}
          >
            archive
          </Button>
        </Flex>
        <Stack
          aria-label={t('roomList')}
          as="nav"
          flex="1"
          gap="xs"
          minHeight="0"
          overflowY="auto"
          pb="md"
          px="sm"
        >
          {filtered.map(room => (
            <Button
              key={room.id}
              aria-current={room.id === roomId ? 'page' : undefined}
              className="rooms-directory-row"
              data-active={room.id === roomId}
              gap="sm"
              justify="start"
              namespace={false}
              px="sm"
              py="sm"
              variant="plain"
              onClick={() => selectRoom(room.id)}
            >
              <Icon color="muted" icon={roomIcon(room)} />
              <Box asChild flex="1" minWidth="0">
                <Text
                  truncate
                  size="sm"
                  weight={room.unread ? 'semibold' : 'normal'}
                >
                  {room.name}
                </Text>
              </Box>
              {room.muted && (
                <Icon color="muted" icon="lucide:bell-off" size="1rem" />
              )}
              {room.unread > 0 && (
                <Text
                  aria-label={t('unreadCount', { count: room.unread })}
                  className="rooms-unread"
                  size="sm"
                >
                  {room.mentions ? '@ ' : ''}
                  {room.unread}
                </Text>
              )}
            </Button>
          ))}
          {!filtered.length && (
            <Text color="muted" p="sm" size="sm">
              {t(archived ? 'emptyArchive' : 'noRooms')}
            </Text>
          )}
        </Stack>
        <Bordered
          borderColor={{ base: 'bg-200', dark: 'bg-800' }}
          borderSide="top"
          display={{ base: 'none', md: 'block' }}
          px="md"
          py="sm"
        >
          <Flex align="center" gap="sm">
            <Icon
              color="muted"
              icon={connected ? 'lucide:radio' : 'lucide:refresh-cw'}
              size="1rem"
            />
            <Text color="muted" size="sm">
              {t(connected ? 'live' : 'reconnecting')}
            </Text>
          </Flex>
        </Bordered>
        {anchor && <RoomForm anchor={anchor} onClose={() => setAnchor(null)} />}
      </Stack>
    </Bordered>
  )
}
