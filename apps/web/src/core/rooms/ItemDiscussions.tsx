import { useAuth } from '@monolith/api'
import { Button, FloatingPopover, Stack, Text } from '@monolith/ui'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'

import workspaceAPI from '@/core/utils/workspaceAPI'
import { useWorkspace } from '@/core/workspaces/WorkspaceProvider'

import type { Entity } from './types'

function Discussions({
  entity,
  anchor,
  onClose
}: {
  entity: Entity
  anchor: HTMLElement
  onClose: () => void
}) {
  const { t } = useTranslation('common.rooms')
  const { active } = useWorkspace()
  const { userData } = useAuth()

  const workspaceId = active!.id
  const options = workspaceAPI.rooms.mentions
    .input({ workspace_id: workspaceId, entity: entity.key })
    .queryOptions()
  const discussions = useQuery({
    ...options,
    queryKey: [...options.queryKey, userData?.id]
  })
  const roomOptions = workspaceAPI.rooms.list
    .input({ workspace_id: workspaceId })
    .queryOptions()
  const rooms = useQuery({
    ...roomOptions,
    queryKey: [...roomOptions.queryKey, userData?.id]
  })

  return (
    <FloatingPopover anchor={anchor} label={t('discussions')} onClose={onClose}>
      <Stack
        gap="md"
        maxHeight="65vh"
        overflowY="auto"
        width="min(24rem, calc(100vw - 3rem))"
      >
        <Text weight="semibold">{t('discussions')}</Text>
        <Text truncate color="muted" size="sm">
          {entity.title}
        </Text>
        {discussions.isFetching && !discussions.data && (
          <Text role="status" size="sm">
            {t('loading')}
          </Text>
        )}
        {discussions.error && (
          <Text color="dangerous" role="alert">
            {discussions.error.message}
          </Text>
        )}
        {discussions.data?.length === 0 && (
          <Text color="muted" size="sm">
            {t('noDiscussions')}
          </Text>
        )}
        {!discussions.error &&
          discussions.data?.map(message => (
            <Button
              key={message.id}
              as={Link}
              justify="start"
              namespace={false}
              style={{ whiteSpace: 'normal' }}
              to={`/rooms?${new URLSearchParams({ workspace: workspaceId, room: message.room_id, message: message.id, ...(message.thread_id ? { thread: message.thread_id } : {}) })}`}
              variant="plain"
              onClick={onClose}
            >
              <Stack gap="xs" minWidth="0">
                <Text size="sm" weight="medium">
                  {message.room_name}
                </Text>
                <Text color="muted" lineClamp={2} size="sm">
                  {message.body || entity.title}
                </Text>
              </Stack>
            </Button>
          ))}
        <Text size="sm" weight="medium">
          {t('chooseRoom')}
        </Text>
        {rooms.error && (
          <Text color="dangerous" role="alert">
            {rooms.error.message}
          </Text>
        )}
        {rooms.data
          ?.filter(room => room.can_write)
          .map(room => (
            <Button
              key={room.id}
              as={Link}
              icon="lucide:messages-square"
              justify="start"
              namespace={false}
              to={`/rooms?${new URLSearchParams({ workspace: workspaceId, room: room.id, mention: entity.key })}`}
              variant="plain"
              onClick={onClose}
            >
              {room.name}
            </Button>
          ))}
        <Button
          as={Link}
          icon="lucide:arrow-up-right"
          namespace="common.rooms"
          to={`/rooms?${new URLSearchParams({ workspace: workspaceId, mention: entity.key })}`}
          variant="plain"
          onClick={onClose}
        >
          title
        </Button>
      </Stack>
    </FloatingPopover>
  )
}

export default function ItemDiscussions() {
  const { t } = useTranslation('common.rooms')
  const { active } = useWorkspace()
  const { userData } = useAuth()
  const location = useLocation()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)

  const path = location.pathname + location.search
  const options = workspaceAPI.entities.context
    .input({ workspace_id: active?.id ?? '', path })
    .queryOptions()
  const entity = useQuery({
    ...options,
    queryKey: [...options.queryKey, userData?.id],
    enabled: !!active && !!userData?.id && location.pathname !== '/rooms',
    staleTime: 15000
  })

  if (!entity.data || entity.error) return null

  return (
    <>
      <Button
        aria-label={t('discuss')}
        icon="lucide:messages-square"
        title={t('discuss')}
        variant="plain"
        onClick={event => setAnchor(event.currentTarget)}
      />
      {anchor && (
        <Discussions
          key={entity.data.key}
          anchor={anchor}
          entity={entity.data}
          onClose={() => setAnchor(null)}
        />
      )}
    </>
  )
}
