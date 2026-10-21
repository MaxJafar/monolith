// SPDX-License-Identifier: 0BSD
import { useAuth } from '@monolith/api'
import {
  Box,
  Button,
  ContextMenu,
  ContextMenuItem,
  Flex,
  Text,
  useMainSidebarState
} from '@monolith/ui'

import { useSettingsOverlay } from '@/core/overlays/SettingsOverlay'

export default function SidebarBottomBar() {
  const account = useAuth()
  const sidebar = useMainSidebarState()
  const openSettings = useSettingsOverlay()
  if (!account.userData) return null
  const user = account.userData
  return (
    <Flex p="sm" width="100%">
      <ContextMenu
        align="start"
        width="100%"
        buttonComponent={
          <Button
            variant="tertiary"
            width="100%"
            namespace={false}
            aria-label={user.name || user.email}
            icon={user.avatar ? undefined : 'tabler:user'}
          >
            {user.avatar && (
              <Box
                asChild
                width="28px"
                height="28px"
                r="sm"
                flexShrink="0"
                style={{ objectFit: 'cover' }}
              >
                <img alt="" src={account.getAvatarURL()} />
              </Box>
            )}
            {sidebar.sidebarExpanded && (
              <Flex direction="column" align="start" minWidth="0">
                <Text truncate weight="medium">
                  {user.name || user.username}
                </Text>
                <Text truncate size="xs" color="muted">
                  {user.email}
                </Text>
              </Flex>
            )}
          </Button>
        }
      >
        <ContextMenuItem
          icon="tabler:user-cog"
          label="Account settings"
          namespace={false}
          onClick={() => {
            if (window.innerWidth < 1024 && sidebar.sidebarExpanded)
              sidebar.toggleSidebar()
            openSettings('account')
          }}
        />
        <ContextMenuItem
          dangerous
          icon="tabler:logout"
          label="Sign out"
          namespace={false}
          onClick={() => account.logout()}
        />
      </ContextMenu>
    </Flex>
  )
}
