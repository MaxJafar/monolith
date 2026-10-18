import { Box, Button, Flex, Text } from '@monolith/ui'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { useSearchOverlay } from '@/core/overlays/SearchOverlay'
import WorkspaceSwitcher from '@/core/workspaces/WorkspaceSwitcher'

export default function SidebarHeader() {
  const { t } = useTranslation('common.navigation')
  const openSearch = useSearchOverlay()

  const isMac = /Mac|iPhone|iPad/.test(navigator.platform)

  useEffect(() => {
    const search = (event: KeyboardEvent) => {
      if (
        !(isMac ? event.metaKey : event.ctrlKey) ||
        event.key.toLowerCase() !== 'k' ||
        event.altKey ||
        event.shiftKey ||
        event.isComposing ||
        event.defaultPrevented ||
        (event.target instanceof Element &&
          event.target.closest(
            'input,textarea,select,[contenteditable="true"]'
          ))
      )
        return
      event.preventDefault()
      openSearch()
    }
    window.addEventListener('keydown', search)

    return () => window.removeEventListener('keydown', search)
  }, [isMac, openSearch])

  return (
    <>
      <WorkspaceSwitcher />
      <Box px="sm">
        <Button
          aria-keyshortcuts={isMac ? 'Meta+k' : 'Control+k'}
          className="monolith-system-link monolith-global-search"
          gap="sm"
          icon="lucide:search"
          justify="start"
          namespace={false}
          px="sm"
          variant="plain"
          width="100%"
          onClick={() => openSearch()}
        >
          <Flex align="center" flex="1" justify="between">
            <Text color="muted" size="sm">
              {t('search')}
            </Text>
            <Text as="kbd" color="muted" size="xs">
              {isMac ? '⌘ K' : 'Ctrl K'}
            </Text>
          </Flex>
        </Button>
      </Box>
    </>
  )
}
