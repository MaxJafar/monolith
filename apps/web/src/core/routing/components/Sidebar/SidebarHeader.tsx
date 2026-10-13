import { useTranslation } from 'react-i18next'

import {
  Box,
  Button,
  Flex,
  SearchInput,
  Text,
  surface,
  useMainSidebarState
} from '@lifeforge/ui'

import MonolithLogo from '@/core/components/MonolithLogo'

function SidebarHeader({
  searchQuery,
  setSearchQuery
}: {
  searchQuery: string
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>
}) {
  const { toggleSidebar } = useMainSidebarState()
  const { t } = useTranslation('common.sidebar')

  return (
    <>
      <Flex
        align="center"
        flexShrink="0"
        height="3.75rem"
        justify="between"
        overflow="hidden"
        px="md"
      >
        <Flex align="center" flexShrink="0" gap="sm">
          <MonolithLogo size={24} />
          <Text
            size="lg"
            tracking="tight"
            weight="semibold"
            whiteSpace="nowrap"
          >
            monolith
          </Text>
        </Flex>
        <Button
          aria-controls="workspace-navigation"
          aria-expanded={true}
          aria-label={t('collapseNavigation')}
          className="monolith-navigation-action"
          icon="lucide:panel-left-close"
          p="xs"
          variant="plain"
          onClick={toggleSidebar}
        />
      </Flex>
      <Box px="md">
        <SearchInput
          bg={surface.lightInteractive}
          mb="sm"
          minHeight="44px"
          namespace="common.sidebar"
          px="md"
          py="sm"
          r="sm"
          searchTarget="module"
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </Box>
    </>
  )
}

export default SidebarHeader
