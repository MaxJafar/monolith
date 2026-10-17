import { useAuth } from '@monolith/api'
import { Text } from '@monolith/ui'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import workspaceAPI from '@/core/utils/workspaceAPI'
import { useWorkspace } from '@/core/workspaces/WorkspaceProvider'

export default function RoomsUnread() {
  const { active } = useWorkspace()
  const { userData } = useAuth()
  const { t } = useTranslation('common.rooms')

  const options = workspaceAPI.rooms.list
    .input({ workspace_id: active?.id ?? '' })
    .queryOptions()
  const rooms = useQuery({
    ...options,
    queryKey: [...options.queryKey, userData?.id],
    enabled: !!active && !!userData?.id,
    refetchInterval: 8000
  })
  const unread = rooms.error
    ? 0
    : (rooms.data ?? [])
        .filter(room => !room.muted && !room.archived)
        .reduce((count, room) => count + room.unread, 0)

  return unread > 0 ? (
    <Text
      aria-label={t('unreadCount', { count: unread })}
      size="sm"
      weight="semibold"
    >
      {unread > 99 ? '99+' : unread}
    </Text>
  ) : null
}
