import { useAuth } from '@monolith/api'
import { Button, Flex, Icon, Stack, Text } from '@monolith/ui'
import { useTranslation } from 'react-i18next'

import { useWorkspace } from '@/core/workspaces/WorkspaceProvider'

import { useRooms } from './RoomsContext'
import { RoomsProvider } from './RoomsProvider'
import RoomConversation from './components/RoomConversation'
import RoomDirectory from './components/RoomDirectory'
import './rooms.css'

function RoomsWorkspace() {
  const { t } = useTranslation('common.rooms')
  const { room, roomId, directory, refresh } = useRooms()

  return (
    <Flex
      className="rooms-workspace"
      flex="1"
      minHeight="0"
      minWidth="0"
      width="100%"
    >
      <RoomDirectory />
      {room ? (
        <RoomConversation key={room.id} />
      ) : (
        <Stack centered flex="1" gap="md" p="xl" role="status">
          <Icon color="muted" icon="lucide:messages-square" size="3rem" />
          <Text as="h1" size="2xl" weight="semibold">
            {t('title')}
          </Text>
          <Text align="center" color="muted">
            {directory.isFetching && !directory.data
              ? t('loading')
              : directory.error
                ? directory.error.message
                : roomId
                  ? t('unavailable')
                  : t('welcome')}
          </Text>
          {directory.error && (
            <Button namespace="common.rooms" onClick={() => void refresh()}>
              retry
            </Button>
          )}
        </Stack>
      )}
    </Flex>
  )
}

export default function RoomsPage() {
  const { active } = useWorkspace()
  const { userData } = useAuth()

  return (
    <RoomsProvider key={`${userData?.id}:${active?.id}`}>
      <RoomsWorkspace />
    </RoomsProvider>
  )
}
